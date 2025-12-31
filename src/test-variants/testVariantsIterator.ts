import type {ITimeController} from '@flemist/time-controller'
import {timeControllerDefault} from '@flemist/time-controller'
import type {Obj, TestVariantsTemplate, TestVariantsTemplates} from 'src/test-variants/types'
import {log} from 'src/helpers/log'

/** Parameters passed to getSeed function for generating test seeds */
export type GetSeedParams = {
  /** Total number of tests run */
  tests: number,
  /** Number of full passes through all variants */
  cycles: number,
  /** Number of repeats of current variant */
  repeats: number,
}

/** Options for limiting per-arg indexes on error */
export type LimitArgOnErrorOptions = {
  /** Arg name */
  name: string
  /** Arg value's index in template values array */
  valueIndex: number
  /** Current template values array for this arg */
  values: any[]
  /** Current max value index limit for this arg; null if no limit */
  maxValueIndex: number | null
}

/** Callback to decide whether to apply limit for specific arg */
export type LimitArgOnError = (options: LimitArgOnErrorOptions) => boolean

/** Options for creating test variants iterator */
export type TestVariantsIteratorOptions<Args extends Obj> = {
  argsTemplates: TestVariantsTemplates<Args>
  /** Custom equality for comparing arg values */
  equals?: null | ((a: any, b: any) => boolean)
  /** Limit per-arg indexes on error; boolean enables/disables, function for custom per-arg logic */
  limitArgOnError?: null | boolean | LimitArgOnError
  /** When true, error variant is included in iteration (for debugging); default false excludes it */
  includeErrorVariant?: null | boolean
  /** Generates seed for reproducible randomized testing; seed is added to args */
  getSeed?: null | ((params: GetSeedParams) => any)
  /** Iteration modes (variant traversal methods); each mode runs until its limits are reached */
  iterationModes?: null | ModeConfig[]
  /** Time controller for testable time-dependent operations; null uses timeControllerDefault */
  timeController?: null | ITimeController
  /** Debug logging for internal behavior; default false */
  logDebug?: null | boolean
}

/** Limit information with args and optional error */
export type TestVariantsIteratorLimit<Args> = {
  args: Args
  error?: unknown
}

/** Options for addLimit method */
export type AddLimitOptions<Args> = {
  args?: null | Args
  index?: null | number
  error?: unknown
}

/** Test variants iterator with limiting capabilities */
export type TestVariantsIterator<Args extends Obj> = {
  /** Current variant index; -1 before first next() */
  readonly index: number
  /** Current cycle index; starts at 0 after first start() */
  readonly cycleIndex: number
  /** Maximum variant count; variants with index >= count are not yielded */
  readonly count: number | null
  /** Last applied limit's args and error; null if no args-based limit applied */
  readonly limit: TestVariantsIteratorLimit<Args> | null
  /** Current mode index in modes array */
  readonly modeIndex: number
  /** Current mode configuration; null if no modes */
  readonly modeConfig: ModeConfig | null
  /** Minimum completed cycles across all modes; used for completion condition */
  readonly minCompletedCount: number
  /** Add or tighten limit */
  addLimit(options?: null | AddLimitOptions<Args>): void
  /** Reset to beginning of iteration for next cycle */
  start(): void
  /** Get next variant or null when done */
  next(): Args | null
}

/** Find index of value in array; returns -1 if not found */
function findValueIndex<T>(
  values: T[],
  value: T,
  equals?: null | ((a: T, b: T) => boolean),
): number {
  for (let i = 0; i < values.length; i++) {
    if (equals ? equals(values[i], value) : values[i] === value) {
      return i
    }
  }
  return -1
}

/** Pending limit waiting for position match during iteration */
type PendingLimit<Args> = {
  args: Args
  error?: unknown
}

/** Base mode configuration shared by all modes */
export type BaseModeConfig = {
  /** Maximum time in ms for this phase */
  limitTime?: null | number
  /** Maximum total picks in this phase */
  limitTests?: null | number
}

/** Sequential mode configuration shared by forward and backward modes */
export type SequentialModeConfig = BaseModeConfig & {
  /** Number of full passes through all variants */
  cycles?: null | number
  /** Number of repeat tests per variant */
  attemptsPerVariant?: null | number
}

/** Forward mode configuration */
export type ForwardModeConfig = SequentialModeConfig & {
  mode: 'forward'
}

/** Backward mode configuration - iterates from last to first combination within limits */
export type BackwardModeConfig = SequentialModeConfig & {
  mode: 'backward'
}

/** Random mode configuration */
export type RandomModeConfig = BaseModeConfig & {
  mode: 'random'
}

/** Mode configuration for iteration phase */
export type ModeConfig = ForwardModeConfig | BackwardModeConfig | RandomModeConfig

/** State per mode */
type ModeState = {
  /** Saved position for sequential modes; null if not interrupted */
  savedPosition: {
    indexes: number[]
    repeatIndex: number
    cycle: number
  } | null
  /** Total completed cycles */
  completedCount: number
  /** Picks in current round */
  pickCount: number
  /** Start time of current round */
  startTime: number
  /** Cycle within current round (0-based) */
  cycle: number
  /** Whether mode executed at least 1 test in current outer cycle */
  hadProgressInCycle: boolean
  /** Progress flag from previous cycle (saved before reset in start()) */
  hadProgressInPreviousCycle: boolean
}

