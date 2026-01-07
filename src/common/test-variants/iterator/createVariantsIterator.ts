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
  BackwardModeConfig,
  ForwardModeConfig,
  ModeConfig,
  SequentialModeConfig,
} from 'src/common/test-variants/types'
import {
  advanceVariantNavigation,
  calcArgsIndices,
  createVariantNavigationState,
  randomVariantNavigation,
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
  // region initialize

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
  let calcState: VariantNavigationState<Args> | null = null

  let limit: VariantsIteratorLimit<Args> | null = null
  let modeIndex = 0
  let tests = 0
  let initialized = false
  let startTime = 0

  function initialize(): void {
    if (!initialized) {
      initialized = true
      startTime = timeController.now()
      createModeStates()
      modeIndex = 0
      invokeOnModeChange()
    }
  }

  function createModeStates(): void {
    for (let i = 0, len = modeConfigs.length; i < len; i++) {
      modeStates.push(createModeState())
    }
  }

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

  // endregion

  // region onModeChange

  function invokeOnModeChange(): void {
    if (onModeChange != null) {
      onModeChange({
        mode: modeConfigs[modeIndex],
        modeIndex,
        tests,
      })
    }
  }

  // endregion

  // region addLimit

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
    if (calcState == null) {
      calcState = createVariantNavigationState(
        templates,
        equals ?? null,
        // ignore limitArgOnError for correct lexicographic comparison of new limit
        false,
        // ignore includeErrorVariant for correct lexicographic comparison of new limit
        false,
      )
    }

    // Here we also check that the new limit is stricter than the old one
    const argLimits = calcArgsIndices(calcState, args)
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
    for (let i = 0, len = modeStates.length; i < len; i++) {
      const navigationState = modeStates[i].navigationState
      navigationState.argLimits = argLimits
    }
  }

  // endregion

  // region iterator

  function next(): ArgsWithSeed<Args> | null {
    initialize()
    return modesPassIterate()
  }

  // region modes pass

  function modesPassIterate(): ArgsWithSeed<Args> | null {
    while (true) {
      if (!canModesPassIterate()) {
        // Stop iterator
        return null
      }

      while (true) {
        const args = modeIterate()
        if (args != null) {
          // Produce test args
          modeStates[modeIndex].testsInLastRun++
          tests++
          return args
        }
        const modesPassCompleted = nextMode()
        if (modesPassCompleted) {
          if (!canNextModesPass()) {
            // Stop iterator
            return null
          }
          nextModesPass()
          break
        }
      }
    }
  }

  function canModesPassIterate(): boolean {
    if (limitTests != null && tests >= limitTests) {
      return false
    }

    if (limitTime != null && timeController.now() - startTime >= limitTime) {
      return false
    }

    return false
  }

  /** @return true if all modes passed */
  function nextMode(): boolean {
    modeIndex++
    const modesPassCompleted = modeIndex >= modeConfigs.length
    if (modesPassCompleted) {
      modeIndex = 0
    }
    invokeOnModeChange()
    return modesPassCompleted
  }

  // region canNextModesPass

  function canNextModesPass() {
    if (!wasAnyTestInModesPass()) {
      return false
    }

    if (hasSequentialModes()) {
      const minCompletedCount = calcMinCompletedCount()
      if (
        limitCompletionCount != null &&
        minCompletedCount >= limitCompletionCount
      ) {
        return false
      }
    }
  }

  function wasAnyTestInModesPass(): boolean {
    for (let i = 0, len = modeStates.length; i < len; i++) {
      const modeState = modeStates[i]
      if (wasAnyTestInMode(modeState)) {
        return true
      }
    }
    return false
  }

  function hasSequentialModes(): boolean {
    for (let i = 0, len = modeConfigs.length; i < len; i++) {
      if (isSequentialMode(modeConfigs[i])) {
        return true
      }
    }
    return false
  }

  function calcMinCompletedCount(): number {
    let minCompletedCount: number | null = null
    for (let i = 0, len = modeStates.length; i < len; i++) {
      const modeState = modeStates[i]
      const modeConfig = modeConfigs[i]
      if (isSequentialMode(modeConfig)) {
        if (minCompletedCount == null) {
          if (modeState.testsInLastRun <= 0) {
            minCompletedCount = Infinity
          } else {
            minCompletedCount = modeState.completedCount
          }
        } else if (modeState.completedCount < minCompletedCount) {
          minCompletedCount = modeState.completedCount
        }
      }
    }

    if (minCompletedCount == null) {
      throw new Error('Unexpected behavior')
    }

    return minCompletedCount
  }

  // endregion

  function nextModesPass(): void {
    modeIndex = 0
    for (let i = 0, len = modeStates.length; i < len; i++) {
      const modeState = modeStates[i]
      modeState.testsInLastRun = 0
      modeState.startTime = null
    }
  }

  // endregion

  // region modeIterate

  /** @return args or null if mode completed all cycles or cannot be iterated */
  function modeIterate(): ArgsWithSeed<Args> | null {
    while (true) {
      if (!canModeIterate()) {
        // Stop mode iterator
        return null
      }

      const args = modeVariantsIterate()
      if (args != null) {
        // Produce test args
        return args
      }

      if (!wasAnyTestInMode(modeStates[modeIndex])) {
        // Stop mode iterator
        return null
      }

      if (isModeSupportedCycles(modeConfigs[modeIndex])) {
        const modeCycleCompleted = nextModeCycle()
        if (modeCycleCompleted) {
          // Stop mode iterator
          return null
        }
      }
    }
  }

  function canModeIterate(): boolean {
    const modeConfig = modeConfigs[modeIndex]

    if (hasModeReachedLimitTests()) {
      return false
    }

    if (hasModeReachedLimitTime()) {
      return false
    }

    if (isModeSupportedCycles(modeConfig)) {
      if (!hasModeAnyCyclesToRun()) {
        return false
      }
    }

    return false
  }

  function hasModeReachedLimitTests(): boolean {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]

    if (
      modeConfig.limitTests != null &&
      modeState.testsInLastRun >= modeConfig.limitTests
    ) {
      return true
    }

    return false
  }

  function hasModeReachedLimitTime(): boolean {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]

    if (
      modeConfig.limitTime != null &&
      modeState.startTime != null &&
      modeState.startTime > 0 &&
      timeController.now() - modeState.startTime >= modeConfig.limitTime
    ) {
      return true
    }

    return false
  }

  function isModeSupportedCycles(
    modeConfig: ModeConfig,
  ): modeConfig is ForwardModeConfig | BackwardModeConfig {
    return isSequentialMode(modeConfig)
  }

  function hasModeAnyCyclesToRun(): boolean {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]

    if (!isModeSupportedCycles(modeConfig)) {
      throw new Error('Unexpected behavior')
    }

    if (modeState.cycleCount < (modeConfig.cycles ?? 1)) {
      return true
    }

    return false
  }

  /** Выполнил ли режим хотя бы один тест до смены режима */
  function wasAnyTestInMode(modeState: ModeState<Args>): boolean {
    return modeState.testsInLastRun > 0
  }

  /** @return true if mode completed a full cycle */
  function nextModeCycle(): boolean {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]

    if (!isModeSupportedCycles(modeConfig)) {
      throw new Error('Unexpected behavior')
    }

    modeState.cycleCount++
    if (modeState.cycleCount >= (modeConfig.cycles ?? 1)) {
      modeState.cycleCount = 0
      modeState.completedCount++
      return true
    }

    return false
  }

  // endregion

  // region mode iterate

  function modeVariantsIterate(): ArgsWithSeed<Args> | null {
    // TODO: refactor this
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]
    const navigationState = modeState.navigationState

    if (isModeSupportedAttempts(modeConfig)) {
      if (hasModeZeroAttemptsAllowed()) {
        // Stop mode iterator
        return null
      }
      const args = nextModeAttempt()
      if (args != null) {
        // Produce test args
        return args
      }
    }

    if (!nextVariant()) {
      return null
    }

    if (isModeSupportedAttempts(modeConfig)) {
      firstModeAttempt()
    }

    if (modeState.startTime == null) {
      // Так же можно проверять по modeState.testsInLastRun === 0
      modeState.startTime = timeController.now()
    }

    return injectSeed(navigationState.args)
  }

  // region mode attempts per variant

  function nextModeAttempt() {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]
    const navigationState = modeState.navigationState

    if (!isModeSupportedAttempts(modeConfig)) {
      throw new Error('Unexpected behavior')
    }

    if (hasModeZeroAttemptsAllowed()) {
      throw new Error('Unexpected behavior')
    }

    const attemptsPerVariant =
      (modeConfig as SequentialModeConfig).attemptsPerVariant ?? 1
    if (
      navigationState.attempts > 0 &&
      navigationState.attempts < attemptsPerVariant
    ) {
      navigationState.attempts++
      return injectSeed(navigationState.args)
    }

    return null
  }

  function firstModeAttempt() {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]
    const navigationState = modeState.navigationState

    if (!isModeSupportedAttempts(modeConfig)) {
      throw new Error('Unexpected behavior')
    }

    if (hasModeZeroAttemptsAllowed()) {
      throw new Error('Unexpected behavior')
    }

    navigationState.attempts = 1
  }

  function isModeSupportedAttempts(
    modeConfig: ModeConfig,
  ): modeConfig is ForwardModeConfig | BackwardModeConfig {
    return isSequentialMode(modeConfig)
  }

  function hasModeZeroAttemptsAllowed(): boolean {
    const modeConfig = modeConfigs[modeIndex]
    if (!isModeSupportedAttempts(modeConfig)) {
      throw new Error('Unexpected behavior')
    }
    const attemptsPerVariant =
      (modeConfig as SequentialModeConfig).attemptsPerVariant ?? 1
    return attemptsPerVariant === 0
  }

  // endregion

  function nextVariant(): boolean {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]
    const navigationState = modeState.navigationState

    switch (modeConfig.mode) {
      case 'forward':
        return advanceVariantNavigation(navigationState)
      case 'backward':
        return retreatVariantNavigation(navigationState)
      case 'random':
        return randomVariantNavigation(navigationState)
      default:
        throw new Error(`Unknown mode: ${(modeConfig as any).mode}`)
    }
  }

  function injectSeed(args: Args): ArgsWithSeed<Args> {
    const argsWithSeed = { ...args } as ArgsWithSeed<Args>
    if (getSeed != null) {
      argsWithSeed.seed = getSeed({ tests })
    }
    return argsWithSeed
  }

  // endregion

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
