import type {Obj} from '@flemist/simple-utils'
import type {
  LimitArgOnError,
  TestVariantsIteratorLimit,
  TestVariantsTemplate,
} from 'src/test-variants/types'
import {calcTemplateValues, type NavigationState} from 'src/test-variants/variantNavigation'

/** Pending limit waiting for position match during iteration */
export type PendingLimit<Args> = {
  args: Args
  error?: unknown
}

/** State required for limit handling */
export type LimitState<Args extends Obj> = NavigationState<Args> & {
  pendingLimits: PendingLimit<Args>[]
  limit: TestVariantsIteratorLimit<Args> | null
  count: number | null
  index: number
}

/** Find index of value in array; returns -1 if not found */
export function findValueIndex<T>(
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

/** Extend template with missing value from saved args */
export function extendTemplateWithValue<Args extends Obj>(
  state: NavigationState<Args>,
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
export function extendTemplatesForArgs<Args extends Obj>(
  state: NavigationState<Args>,
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

/** Validate saved args keys match iterator's arg names (ignoring "seed" key) */
export function validateArgsKeys<Args extends Obj>(
  savedArgs: Args,
  keySet: Set<string>,
  keysCount: number,
): boolean {
  const savedKeys = Object.keys(savedArgs)
  let count = 0
  for (let i = 0, len = savedKeys.length; i < len; i++) {
    const key = savedKeys[i]
    if (key === 'seed') {
      continue
    }
    if (!keySet.has(key)) {
      return false
    }
    count++
  }
  return count === keysCount
}

/** Check if current position >= pending args position; returns false if current < pending or all args skipped */
export function isPositionReached<Args extends Obj>(
  state: NavigationState<Args>,
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
export function calcArgIndexes<Args extends Obj>(
  state: NavigationState<Args>,
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
export function compareLexicographic(a: number[], b: number[]): number {
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

/** Remove pending limits that exceed current argLimits (in-place mutation) */
export function filterPendingLimits<Args extends Obj>(
  state: LimitState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  equals?: null | ((a: any, b: any) => boolean),
): void {
  const pendingLimits = state.pendingLimits
  let writeIndex = 0
  for (let readIndex = 0, len = pendingLimits.length; readIndex < len; readIndex++) {
    const pending = pendingLimits[readIndex]
    let keep = true
    for (let i = 0; i < keysCount; i++) {
      const argLimit = state.argLimits[i]
      if (argLimit == null) {
        continue
      }
      const values = calcTemplateValues(state, templates, pending.args, i)
      const valueIndex = findValueIndex(values, pending.args[keys[i]], equals)
      if (valueIndex > argLimit) {
        keep = false
        break
      }
    }
    if (keep) {
      pendingLimits[writeIndex] = pending
      writeIndex++
    }
  }
  pendingLimits.length = writeIndex
}

/** Update per-arg limits from args values using lexicographic comparison; returns true if updated */
export function updateArgLimits<Args extends Obj>(
  state: LimitState<Args>,
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

/** Create limit object with optional error */
export function createLimit<Args>(args: Args, error?: unknown): TestVariantsIteratorLimit<Args> {
  return error !== void 0 ? {args, error} : {args}
}

/** Process pending limits at current position; returns true if limit was applied */
export function processPendingLimits<Args extends Obj>(
  state: LimitState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  equals?: null | ((a: any, b: any) => boolean),
  limitArgOnError?: null | boolean | LimitArgOnError,
  includeErrorVariant?: null | boolean,
): boolean {
  const pendingLimits = state.pendingLimits
  let lastReached: PendingLimit<Args> | null = null
  let writeIndex = 0

  for (let i = 0, len = pendingLimits.length; i < len; i++) {
    const pending = pendingLimits[i]
    if (isPositionReached(state, pending.args, keys, keysCount, equals)) {
      lastReached = pending
    }
    else {
      pendingLimits[writeIndex] = pending
      writeIndex++
    }
  }
  pendingLimits.length = writeIndex

  if (lastReached == null) {
    return false
  }

  // Apply the last reached limit (newest = lexicographically smallest)
  if (state.count == null || state.index < state.count) {
    const oldLimitArgs = state.limit?.args ?? null
    state.count = includeErrorVariant ? state.index + 1 : state.index
    state.limit = createLimit(lastReached.args, lastReached.error)
    updateArgLimits(state, lastReached.args, oldLimitArgs, templates, keys, keysCount, equals, limitArgOnError)
    return true
  }

  return false
}