/** Iterator internal state */
type IteratorState<Args extends Obj> = {
  args: Args
  indexes: number[]
  /** Possible values for each arg (calculated from templates) */
  argValues: any[][]
  /** Per-arg max value index limits; null means no limit for that arg */
  argLimits: (number | null)[]
  /** Extra values per arg from saved variants (appended to template values) */
  extraValues: (any[] | null)[]
  /** Current variant index (0-based) */
  index: number
  /** Number of full passes through all variants */
  cycleIndex: number
  /** Current repeat within variant (0 to attemptsPerVariant-1) */
  repeatIndex: number
  /** Total tests yielded (including attemptsPerVariant), used for getSeed */
  testsCount: number
  count: number | null
  /** Whether count was set by explicit addLimit call (not by mode exhaustion) */
  countIsExplicit: boolean
  limit: TestVariantsIteratorLimit<Args> | null
  started: boolean
  currentArgs: Args | null
  pendingLimits: PendingLimit<Args>[]
  /** Mode configurations */
  modes: ModeConfig[]
  /** Current mode index */
  modeIndex: number
  /** State per mode */
  modesState: ModeState[]
}

/** Calculate template values for given key index, including extra values from saved variants */
function calcTemplateValues<Args extends Obj>(
  state: IteratorState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  args: Args,
  keyIndex: number,
): any[] {
  const template = templates[keyIndex]
  let values: any[]
  if (typeof template === 'function') {
    values = template(args)
  }
  else {
    values = template
  }
  // Append extra values from saved variants
  const extra = state.extraValues[keyIndex]
  if (extra && extra.length > 0) {
    values = [...values, ...extra]
  }
  return values
}

/** Extend template with missing value from saved args */
function extendTemplateWithValue<Args extends Obj>(
  state: IteratorState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  args: Args,
  keys: (keyof Args)[],
  keyIndex: number,
  equals?: null | ((a: any, b: any) => boolean),
): void {
  const values = calcTemplateValues(state, templates, args, keyIndex)
  const value = args[keys[keyIndex]]
  if (findValueIndex(values, value, equals) >= 0) {
    return // Already exists
  }
  if (state.extraValues[keyIndex] == null) {
    state.extraValues[keyIndex] = []
  }
  // Avoid duplicates in extraValues
  if (findValueIndex(state.extraValues[keyIndex], value, equals) < 0) {
    state.extraValues[keyIndex].push(value)
  }
}

/** Extend templates with all missing values from saved args */
function extendTemplatesForArgs<Args extends Obj>(
  state: IteratorState<Args>,
  savedArgs: Args,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  equals?: null | ((a: any, b: any) => boolean),
): void {
  for (let i = 0; i < keysCount; i++) {
    extendTemplateWithValue(state, templates, savedArgs, keys, i, equals)
  }
}

/** Reset iteration position to beginning (for forward mode cycles) */
function resetIterationPositionToStart<Args extends Obj>(
  state: IteratorState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
): void {
  state.repeatIndex = 0
  for (let i = 0; i < keysCount; i++) {
    state.indexes[i] = -1
    state.argValues[i] = []
    delete state.args[keys[i]]
  }
  if (keysCount > 0) {
    state.argValues[0] = calcTemplateValues(state, templates, state.args, 0)
  }
}

/** Reset iteration position to end (for backward mode); returns true if valid position exists */
function resetIterationPositionToEnd<Args extends Obj>(
  state: IteratorState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
): boolean {
  state.repeatIndex = 0
  for (let i = 0; i < keysCount; i++) {
    delete state.args[keys[i]]
  }
  // Set each arg to its max value within limits
  for (let i = 0; i < keysCount; i++) {
    state.argValues[i] = calcTemplateValues(state, templates, state.args, i)
    const maxIndex = getMaxIndex(state, i) - 1
    if (maxIndex < 0) {
      return false
    }
    state.indexes[i] = maxIndex
    state.args[keys[i]] = state.argValues[i][maxIndex]
  }
  return true
}

/** Reset iterator state for new external cycle (via start()) */
function resetIteratorState<Args extends Obj>(
  state: IteratorState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
): void {
  state.index = -1
  state.testsCount = 0
  resetIterationPositionToStart(state, templates, keys, keysCount)
}

/** Get effective max index for an arg (considering argLimit)
 * argLimit is INCLUSIVE upper bound; returns EXCLUSIVE upper bound for iteration
 */
function getMaxIndex(state: IteratorState<any>, keyIndex: number): number {
  const valuesLen = state.argValues[keyIndex].length
  const argLimit = state.argLimits[keyIndex]
  if (argLimit == null) {
    return valuesLen
  }
  return Math.min(argLimit + 1, valuesLen)
}

/** Advance to next variant in cartesian product; returns true if successful
 * Uses shared keyIndex between loops: when inner loop breaks on empty template,
 * outer loop retries from that position
 */
