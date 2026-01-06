import type { Obj } from '@flemist/simple-utils'
import { timeControllerDefault } from '@flemist/time-controller'
import type {
  AddLimitOptions,
  ModeState,
  TestVariantsTemplatesWithExtra,
  VariantNavigationState,
  VariantsIterator,
  VariantsIteratorLimit,
  VariantsIteratorOptions,
} from './types'
import type {
  ArgsWithSeed,
  ModeConfig,
  SequentialModeConfig,
} from 'src/common/test-variants/types'
import {
  advanceVariantNavigation,
  computeArgsIndices,
  createVariantNavigationState,
  randomVariantNavigation,
  resetVariantNavigation,
  retreatVariantNavigation,
} from './variant-navigation/variantNavigation'
import { isSequentialMode } from './helpers/mode'
import {
  extendTemplatesWithExtraArgs,
  isArgsKeysInTemplate,
} from './helpers/template'

const DEFAULT_MODE_CONFIGS: ModeConfig[] = [{ mode: 'forward' }]

/** Creates test variants iterator with limiting capabilities */
export function createVariantsIterator<Args extends Obj>(
  options: VariantsIteratorOptions<Args>,
): VariantsIterator<Args> {
  const {
    argsTemplates,
    equals,
    limitArgOnError,
    includeErrorVariant,
    getSeed,
    iterationModes,
    onModeChange,
    limitCompletionCount,
    limitTests,
    limitTime,
  } = options

  const timeController = options.timeController ?? timeControllerDefault

  // Clone templates to allow mutation (extendTemplatesForArgs)
  const templates: TestVariantsTemplatesWithExtra<Args, any> = {
    templates: { ...argsTemplates },
    extra: {},
  }

  const modeConfigs: readonly ModeConfig[] =
    iterationModes == null || iterationModes.length === 0
      ? DEFAULT_MODE_CONFIGS
      : iterationModes
  const modeStates: ModeState<Args>[] = []

  // Dedicated navigation state for computing indices in addLimit
  let computeState: VariantNavigationState<Args> | null = null

  let limit: VariantsIteratorLimit<Args> | null = null
  let modeIndex = 0
  let prevModeIndex = -1
  let tests = 0
  let initialized = false
  let startTime = 0
  // Track if any test was produced in the current round through all modes
  let anyTestInCurrentRound = false
  // Track if we've completed at least one full round
  let completedFirstRound = false
  let modeCyclesCompleted = false

  function createModeState(): ModeState<Args> {
    const navigationState = createVariantNavigationState(
      templates,
      equals ?? null,
      limitArgOnError ?? null,
      includeErrorVariant ?? null,
    )
    return {
      navigationState,
      cycleCount: 0,
      completedCount: 0,
      testsInLastRun: 0,
      startTime: 0,
    }
  }

  function createModeStates(): void {
    for (let i = 0, len = modeConfigs.length; i < len; i++) {
      modeStates.push(createModeState())
    }
  }

  function getMinCompletedCountForSequentialModes(): number {
    let minCompletedCount: number = Infinity
    for (let i = 0, len = modeConfigs.length; i < len; i++) {
      if (isSequentialMode(modeConfigs[i])) {
        const completedCount = modeStates[i].completedCount
        if (completedCount < minCompletedCount) {
          minCompletedCount = completedCount
        }
      }
    }
    return minCompletedCount
  }

  function checkGlobalTermination(): boolean {
    // 1. Global tests >= limitTests
    if (limitTests != null && tests >= limitTests) {
      return true
    }

    // 2. Global elapsed time >= limitTime
    if (limitTime != null && timeController.now() - startTime >= limitTime) {
      return true
    }

    const hasSequentialModes = modeConfigs.some(isSequentialMode)
    if (
      hasSequentialModes &&
      limitCompletionCount != null &&
      limitCompletionCount <= 0
    ) {
      return true
    }

    const totalTestsInLastRun = modeStates.reduce(
      (sum, modeState) => sum + modeState.testsInLastRun,
      0,
    )
    // If no tests were run at all, do not terminate yet
    if (totalTestsInLastRun === 0) {
      return true
    }
    // If no sequential modes, do not check completion count
    if (!hasSequentialModes) {
      return false
    }

    // 3. min(completedCount across sequential modes) >= limitCompletionCount
    const minCompleted = getMinCompletedCountForSequentialModes()
    if (minCompleted >= (limitCompletionCount ?? 1)) {
      return true
    }

    // 4. All modes did 0 tests in their last round (iteration stuck)
    // Only check after completing at least one full round
    if (completedFirstRound && !anyTestInCurrentRound) {
      return true
    }

    return false
  }

  function initialize(): void {
    if (!initialized) {
      initialized = true
      startTime = timeController.now()
      createModeStates()
      modeIndex = 0
    }
  }

  function addLimit(addLimitOptions?: null | AddLimitOptions<Args>): void {
    const args = addLimitOptions?.args
    if (args == null) {
      return
    }

    // Ensure mode states exist before updating limits
    initialize()

    // Validate args
    if (!isArgsKeysInTemplate(templates.templates, args)) {
      // TODO: debug log here
      return
    }

    // Extend templates with values from args that may not be in templates
    extendTemplatesWithExtraArgs(templates, args, equals)

    // Create or reuse dedicated navigation state for computing indices
    if (computeState == null) {
      computeState = createVariantNavigationState(
        templates,
        equals ?? null,
        // ignore limitArgOnError for correct lexicographic comparison of new limit
        false,
        // ignore includeErrorVariant for correct lexicographic comparison of new limit
        false,
      )
    }

    // Here we also check that the new limit is stricter than the old one
    const argLimits = computeArgsIndices(computeState, args)
    if (argLimits == null) {
      return
    }

    // Update limit property
    limit = {
      args,
      error: addLimitOptions?.error,
      tests: addLimitOptions?.tests ?? tests,
    }

    // Replace argLimits in ALL modes' navigation states
    for (
      let modeIdx = 0, modesLen = modeStates.length;
      modeIdx < modesLen;
      modeIdx++
    ) {
      const navState = modeStates[modeIdx].navigationState
      navState.argLimits = argLimits
    }
  }

  function checkModeSwitchConditions(): boolean {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]

    // Mode's testsInLastRun >= mode.limitTests
    if (
      modeConfig.limitTests != null &&
      modeState.testsInLastRun >= modeConfig.limitTests
    ) {
      return true
    }

    // Mode's elapsed time >= mode.limitTime
    if (
      modeConfig.limitTime != null &&
      modeState.startTime > 0 &&
      timeController.now() - modeState.startTime >= modeConfig.limitTime
    ) {
      return true
    }

    return false
  }

  function switchToNextMode(): void {
    const currentState = modeStates[modeIndex]
    currentState.testsInLastRun = 0

    const oldModeIndex = modeIndex
    modeIndex = (modeIndex + 1) % modeConfigs.length

    // Check if we completed a full round (wrapped back to first mode)
    if (modeIndex < oldModeIndex) {
      completedFirstRound = true
      anyTestInCurrentRound = false
    }
  }

  function invokeOnModeChangeIfNeeded(): void {
    if (modeIndex === prevModeIndex) {
      return
    }
    prevModeIndex = modeIndex
    if (onModeChange != null) {
      onModeChange({
        mode: modeConfigs[modeIndex],
        modeIndex,
        tests,
      })
    }
  }

  function advanceNavigation(): boolean {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]
    const navState = modeState.navigationState

    // Handle attemptsPerVariant for sequential modes
    if (isSequentialMode(modeConfig)) {
      if (modeConfig.cycles != null && modeConfig.cycles <= 0) {
        return false
      }

      const attemptsPerVariant =
        (modeConfig as SequentialModeConfig).attemptsPerVariant ?? 1
      if (attemptsPerVariant <= 0) {
        return false
      }

      if (
        navState.attempts >= 0 &&
        navState.attempts + 1 < attemptsPerVariant
      ) {
        navState.attempts++
        return true
      }
    }

    let success: boolean
    switch (modeConfig.mode) {
      case 'forward':
        success = advanceVariantNavigation(navState)
        break
      case 'backward':
        success = retreatVariantNavigation(navState)
        break
      case 'random':
        success = randomVariantNavigation(navState)
        break
    }

    if (success) {
      navState.attempts = 0
    } else {
      navState.attempts = -1
    }

    return success
  }

  function handleNavigationExhausted(): boolean {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]

    modeState.cycleCount++

    if (isSequentialMode(modeConfig)) {
      const modeCycles = (modeConfig as SequentialModeConfig).cycles ?? 1
      if (modeState.cycleCount >= modeCycles) {
        modeState.completedCount++
        modeState.cycleCount = 0
        return true // Switch mode
      }
    }

    // Reset navigation and continue in same mode
    resetVariantNavigation(modeState.navigationState)
    return false
  }

  function injectSeed(args: Args): ArgsWithSeed<Args> {
    const argsWithSeed = { ...args } as ArgsWithSeed<Args>
    if (getSeed != null) {
      argsWithSeed.seed = getSeed({ tests })
    }
    return argsWithSeed
  }

  // function next(): ArgsWithSeed<Args> | null {
  //   ensureInitialized()
  //
  //   // Main iteration loop - may switch modes multiple times before returning args
  //   const maxModeAttempts = modeConfigs.length * 2 // Prevent infinite loops
  //   let modeAttempts = 0
  //
  //   while (modeAttempts < maxModeAttempts) {
  //     modeAttempts++
  //
  //     // 1. Check global termination conditions
  //     if (checkGlobalTermination()) {
  //       return null
  //     }
  //
  //     // 2. Check mode switching conditions
  //     if (checkModeSwitchConditions()) {
  //       switchToNextMode()
  //       continue
  //     }
  //
  //     const modeState = modeStates[modeIndex]
  //
  //     // 3. If first iteration in mode after switch, set startTime
  //     if (modeState.startTime === 0) {
  //       modeState.startTime = timeCtrl.now()
  //     }
  //
  //     // 4. Advance navigation
  //     const success = advanceNavigation()
  //
  //     if (!success) {
  //       // 5. Navigation exhausted
  //       const shouldSwitchMode = handleNavigationExhausted()
  //       if (shouldSwitchMode) {
  //         switchToNextMode()
  //       }
  //       continue
  //     }
  //
  //     // 6. Increment counters
  //     modeState.testsInLastRun++
  //     tests++
  //     anyTestInCurrentRound = true
  //
  //     // 7. Invoke onModeChange if mode changed during this call
  //     invokeOnModeChangeIfNeeded()
  //
  //     // 8. Inject seed and return args
  //     const args = injectSeed(modeState.navigationState.args)
  //     return args
  //   }
  //
  //   // Safety: should not reach here
  //   return null
  // }

  function shouldCompleteIterator(): boolean {
    let totalTestsInLastRun = 0
    let hasSequentialModes = false
    let minCompletedCount = Infinity
    for (let i = 0, len = modeStates.length; i < len; i++) {
      const modeState = modeStates[i]
      const modeConfig = modeConfigs[i]
      totalTestsInLastRun += modeState.testsInLastRun
      if (isSequentialMode(modeConfig)) {
        hasSequentialModes = true
        if (modeState.completedCount < minCompletedCount) {
          minCompletedCount = modeState.completedCount
        }
      }
    }

    if (modeCyclesCompleted && totalTestsInLastRun === 0) {
      return true
    }

    if (limitTests != null && tests >= limitTests) {
      return true
    }

    if (limitTime != null && timeController.now() - startTime >= limitTime) {
      return true
    }

    if (hasSequentialModes) {
      if (
        limitCompletionCount != null &&
        minCompletedCount >= limitCompletionCount
      ) {
        return true
      }
    }

    return false
  }

  // region New

  function shouldSwitchMode(): boolean {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]

    if (
      modeConfig.limitTests != null &&
      modeState.testsInLastRun >= modeConfig.limitTests
    ) {
      return true
    }

    if (
      modeConfig.limitTime != null &&
      modeState.startTime > 0 &&
      timeController.now() - modeState.startTime >= modeConfig.limitTime
    ) {
      return true
    }

    return false
  }

  function modeIterate(): ArgsWithSeed<Args> | null {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]
    const navState = modeState.navigationState
    const isSequential = isSequentialMode(modeConfig)

    if (isSequential) {
      const attemptsPerVariant =
        (modeConfig as SequentialModeConfig).attemptsPerVariant ?? 1
      if (attemptsPerVariant <= 0) {
        return null
      }
      if (navState.attempts > 0 && navState.attempts < attemptsPerVariant) {
        navState.attempts++
        return injectSeed(navState.args)
      }
    }

    let success: boolean
    switch (modeConfig.mode) {
      case 'forward':
        success = advanceVariantNavigation(navState)
        break
      case 'backward':
        success = retreatVariantNavigation(navState)
        break
      case 'random':
        success = randomVariantNavigation(navState)
        break
      default:
        throw new Error(`Unknown mode: ${(modeConfig as any).mode}`)
    }

    if (!success) {
      return null
    }

    if (isSequential) {
      navState.attempts = 1
    }

    if (modeState.testsInLastRun === 0) {
      modeState.startTime = timeController.now()
    }

    modeState.testsInLastRun++

    return injectSeed(navState.args)
  }

  function modeIterateCycle(): ArgsWithSeed<Args> | null {
    while (true) {
      if (shouldSwitchMode()) {
        return null
      }
      const args = modeIterate()
      if (args != null) {
        return args
      }

      const modeConfig = modeConfigs[modeIndex]
      const modeState = modeStates[modeIndex]

      // Additional condition for switching mode
      // If there were no tests in last run, switch mode
      if (modeState.testsInLastRun === 0) {
        return null
      }

      // Otherwise next cycle
      modeState.cycleCount++

      if (isSequentialMode(modeConfig)) {
        if (modeState.cycleCount >= (modeConfig.cycles ?? 1)) {
          modeState.completedCount++
          return null
        }
      }
    }
  }

  function next(): ArgsWithSeed<Args> | null {
    initialize()

    while (true) {
      if (shouldCompleteIterator()) {
        return null
      }

      if (modeCyclesCompleted) {
        modeIndex = 0
        const modeState = modeStates[modeIndex]
        modeState.testsInLastRun = 0
        modeState.cycleCount = 0
        modeCyclesCompleted = false
      }

      while (true) {
        const args = modeIterateCycle()
        if (args != null) {
          tests++
          return args
        }
        modeIndex++
        if (modeIndex >= modeConfigs.length) {
          modeCyclesCompleted = true
          break
        }
      }
    }
  }

  // endregion

  const iterator: VariantsIterator<Args> = {
    get limit() {
      return limit
    },
    get modeIndex() {
      return modeIndex
    },
    get modeConfigs() {
      return modeConfigs
    },
    get modeStates() {
      return modeStates
    },
    get tests() {
      return tests
    },
    addLimit,
    next,
  }

  return iterator
}
