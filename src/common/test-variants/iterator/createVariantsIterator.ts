import { deepCloneJsonLike, Obj } from '@flemist/simple-utils'
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
  calcArgsIndexes,
  createVariantNavigationState,
  randomVariantNavigation,
  retreatVariantNavigation,
} from './variant-navigation/variantNavigation'
import { isModeSequential } from './helpers/mode'
import {
  extendTemplatesWithExtraArgs,
  isArgsKeysInTemplate,
} from './helpers/template'
import { compareLexicographic } from 'src/common/test-variants/iterator/helpers/compareLexicographic'

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

  // Clone templates to allow mutation (extendTemplatesWithExtraArgs)
  const templates: TestVariantsTemplatesWithExtra<Args, any> = {
    templates: deepCloneJsonLike(argsTemplates),
    extra: {},
  }

  const modeConfigs: readonly ModeConfig[] =
    iterationModes == null || iterationModes.length === 0
      ? DEFAULT_MODE_CONFIGS
      : iterationModes
  const modeStates: ModeState<Args>[] = []

  // Dedicated navigation state for computing indexes in addLimit
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
      callOnModeChange()
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
      testsInLastTurn: 0,
      tryNextVariantAttempts: 0,
      startTime: null,
    }
  }

  // endregion

  // region onModeChange

  function callOnModeChange(): void {
    onModeChange?.({
      mode: modeConfigs[modeIndex],
      modeIndex,
      tests,
    })
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

    // Create or reuse dedicated navigation state for computing indexes
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

    calcState.limitArgOnError =
      addLimitOptions?.limitArg ?? limitArgOnError ?? null

    // Here we also check that the new limit is stricter than the old one
    const argLimits = calcArgsIndexes(calcState, args)
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
    calcState.argLimits = argLimits
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
          modeStates[modeIndex].testsInLastTurn++
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
    if (isGlobalLimitTestsReached()) {
      return false
    }

    if (isGlobalLimitTimeReached()) {
      return false
    }

    if (hasSequentialModes()) {
      if (isGlobalLimitCompletionCountZero()) {
        return false
      }
      if (!isAnySequentialModeAlive()) {
        return false
      }
    }

    if (!isAnyModeAlive()) {
      return false
    }

    return true
  }

  function isGlobalLimitTestsReached(): boolean {
    if (limitTests != null && tests >= limitTests) {
      return true
    }
    return false
  }

  function isGlobalLimitTimeReached(): boolean {
    if (limitTime != null && timeController.now() - startTime >= limitTime) {
      return true
    }
    return false
  }

  function isGlobalLimitCompletionCountZero(): boolean {
    if (!hasSequentialModes()) {
      throw new Error('Unexpected behavior')
    }
    return limitCompletionCount != null && limitCompletionCount <= 0
  }

  function isAnySequentialModeAlive(): boolean {
    if (!hasSequentialModes()) {
      throw new Error('Unexpected behavior')
    }

    for (let i = 0, len = modeConfigs.length; i < len; i++) {
      if (isModeCyclesSupported(modeConfigs[i]) && isModeAlive(i)) {
        return true
      }
    }
    return false
  }

  function isAnyModeAlive(): boolean {
    for (let i = 0, len = modeConfigs.length; i < len; i++) {
      if (isModeAlive(i)) {
        return true
      }
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
    callOnModeChange()
    return modesPassCompleted
  }

  // region canNextModesPass

  function canNextModesPass() {
    // When sequential modes exist alongside random modes,
    // iteration terminates when sequential modes reach their completion count limit
    // When only random modes exist,
    // iteration terminates based exclusively on global limits
    if (hasSequentialModes()) {
      const minCompletedCount = calcMinCompletedCount()
      if (
        limitCompletionCount != null &&
        minCompletedCount >= limitCompletionCount
      ) {
        return false
      }
    }

    return true
  }

  function hasSequentialModes(): boolean {
    for (let i = 0, len = modeConfigs.length; i < len; i++) {
      if (isModeSequential(modeConfigs[i])) {
        return true
      }
    }
    return false
  }

  function calcMinCompletedCount(): number {
    let hasSequentialModes = false
    let minCompletedCount: number = Infinity
    for (let i = 0, len = modeStates.length; i < len; i++) {
      const modeState = modeStates[i]
      const modeConfig = modeConfigs[i]
      if (isModeSequential(modeConfig)) {
        hasSequentialModes = true
        if (isModeAlive(i) && modeState.completedCount < minCompletedCount) {
          minCompletedCount = modeState.completedCount
        }
      }
    }

    if (!hasSequentialModes) {
      throw new Error('Unexpected behavior')
    }

    return minCompletedCount
  }

  function isModeAlive(modeIndex: number): boolean {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]

    if (modeConfig.limitTests != null && modeConfig.limitTests <= 0) {
      return false
    }

    if (isModeCyclesSupported(modeConfig)) {
      if (modeConfig.cycles != null && modeConfig.cycles <= 0) {
        return false
      }
      if (
        modeConfig.attemptsPerVariant != null &&
        modeConfig.attemptsPerVariant <= 0
      ) {
        return false
      }
    }

    return modeState.tryNextVariantAttempts < 2
  }

  // endregion

  function nextModesPass(): void {
    modeIndex = 0
    for (let i = 0, len = modeStates.length; i < len; i++) {
      const modeState = modeStates[i]
      modeState.testsInLastTurn = 0
      modeState.startTime = null
    }
  }

  // endregion

  // region modeIterate

  /** @return args or null if mode completed all cycles or cannot be iterated */
  function modeIterate(): ArgsWithSeed<Args> | null {
    let tryCount = 0
    while (tryCount < 2) {
      if (!canModeIterate()) {
        // Stop mode iterator
        return null
      }

      const args = nextModeVariant()
      if (args != null) {
        // Produce test args
        return args
      }

      if (isModeCyclesSupported(modeConfigs[modeIndex])) {
        const modeCycleCompleted = nextModeCycle()
        if (modeCycleCompleted) {
          // Stop mode iterator
          return null
        }
      }

      tryCount++
    }

    // No variants left to iterate in this mode
    return null
  }

  function canModeIterate(): boolean {
    const modeConfig = modeConfigs[modeIndex]

    if (isModeLimitTestsReached()) {
      return false
    }

    if (isModeLimitTimeReached()) {
      return false
    }

    if (isModeCyclesSupported(modeConfig)) {
      if (!hasModeAnyCyclesToRun(modeIndex)) {
        return false
      }
    }

    // TODO:
    // if (!isModeAlive(modeIndex)) {
    //   return false
    // }

    return true
  }

  function isModeLimitTestsReached(): boolean {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]

    if (
      modeConfig.limitTests != null &&
      modeState.testsInLastTurn >= modeConfig.limitTests
    ) {
      return true
    }

    return false
  }

  function isModeLimitTimeReached(): boolean {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]

    if (
      modeConfig.limitTime != null &&
      modeState.startTime != null &&
      timeController.now() - modeState.startTime >= modeConfig.limitTime
    ) {
      return true
    }

    return false
  }

  function isModeCyclesSupported(
    modeConfig: ModeConfig,
  ): modeConfig is ForwardModeConfig | BackwardModeConfig {
    return isModeSequential(modeConfig)
  }

  function hasModeAnyCyclesToRun(modeIndex: number): boolean {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]

    if (!isModeCyclesSupported(modeConfig)) {
      throw new Error('Unexpected behavior')
    }

    if (modeState.cycleCount < (modeConfig.cycles ?? 1)) {
      return true
    }

    return false
  }

  /** @return true if mode completed a full cycle */
  function nextModeCycle(): boolean {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]

    if (!isModeCyclesSupported(modeConfig)) {
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

  function nextModeVariant(): ArgsWithSeed<Args> | null {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]
    const navigationState = modeState.navigationState

    if (isModeAttemptsSupported(modeConfig)) {
      if (isAttemptsPerVariantZero()) {
        // Stop mode iterator
        return null
      }
      const args = nextModeAttempt()
      if (args != null) {
        if (modeState.startTime == null) {
          // Alternative condition is modeState.testsInLastTurn === 0
          modeState.startTime = timeController.now()
        }

        // Produce test args
        return args
      }
    }

    if (!nextVariant()) {
      modeState.tryNextVariantAttempts++
      return null
    }

    modeState.tryNextVariantAttempts = 0

    if (isModeAttemptsSupported(modeConfig)) {
      resetModeAttempts()
    }

    if (modeState.startTime == null) {
      // Alternative condition is modeState.testsInLastTurn === 0
      modeState.startTime = timeController.now()
    }

    return injectSeed(navigationState.args)
  }

  // region mode attempts per variant

  function nextModeAttempt() {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]
    const navigationState = modeState.navigationState

    if (!isModeAttemptsSupported(modeConfig)) {
      throw new Error('Unexpected behavior')
    }

    if (isAttemptsPerVariantZero()) {
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

  function resetModeAttempts() {
    const modeConfig = modeConfigs[modeIndex]
    const modeState = modeStates[modeIndex]
    const navigationState = modeState.navigationState

    if (!isModeAttemptsSupported(modeConfig)) {
      throw new Error('Unexpected behavior')
    }

    if (isAttemptsPerVariantZero()) {
      throw new Error('Unexpected behavior')
    }

    navigationState.attempts = 1
  }

  function isModeAttemptsSupported(
    modeConfig: ModeConfig,
  ): modeConfig is ForwardModeConfig | BackwardModeConfig {
    return isModeSequential(modeConfig)
  }

  function isAttemptsPerVariantZero(): boolean {
    const modeConfig = modeConfigs[modeIndex]
    if (!isModeAttemptsSupported(modeConfig)) {
      throw new Error('Unexpected behavior')
    }
    const attemptsPerVariant =
      (modeConfig as SequentialModeConfig).attemptsPerVariant ?? 1
    return attemptsPerVariant <= 0
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