function advanceVariant<Args extends Obj>(
  state: IteratorState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
): boolean {
  for (let keyIndex = keysCount - 1; keyIndex >= 0; keyIndex--) {
    const valueIndex = state.indexes[keyIndex] + 1
    const maxIndex = getMaxIndex(state, keyIndex)
    if (valueIndex < maxIndex) {
      state.indexes[keyIndex] = valueIndex
      state.args[keys[keyIndex]] = state.argValues[keyIndex][valueIndex]
      // Reset subsequent keys; keyIndex is intentionally shared with outer loop
      // Clear subsequent keys from args before calculating their template values
      for (let i = keyIndex + 1; i < keysCount; i++) {
        delete state.args[keys[i]]
      }
      for (keyIndex++; keyIndex < keysCount; keyIndex++) {
        state.argValues[keyIndex] = calcTemplateValues(state, templates, state.args, keyIndex)
        const keyMaxIndex = getMaxIndex(state, keyIndex)
        if (keyMaxIndex <= 0) {
          break
        }
        state.indexes[keyIndex] = 0
        state.args[keys[keyIndex]] = state.argValues[keyIndex][0]
      }
      if (keyIndex >= keysCount) {
        return true
      }
    }
  }
  return false
}

/** Retreat to previous variant (decrement with borrow); returns true if successful */
function retreatVariant<Args extends Obj>(
  state: IteratorState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
): boolean {
  for (let keyIndex = keysCount - 1; keyIndex >= 0; keyIndex--) {
    const valueIndex = state.indexes[keyIndex] - 1
    if (valueIndex >= 0) {
      state.indexes[keyIndex] = valueIndex
      state.args[keys[keyIndex]] = state.argValues[keyIndex][valueIndex]
      // Set subsequent keys to their max values
      for (let i = keyIndex + 1; i < keysCount; i++) {
        delete state.args[keys[i]]
      }
      for (keyIndex++; keyIndex < keysCount; keyIndex++) {
        state.argValues[keyIndex] = calcTemplateValues(state, templates, state.args, keyIndex)
        const maxIndex = getMaxIndex(state, keyIndex) - 1
        if (maxIndex < 0) {
          break
        }
        state.indexes[keyIndex] = maxIndex
        state.args[keys[keyIndex]] = state.argValues[keyIndex][maxIndex]
      }
      if (keyIndex >= keysCount) {
        return true
      }
    }
  }
  return false
}

/** Random pick within limits; returns true if successful */
function randomPickVariant<Args extends Obj>(
  state: IteratorState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  limitArgOnError?: null | boolean | LimitArgOnError,
): boolean {
  // Handle empty template (keysCount=0): always yields the empty variant
  if (keysCount === 0) {
    return true
  }

  // Clear args from previous iteration before calculating template values
  for (let i = 0; i < keysCount; i++) {
    delete state.args[keys[i]]
  }

  // Check if any limits exist
  let hasLimits = false
  for (let i = 0; i < keysCount; i++) {
    if (state.argLimits[i] != null) {
      hasLimits = true
      break
    }
  }

  // Calculate argValues for first arg (subsequent args calculated during picking)
  if (keysCount > 0) {
    state.argValues[0] = calcTemplateValues(state, templates, state.args, 0)
  }

  if (!hasLimits) {
    // No limits - pick random from full range
    for (let i = 0; i < keysCount; i++) {
      const len = state.argValues[i].length
      if (len === 0) {
        return false
      }
      state.indexes[i] = Math.floor(Math.random() * len)
      state.args[keys[i]] = state.argValues[i][state.indexes[i]]
      // Calculate only next argValues; subsequent ones calculated when their turn comes
      if (i + 1 < keysCount) {
        state.argValues[i + 1] = calcTemplateValues(state, templates, state.args, i + 1)
      }
    }
    return true
  }

  if (limitArgOnError) {
    // Per-arg constraint: each index must not exceed its limit
    for (let i = 0; i < keysCount; i++) {
      const len = state.argValues[i].length
      if (len === 0) {
        return false
      }
      const limit = state.argLimits[i]
      const maxIndex = limit != null ? Math.min(limit, len - 1) : len - 1
      state.indexes[i] = Math.floor(Math.random() * (maxIndex + 1))
      state.args[keys[i]] = state.argValues[i][state.indexes[i]]
      // Calculate only next argValues; subsequent ones calculated when their turn comes
      if (i + 1 < keysCount) {
        state.argValues[i + 1] = calcTemplateValues(state, templates, state.args, i + 1)
      }
    }
    return true
  }

  // Combination constraint: must be below max combination lexicographically
  let belowMax = false
  for (let i = 0; i < keysCount; i++) {
    const len = state.argValues[i].length
    if (len === 0) {
      return false
    }
    const limit = state.argLimits[i]
    let maxIndex: number
    if (belowMax) {
      maxIndex = len - 1
    }
    else {
      maxIndex = limit != null ? Math.min(limit, len - 1) : len - 1
    }
    state.indexes[i] = Math.floor(Math.random() * (maxIndex + 1))
    state.args[keys[i]] = state.argValues[i][state.indexes[i]]

    if (!belowMax && limit != null && state.indexes[i] < limit) {
      belowMax = true
    }

    // Calculate only next argValues; subsequent ones calculated when their turn comes
    if (i + 1 < keysCount) {
      state.argValues[i + 1] = calcTemplateValues(state, templates, state.args, i + 1)
    }
  }

  // If landed exactly on max combination, retreat by 1
  if (!belowMax) {
    if (!retreatVariant(state, templates, keys, keysCount)) {
      return false
    }
  }

  return true
}

/** Validate saved args keys match iterator's arg names (ignoring "seed" key) */
function validateArgsKeys<Args extends Obj>(
  savedArgs: Args,
  keySet: Set<string>,
  keysCount: number,
): boolean {
  const savedKeys = Object.keys(savedArgs).filter(k => k !== 'seed')
  if (savedKeys.length !== keysCount) {
    return false
  }
  for (const key of savedKeys) {
    if (!keySet.has(key)) {
      return false
    }
  }
  return true
}

/** Check if current position >= pending args position; returns false if current < pending or all args skipped */
function isPositionReached<Args extends Obj>(
  state: IteratorState<Args>,
  pendingArgs: Args,
  keys: (keyof Args)[],
  keysCount: number,
  equals?: null | ((a: any, b: any) => boolean),
): boolean {
  let anyCompared = false
  for (let i = 0; i < keysCount; i++) {
    const currentValueIndex = state.indexes[i]
    const pendingValue = pendingArgs[keys[i]]
    const pendingValueIndex = findValueIndex(state.argValues[i], pendingValue, equals)

    // Dynamic template value not found - skip this arg from comparison
    if (pendingValueIndex < 0) {
      continue
    }

    anyCompared = true
    if (currentValueIndex < pendingValueIndex) {
      return false
    }
    if (currentValueIndex > pendingValueIndex) {
      return true
    }
  }
  // All compared args are equal - position reached; or all args skipped - keep pending
  return anyCompared
}

/** Calculate indexes for given args; returns null if any value not found */
function calcArgIndexes<Args extends Obj>(
  state: IteratorState<Args>,
  limitArgs: Args,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  equals?: null | ((a: any, b: any) => boolean),
): number[] | null {
  const indexes: number[] = []
  for (let i = 0; i < keysCount; i++) {
    const values = calcTemplateValues(state, templates, limitArgs, i)
    const valueIndex = findValueIndex(values, limitArgs[keys[i]], equals)
    if (valueIndex < 0) {
      return null
    }
    indexes.push(valueIndex)
  }
  return indexes
}

/** Compare indexes lexicographically (like numbers: 1999 < 2000)
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareLexicographic(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const ai = a[i] ?? 0
    const bi = b[i] ?? 0
    if (ai < bi) {
      return -1
    }
    if (ai > bi) {
      return 1
    }
  }
  return 0
}

/** Remove pending limits that exceed current argLimits */
function filterPendingLimits<Args extends Obj>(
  state: IteratorState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  equals?: null | ((a: any, b: any) => boolean),
): void {
  state.pendingLimits = state.pendingLimits.filter(pending => {
    for (let i = 0; i < keysCount; i++) {
      const argLimit = state.argLimits[i]
      if (argLimit == null) {
        continue
      }
      const values = calcTemplateValues(state, templates, pending.args, i)
      const valueIndex = findValueIndex(values, pending.args[keys[i]], equals)
      if (valueIndex > argLimit) {
        return false
      }
    }
    return true
  })
}

/** Update per-arg limits from args values using lexicographic comparison; returns true if updated */
function updateArgLimits<Args extends Obj>(
  state: IteratorState<Args>,
  limitArgs: Args,
  oldLimitArgs: Args | null,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  equals?: null | ((a: any, b: any) => boolean),
  limitArgOnError?: null | boolean | LimitArgOnError,
  precomputedIndexes?: number[] | null,
): boolean {
  if (!limitArgOnError) {
    return false
  }

  // Use precomputed indexes if provided (from state.indexes during iteration),
  // otherwise calculate from args (for saved error variants where we need to find indexes)
  const newIndexes = precomputedIndexes ?? calcArgIndexes(state, limitArgs, templates, keys, keysCount, equals)
  if (!newIndexes) {
    return false
  }

  if (oldLimitArgs) {
    const currentIndexes = calcArgIndexes(state, oldLimitArgs, templates, keys, keysCount, equals)
    if (currentIndexes && compareLexicographic(newIndexes, currentIndexes) >= 0) {
      return false
    }
  }

  for (let i = 0; i < keysCount; i++) {
    const valueIndex = newIndexes[i]
    if (typeof limitArgOnError === 'function') {
      const shouldLimit = limitArgOnError({
        name         : keys[i] as string,
        valueIndex,
        values       : calcTemplateValues(state, templates, limitArgs, i),
        maxValueIndex: state.argLimits[i],
      })
      if (!shouldLimit) {
        state.argLimits[i] = null
        continue
      }
    }
    state.argLimits[i] = valueIndex
  }

  filterPendingLimits(state, templates, keys, keysCount, equals)

  return true
}

/** Process pending limits at current position; returns true if limit was applied */
function processPendingLimits<Args extends Obj>(
  state: IteratorState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  equals?: null | ((a: any, b: any) => boolean),
  limitArgOnError?: null | boolean | LimitArgOnError,
  includeErrorVariant?: null | boolean,
): boolean {
  const reached: PendingLimit<Args>[] = []
  const remaining: PendingLimit<Args>[] = []

  for (const pending of state.pendingLimits) {
    if (isPositionReached(state, pending.args, keys, keysCount, equals)) {
      reached.push(pending)
    }
    else {
      remaining.push(pending)
    }
  }

  state.pendingLimits = remaining

  if (reached.length === 0) {
    return false
  }

  // Apply the last reached limit (newest = lexicographically smallest)
  const pending = reached[reached.length - 1]
  if (state.count == null || state.index < state.count) {
    const oldLimitArgs = state.limit?.args ?? null
    state.count = includeErrorVariant ? state.index + 1 : state.index
    state.limit = createLimit(pending.args, pending.error)
    updateArgLimits(state, pending.args, oldLimitArgs, templates, keys, keysCount, equals, limitArgOnError)
    return true
  }

  return false
}

/** Create limit object with optional error */
function createLimit<Args>(args: Args, error?: unknown): TestVariantsIteratorLimit<Args> {
  return error !== void 0 ? {args, error} : {args}
}

/** Default modes: single forward pass */
const DEFAULT_MODES: ModeConfig[] = [{mode: 'forward'}]

/** Check if current mode has reached its limits */
function isModeExhausted(modeConfig: ModeConfig, modeState: ModeState, now: number): boolean {
  // Mode with no repeats or no cycles produces no iterations
  if (getModeRepeatsPerVariant(modeConfig) <= 0 || getModeCycles(modeConfig) <= 0) {
    return true
  }
  if (modeConfig.limitTests != null && modeState.pickCount >= modeConfig.limitTests) {
    return true
  }
  if (modeConfig.limitTime != null && now - modeState.startTime >= modeConfig.limitTime) {
    return true
  }
  return false
}

/** Get attemptsPerVariant for current mode */
function getModeRepeatsPerVariant(modeConfig: ModeConfig): number {
  if (modeConfig.mode === 'forward' || modeConfig.mode === 'backward') {
    return modeConfig.attemptsPerVariant ?? 1
  }
  return 1
}

/** Get cycles for sequential modes (forward/backward) */
function getModeCycles(modeConfig: ModeConfig): number {
  if (modeConfig.mode === 'forward' || modeConfig.mode === 'backward') {
    return modeConfig.cycles ?? 1
  }
  return 1
}

/** Advance in forward mode handling cycles; returns true if successful */
function advanceForwardMode<Args extends Obj>(
  state: IteratorState<Args>,
  modeState: ModeState,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  cycles: number,
): boolean {
  // Handle empty template (keysCount=0): one variant per cycle
  if (keysCount === 0) {
    if (cycles <= 0) {
      return false
    }
    if (state.index < 0) {
      return true
    }
    if (modeState.cycle + 1 < cycles) {
      modeState.cycle++
      return true
    }
    return false
  }
  if (advanceVariant(state, templates, keys, keysCount)) {
    return true
  }
  // Variants exhausted - check if more cycles remain
  if (modeState.cycle + 1 < cycles) {
    modeState.cycle++
    resetIterationPositionToStart(state, templates, keys, keysCount)
    return advanceVariant(state, templates, keys, keysCount)
  }
  return false
}

/** Advance in backward mode handling cycles; returns true if successful */
function advanceBackwardMode<Args extends Obj>(
  state: IteratorState<Args>,
  modeState: ModeState,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  cycles: number,
): boolean {
  // Handle empty template (keysCount=0): one variant per cycle
  if (keysCount === 0) {
    if (cycles <= 0) {
      return false
    }
    if (state.index < 0) {
      return true
    }
    if (modeState.cycle + 1 < cycles) {
      modeState.cycle++
      return true
    }
    return false
  }
  // First call in backward mode - initialize to last position
  if (state.indexes[0] < 0) {
    return resetIterationPositionToEnd(state, templates, keys, keysCount)
  }
  if (retreatVariant(state, templates, keys, keysCount)) {
    return true
  }
  // Variants exhausted - check if more cycles remain
  if (modeState.cycle + 1 < cycles) {
    modeState.cycle++
    return resetIterationPositionToEnd(state, templates, keys, keysCount)
  }
  return false
}

/** Save current position for a sequential mode */
function saveModePosition<Args extends Obj>(
  state: IteratorState<Args>,
  modeIndex: number,
  keysCount: number,
): void {
  const indexes: number[] = []
  for (let i = 0; i < keysCount; i++) {
    indexes[i] = state.indexes[i]
  }
  const modeState = state.modesState[modeIndex]
  modeState.savedPosition = {
    indexes,
    repeatIndex: state.repeatIndex,
    cycle      : modeState.cycle,
  }
}

/** Try to restore saved position; returns true if successful, false if position is invalid */
function tryRestoreSavedPosition<Args extends Obj>(
  saved: {indexes: number[], repeatIndex: number, cycle: number},
  state: IteratorState<Args>,
  modeState: ModeState,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
): boolean {
  // Clear args before reconstruction
  for (let i = 0; i < keysCount; i++) {
    delete state.args[keys[i]]
  }

  // Reconstruct args from saved indexes, validating each step
  for (let i = 0; i < keysCount; i++) {
    const savedIndex = saved.indexes[i]
    const values = calcTemplateValues(state, templates, state.args, i)

    // Validate: index must be within template and limits
    if (savedIndex < 0 || savedIndex >= values.length) {
      return false
    }
    const limit = state.argLimits[i]
    if (limit != null && savedIndex > limit) {
      return false
    }

    state.indexes[i] = savedIndex
    state.argValues[i] = values
    state.args[keys[i]] = values[savedIndex]
  }

  state.repeatIndex = saved.repeatIndex
  modeState.cycle = saved.cycle
  return true
}

/** Switch to next mode; optionally saves current position and resets mode state */
function switchToNextMode<Args extends Obj>(
  state: IteratorState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  savePosition: boolean,
  now: number,
  logDebug?: null | boolean,
): void {
  const currentModeIndex = state.modeIndex
  const currentMode = state.modes[currentModeIndex]
  const currentModeState = state.modesState[currentModeIndex]

  if (logDebug) {
    log(`[debug:iter] switchToNextMode: mode[${currentModeIndex}]=${currentMode?.mode}, savePosition=${savePosition}, pickCount=${currentModeState?.pickCount}, hadProgressInCycle=${currentModeState?.hadProgressInCycle}`)
  }

  // For sequential modes: save position when interrupted by limits, clear when naturally completed
  // completedCount increments when mode ran tests in this cycle OR had saved position from previous rounds
  if (currentMode && (currentMode.mode === 'forward' || currentMode.mode === 'backward')) {
    if (savePosition) {
      saveModePosition(state, currentModeIndex, keysCount)
      if (logDebug) {
        log(`[debug:iter] saved position for mode[${currentModeIndex}], completedCount stays ${currentModeState.completedCount}`)
      }
    }
    else {
      // Mode completed - count if made progress:
      // - hadProgressInCycle: yielded at least one variant this cycle
      // - pickCount > 0: picked variants but hit count limit before yielding (hadProgressInCycle not set yet)
      // - savedPosition != null: had progress from previous rounds (position was saved)
      const hadProgress = currentModeState.hadProgressInCycle
        || currentModeState.pickCount > 0
        || currentModeState.savedPosition != null
      currentModeState.savedPosition = null
      if (hadProgress) {
        currentModeState.completedCount++
        if (logDebug) {
          log(`[debug:iter] mode[${currentModeIndex}] completed naturally, completedCount++ → ${currentModeState.completedCount}`)
        }
      }
      else if (logDebug) {
        log(`[debug:iter] mode[${currentModeIndex}] completed but no progress, completedCount stays ${currentModeState.completedCount}`)
      }
    }
  }
  // Random mode: completedCount increments per-pick in next() only when variant is yielded
  // Here we only count natural completion (empty template, !savePosition) if progress was made
  else if (currentMode && currentMode.mode === 'random' && !savePosition && currentModeState.hadProgressInCycle) {
    currentModeState.completedCount++
    if (logDebug) {
      log(`[debug:iter] random mode[${currentModeIndex}] completed naturally, completedCount++ → ${currentModeState.completedCount}`)
    }
  }

  state.modeIndex++
  if (logDebug) {
    log(`[debug:iter] modeIndex++ → ${state.modeIndex}`)
  }
  if (state.modeIndex < state.modes.length) {
    const nextModeState = state.modesState[state.modeIndex]
    nextModeState.pickCount = 0
    nextModeState.startTime = now

    const nextMode = state.modes[state.modeIndex]
    if (nextMode.mode === 'forward' || nextMode.mode === 'backward') {
      // Reset state, then try to restore saved position
      resetIteratorState(state, templates, keys, keysCount)
      const saved = nextModeState.savedPosition
      if (saved) {
        tryRestoreSavedPosition(saved, state, nextModeState, templates, keys, keysCount)
        // If restore failed, state remains in fresh position from resetIteratorState
        if (logDebug) {
          log(`[debug:iter] restored position for mode[${state.modeIndex}]`)
        }
      }
      else {
        nextModeState.cycle = 0
      }
    }
    else {
      nextModeState.cycle = 0
    }
  }
  else if (logDebug) {
    log(`[debug:iter] all modes exhausted, modeIndex=${state.modeIndex} >= modes.length=${state.modes.length}`)
  }
}

/** Creates test variants iterator with limiting capabilities */
export function testVariantsIterator<Args extends Obj>(
  options: TestVariantsIteratorOptions<Args>,
): TestVariantsIterator<Args> {
  const {
    argsTemplates, getSeed, equals, limitArgOnError, includeErrorVariant, logDebug,
  } = options
  const modes = options.iterationModes ?? DEFAULT_MODES
  const timeController = options.timeController ?? timeControllerDefault
  const keys = Object.keys(argsTemplates) as (keyof Args)[]
  const templates: TestVariantsTemplate<Args, any>[] = Object.values(argsTemplates)
  const keysCount = keys.length
  const keySet = new Set(keys as string[])

  // Initialize state
  const indexes: number[] = []
  const argValues: any[][] = []
  const argLimits: (number | null)[] = []
  const extraValues: (any[] | null)[] = []
  for (let i = 0; i < keysCount; i++) {
    indexes[i] = -1
    argValues[i] = []
    argLimits[i] = null
    extraValues[i] = null
  }

  // Initialize modesState for all modes
  const modesState: ModeState[] = []
  for (let i = 0; i < modes.length; i++) {
    modesState[i] = {
      savedPosition             : null,
      completedCount            : 0,
      pickCount                 : 0,
      startTime                 : 0,
      cycle                     : 0,
      hadProgressInCycle        : false,
      hadProgressInPreviousCycle: true, // Initial true allows first cycle to start
    }
  }

  const state: IteratorState<Args> = {
    args           : {} as Args,
    indexes,
    argValues,
    argLimits,
    extraValues,
    index          : -1,
    cycleIndex     : -1,
    repeatIndex    : 0,
    testsCount     : 0,
    count          : null,
    countIsExplicit: false,
    limit          : null,
    started        : false,
    currentArgs    : null,
    pendingLimits  : [],
    modes,
    modeIndex      : 0,
    modesState,
  }

  function buildCurrentArgs(): Args {
    if (getSeed) {
      const seed = getSeed({
        tests  : state.testsCount,
        cycles : state.cycleIndex,
        repeats: state.repeatIndex,
      })
      return {...state.args, seed} as Args
    }
    return {...state.args}
  }

  const iterator: TestVariantsIterator<Args> = {
    get index() {
      return state.index
    },
    get cycleIndex() {
      return state.cycleIndex
    },
    get count() {
      return state.count
    },
    get limit() {
      return state.limit
    },
    get modeIndex() {
      return state.modeIndex
    },
    get modeConfig() {
      return state.modes[state.modeIndex] ?? null
    },
    get minCompletedCount() {
      if (state.modesState.length === 0) {
        if (logDebug) {
          log(`[debug:iter] minCompletedCount: no modes, returning Infinity`)
        }
        return Infinity
      }
      // Use hadProgressInPreviousCycle because this getter is called AFTER start() resets hadProgressInCycle
      // Only count modes that made progress in the previous cycle
      // Modes with no progress are stuck and should not block min calculation
      let min = Infinity
      let anyModeHadProgress = false
      for (let i = 0; i < state.modesState.length; i++) {
        const modeState = state.modesState[i]
        if (logDebug) {
          log(`[debug:iter] mode[${i}]: hadProgressInPreviousCycle=${modeState.hadProgressInPreviousCycle}, completedCount=${modeState.completedCount}`)
        }
        if (modeState.hadProgressInPreviousCycle) {
          anyModeHadProgress = true
          if (modeState.completedCount < min) {
            min = modeState.completedCount
          }
        }
      }
      // If no mode made progress in previous cycle, iteration is stuck → return Infinity to exit
      // Initial state has hadProgressInPreviousCycle = true to allow first cycle to start
      if (!anyModeHadProgress) {
        if (logDebug) {
          log(`[debug:iter] minCompletedCount: no mode had progress, returning Infinity`)
        }
        return Infinity
      }
      if (logDebug) {
        log(`[debug:iter] minCompletedCount: returning ${min}`)
      }
      return min
    },
    addLimit(options) {
      const hasArgs = options?.args != null
      const hasIndex = options?.index != null

      // addLimit() or addLimit({error}) - uses current args and index
      if (!hasArgs && !hasIndex) {
        if (state.index < 0) {
          throw new Error('[testVariantsIterator] addLimit() requires at least one next() call')
        }
        const oldLimitArgs = state.limit?.args ?? null
        const isEarlierIndex = state.count == null || state.index < state.count
        // Pass state.indexes directly to avoid recalculating indexes via calcArgIndexes
        // This fixes the bug where dynamic templates create new object instances that fail === comparison
        const updated = updateArgLimits(
          state,
          state.args,
          oldLimitArgs,
          templates,
          keys,
          keysCount,
          equals,
          limitArgOnError,
          state.indexes,
        )

        if (updated) {
          // Lexicographically smaller - update limit and add pending for next cycle
          const limit = createLimit(state.currentArgs, options?.error)
          state.limit = limit
          state.pendingLimits.push(limit)
          if (isEarlierIndex) {
            state.count = includeErrorVariant ? state.index + 1 : state.index
            state.countIsExplicit = true
          }
        }
        else if (isEarlierIndex) {
          // Earlier index but not lexicographically smaller (or limitArgOnError disabled)
          state.count = includeErrorVariant ? state.index + 1 : state.index
          state.countIsExplicit = true
          state.limit = createLimit(state.currentArgs, options?.error)
        }
        return
      }

      // addLimit({index}) - only index limiting
      if (hasIndex && !hasArgs) {
        if (state.count == null || options.index < state.count) {
          state.count = options.index
          state.countIsExplicit = true
        }
        return
      }

      // addLimit({args}) or addLimit({args, error}) - pending limit + immediate per-arg limits
      if (hasArgs && !hasIndex) {
        if (!validateArgsKeys(options.args, keySet, keysCount)) {
          return
        }
        // Extend templates with missing values from saved args
        extendTemplatesForArgs(state, options.args, templates, keys, keysCount, equals)
        const oldLimitArgs = state.limit?.args ?? null
        const updated = updateArgLimits(
          state,
          options.args,
          oldLimitArgs,
          templates,
          keys,
          keysCount,
          equals,
          limitArgOnError,
        )
        if (updated) {
          const limit = createLimit(options.args, options.error)
          state.limit = limit
          state.pendingLimits.push(limit)
        }
        else if (!limitArgOnError) {
          // When limitArgOnError is false, still set state.limit for error retrieval
          // and add to pendingLimits for next cycle index limiting
          const limit = createLimit(options.args, options.error)
          if (state.limit == null) {
            state.limit = limit
          }
          state.pendingLimits.push(limit)
        }
        return
      }

      // addLimit({args, index}) or addLimit({args, index, error}) - immediate index + pending args
      if (hasArgs && hasIndex) {
        const isEarliest = state.count == null || options.index < state.count
        if (isEarliest) {
          state.count = options.index
        }
        if (!validateArgsKeys(options.args, keySet, keysCount)) {
          return
        }
        // Extend templates with missing values from saved args
        extendTemplatesForArgs(state, options.args, templates, keys, keysCount, equals)
        if (isEarliest) {
          const oldLimitArgs = state.limit?.args ?? null
          state.limit = createLimit(options.args, options.error)
          updateArgLimits(state, options.args, oldLimitArgs, templates, keys, keysCount, equals, limitArgOnError)
        }
      }
    },
    start() {
      // Do NOT increment completedCount for interrupted modes here
      // Completion only counts when mode naturally finishes all variants
      // Modes interrupted by count limit (error found) should not count as completed

      // Save progress flags before resetting (used by minCompletedCount which is checked after start())
      // On first start (cycleIndex = -1), keep initial hadProgressInPreviousCycle = true to allow loop entry
      // On subsequent starts, save current progress before resetting
      for (let i = 0; i < state.modesState.length; i++) {
        if (state.cycleIndex >= 0) {
          state.modesState[i].hadProgressInPreviousCycle = state.modesState[i].hadProgressInCycle
        }
        state.modesState[i].hadProgressInCycle = false
      }

      state.cycleIndex++
      // Reset count for new cycle unless:
      // 1. count was explicitly set by addLimit({index}), OR
      // 2. there's an error limit set (constrains future cycles in findBestError mode)
      if (!state.countIsExplicit && !state.limit?.error) {
        state.count = null
      }
      resetIteratorState(state, templates, keys, keysCount)
      state.modeIndex = 0
      if (state.modesState.length > 0) {
        const mode0State = state.modesState[0]
        mode0State.pickCount = 0
        mode0State.startTime = timeController.now()

        // Restore saved position for mode 0 if it exists (was interrupted by limit previously)
        const mode0 = state.modes[0]
        if (mode0 && (mode0.mode === 'forward' || mode0.mode === 'backward')) {
          const saved = mode0State.savedPosition
          if (saved) {
            tryRestoreSavedPosition(saved, state, mode0State, templates, keys, keysCount)
          }
          else {
            mode0State.cycle = 0
          }
        }
        else {
          mode0State.cycle = 0
        }
      }
      state.started = true
    },
    next() {
      if (!state.started) {
        throw new Error('[testVariantsIterator] start() must be called before next()')
      }

      // Check if all modes exhausted
      if (state.modeIndex >= state.modes.length) {
        if (state.count == null) {
          state.count = state.index + 1
        }
        return null
      }

      const now = timeController.now()
      const modeConfig = state.modes[state.modeIndex]
      const modeState = state.modesState[state.modeIndex]
      const attemptsPerVariant = getModeRepeatsPerVariant(modeConfig)

      // Try next repeat for current variant
      if (state.index >= 0 && state.repeatIndex + 1 < attemptsPerVariant) {
        if (state.count == null || state.index < state.count) {
          state.repeatIndex++
          modeState.pickCount++
          modeState.hadProgressInCycle = true
          state.currentArgs = buildCurrentArgs()
          state.testsCount++
          return state.currentArgs
        }
      }

      // Check if current mode is exhausted - switch to next mode (save position since interrupted by limit)
      if (isModeExhausted(modeConfig, modeState, now)) {
        if (logDebug) {
          log(`[debug:iter] mode exhausted (limits): mode[${state.modeIndex}]=${modeConfig.mode}, limitTests=${modeConfig.limitTests}, pickCount=${modeState.pickCount}`)
        }
        switchToNextMode(state, templates, keys, keysCount, true, now, logDebug)
        return this.next()
      }

      // Move to next variant based on current mode
      state.repeatIndex = 0
      let success: boolean

      if (modeConfig.mode === 'random') {
        success = randomPickVariant(state, templates, keys, keysCount, limitArgOnError)
      }
      else if (modeConfig.mode === 'backward') {
        success = advanceBackwardMode(state, modeState, templates, keys, keysCount, getModeCycles(modeConfig))
      }
      else {
        success = advanceForwardMode(state, modeState, templates, keys, keysCount, getModeCycles(modeConfig))
      }

      if (!success) {
        // Current mode naturally completed - switch to next mode (don't save position)
        if (logDebug) {
          log(`[debug:iter] mode completed naturally: mode[${state.modeIndex}]=${modeConfig.mode}, cycle=${modeState.cycle}, index=${state.index}`)
        }
        switchToNextMode(state, templates, keys, keysCount, false, now, logDebug)
        return this.next()
      }

      state.index++
      modeState.pickCount++
      // Mark progress as soon as we successfully advance to a variant
      // This ensures modes hitting count limit are still counted in minCompletedCount
      modeState.hadProgressInCycle = true

      // Process pending limits at new position
      if (state.pendingLimits.length > 0) {
        processPendingLimits(state, templates, keys, keysCount, equals, limitArgOnError, includeErrorVariant)
      }

      // Check count limit - end cycle (count is a global limit, not per-mode)
      if (state.count != null && state.index >= state.count) {
        if (logDebug) {
          log(`[debug:iter] count limit reached: index=${state.index} >= count=${state.count}`)
        }
        // Current mode made progress, count it as completed
        modeState.completedCount++
        // Mark all modes as exhausted for this cycle
        state.modeIndex = state.modes.length
        return null
      }
      // For random mode: each yielded pick = 1 completed cycle
      if (modeConfig.mode === 'random') {
        modeState.completedCount++
      }

      state.currentArgs = buildCurrentArgs()
      state.testsCount++
      return state.currentArgs
    },
  }

  return iterator
}
