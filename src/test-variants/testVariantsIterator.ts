import type {Obj} from 'src/test-variants/types'
import type {TestVariantsTemplate, TestVariantsTemplates} from 'src/test-variants/testVariantsIterable'

/** Parameters passed to getSeed function for generating test seeds */
export type GetSeedParams = {
  /** Index of current variant/parameter-combination being tested */
  variantIndex: number,
  /** Index of current cycle - full pass through all variants (0..cycles-1) */
  cycleIndex: number,
  /** Index of repeat for current variant within this cycle (0..repeatsPerVariant-1) */
  repeatIndex: number,
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
  /** Generates seed for reproducible randomized testing; seed is added to args */
  getSeed?: null | ((params: GetSeedParams) => any)
  /** Number of repeat tests per variant within each cycle */
  repeatsPerVariant?: null | number
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
  /** Add or tighten limit */
  addLimit(options?: null | AddLimitOptions<Args>): void
  /** Reset to beginning of iteration for next cycle */
  start(): void
  /** Get next variant or null when done */
  next(): Args | null
}

export {
  type TestVariantsTemplate,
  type TestVariantsTemplates,
}

/** Find last index of value in array; uses custom equals or strict equality */
function findLastIndex<T>(
  values: T[],
  value: T,
  equals?: null | ((a: T, b: T) => boolean),
): number {
  if (equals) {
    for (let i = values.length - 1; i >= 0; i--) {
      if (equals(values[i], value)) {
        return i
      }
    }
    return -1
  }
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] === value) {
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

/** Iterator internal state */
type IteratorState<Args extends Obj> = {
  args: Args
  indexes: number[]
  variants: any[][]
  /** Per-arg max value index limits; null means no limit for that arg */
  argLimits: (number | null)[]
  index: number
  cycleIndex: number
  repeatIndex: number
  count: number | null
  limit: TestVariantsIteratorLimit<Args> | null
  started: boolean
  currentArgs: Args | null
  pendingLimits: PendingLimit<Args>[]
}

/** Calculate template values for given key index */
function calcTemplateValues<Args extends Obj>(
  templates: TestVariantsTemplate<Args, any>[],
  args: Args,
  keyIndex: number,
): any[] {
  const template = templates[keyIndex]
  if (typeof template === 'function') {
    return template(args)
  }
  return template
}

/** Reset iterator state for new cycle */
function resetIteratorState<Args extends Obj>(
  state: IteratorState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  keysCount: number,
): void {
  state.index = -1
  state.repeatIndex = 0
  for (let i = 0; i < keysCount; i++) {
    state.indexes[i] = -1
    state.variants[i] = []
  }
  if (keysCount > 0) {
    state.variants[0] = calcTemplateValues(templates, state.args, 0)
  }
}

/** Get effective max index for an arg (considering argLimit) */
function getMaxIndex(state: IteratorState<any>, keyIndex: number): number {
  const variantsLen = state.variants[keyIndex].length
  const argLimit = state.argLimits[keyIndex]
  if (argLimit == null) {
    return variantsLen
  }
  return argLimit < variantsLen ? argLimit : variantsLen
}

/** Advance to next variant in cartesian product; returns true if successful */
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
      const key = keys[keyIndex]
      const value = state.variants[keyIndex][valueIndex]
      state.indexes[keyIndex] = valueIndex
      state.args[key] = value
      for (keyIndex++; keyIndex < keysCount; keyIndex++) {
        const keyVariants = calcTemplateValues(templates, state.args, keyIndex)
        const keyMaxIndex = state.argLimits[keyIndex] ?? keyVariants.length
        if (keyVariants.length === 0 || keyMaxIndex <= 0) {
          break
        }
        state.indexes[keyIndex] = 0
        state.variants[keyIndex] = keyVariants
        const key = keys[keyIndex]
        const value = keyVariants[0]
        state.args[key] = value
      }
      if (keyIndex >= keysCount) {
        return true
      }
    }
  }
  return false
}

/** Validate saved args keys match iterator's arg names (ignoring "seed" key) */
function validateArgsKeys<Args extends Obj>(
  savedArgs: Args,
  keysSet: Set<string>,
  keysCount: number,
): boolean {
  const savedKeys = Object.keys(savedArgs).filter(k => k !== 'seed')
  if (savedKeys.length !== keysCount) {
    return false
  }
  for (const key of savedKeys) {
    if (!keysSet.has(key)) {
      return false
    }
  }
  return true
}

/** For static templates, verify arg value exists in template values */
function validateStaticArgsValues<Args extends Obj>(
  savedArgs: Args,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  equals?: null | ((a: any, b: any) => boolean),
): boolean {
  for (let i = 0; i < keysCount; i++) {
    const template = templates[i]
    if (typeof template !== 'function') {
      const value = savedArgs[keys[i]]
      if (findLastIndex(template, value, equals) < 0) {
        return false
      }
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
    const pendingValueIndex = findLastIndex(state.variants[i], pendingValue, equals)

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

/** Update per-arg limits from args values */
function updateArgLimits<Args extends Obj>(
  state: IteratorState<Args>,
  limitArgs: Args,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  equals?: null | ((a: any, b: any) => boolean),
  limitArgOnError?: null | boolean | LimitArgOnError,
): void {
  if (!limitArgOnError) {
    return
  }
  for (let i = 0; i < keysCount; i++) {
    const key = keys[i]
    const value = limitArgs[key]
    const values = state.variants[i].length > 0
      ? state.variants[i]
      : calcTemplateValues(templates, state.args, i)
    const valueIndex = findLastIndex(values, value, equals)

    // Skip if value not found or already at index 0
    if (valueIndex <= 0) {
      continue
    }

    // Check callback if provided
    if (typeof limitArgOnError === 'function') {
      const shouldLimit = limitArgOnError({
        name         : key as string,
        valueIndex,
        values,
        maxValueIndex: state.argLimits[i],
      })
      if (!shouldLimit) {
        continue
      }
    }

    // Update limit: argLimit = min(current argLimit, valueIndex)
    const currentLimit = state.argLimits[i]
    if (currentLimit == null || valueIndex < currentLimit) {
      state.argLimits[i] = valueIndex
    }
  }
}

/** Process pending limits; returns true if any limit was applied */
function processPendingLimits<Args extends Obj>(
  state: IteratorState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  equals?: null | ((a: any, b: any) => boolean),
  limitArgOnError?: null | boolean | LimitArgOnError,
): boolean {
  let applied = false
  for (let i = state.pendingLimits.length - 1; i >= 0; i--) {
    const pending = state.pendingLimits[i]
    if (isPositionReached(state, pending.args, keys, keysCount, equals)) {
      // Current position >= pending position: apply limit
      if (state.count == null || state.index < state.count) {
        state.count = state.index
        state.limit = typeof pending.error !== 'undefined'
          ? {args: pending.args, error: pending.error}
          : {args: pending.args}
        updateArgLimits(state, pending.args, templates, keys, keysCount, equals, limitArgOnError)
        applied = true
      }
      // Remove from pending
      state.pendingLimits.splice(i, 1)
    }
  }
  return applied
}

/** Creates test variants iterator with limiting capabilities */
export function testVariantsIterator<Args extends Obj>(
  options: TestVariantsIteratorOptions<Args>,
): TestVariantsIterator<Args> {
  const {argsTemplates, getSeed, repeatsPerVariant: _repeatsPerVariant, equals, limitArgOnError} = options
  const repeatsPerVariant = _repeatsPerVariant ?? 1
  const keys = Object.keys(argsTemplates) as (keyof Args)[]
  const templates: TestVariantsTemplate<Args, any>[] = Object.values(argsTemplates)
  const keysCount = keys.length
  const keysSet = new Set(keys as string[])

  // Initialize state
  const indexes: number[] = []
  const variants: any[][] = []
  const argLimits: (number | null)[] = []
  for (let i = 0; i < keysCount; i++) {
    indexes[i] = -1
    variants[i] = []
    argLimits[i] = null
  }

  const state: IteratorState<Args> = {
    args         : {} as Args,
    indexes,
    variants,
    argLimits,
    index        : -1,
    cycleIndex   : -1,
    repeatIndex  : 0,
    count        : null,
    limit        : null,
    started      : false,
    currentArgs  : null,
    pendingLimits: [],
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
    addLimit(_options) {
      const hasArgs = typeof _options?.args !== 'undefined' && _options.args !== null
      const hasIndex = _options?.index != null

      // addLimit() or addLimit({error}) - uses current args and index
      if (!hasArgs && !hasIndex) {
        if (state.index < 0) {
          throw new Error('[testVariantsIterator] addLimit() requires at least one next() call')
        }
        if (state.count == null || state.index < state.count) {
          state.count = state.index
          state.limit = typeof _options?.error !== 'undefined'
            ? {args: state.currentArgs, error: _options.error}
            : {args: state.currentArgs}
          updateArgLimits(state, state.args, templates, keys, keysCount, equals, limitArgOnError)
        }
        return
      }

      // addLimit({index}) - only index limiting, no args
      if (hasIndex && !hasArgs) {
        if (state.count == null || _options.index < state.count) {
          state.count = _options.index
        }
        return
      }

      // addLimit({args}) or addLimit({args, error}) - pending limit + immediate per-arg limits
      if (hasArgs && !hasIndex) {
        // Validate args keys match iterator's arg names
        if (!validateArgsKeys(_options.args, keysSet, keysCount)) {
          return // Discard - unreproducible (templates changed)
        }
        // For static templates, verify arg value exists
        if (!validateStaticArgsValues(_options.args, templates, keys, keysCount, equals)) {
          return // Discard - unreproducible (value not in template)
        }
        // Apply per-arg limits immediately for static templates
        updateArgLimits(state, _options.args, templates, keys, keysCount, equals, limitArgOnError)
        // Store as pending limit for count/position-based limiting
        const pending: PendingLimit<Args> = typeof _options.error !== 'undefined'
          ? {args: _options.args, error: _options.error}
          : {args: _options.args}
        state.pendingLimits.push(pending)
        return
      }

      // addLimit({args, index}) or addLimit({args, index, error}) - immediate index + pending args
      if (hasArgs && hasIndex) {
        // Check if this is earliest (before potentially updating count)
        const isEarliest = state.count == null || _options.index < state.count
        // Always apply index limit
        if (isEarliest) {
          state.count = _options.index
        }
        // Validate args for limit property update
        if (!validateArgsKeys(_options.args, keysSet, keysCount)) {
          return // Skip per-arg limits and limit property update
        }
        if (!validateStaticArgsValues(_options.args, templates, keys, keysCount, equals)) {
          return // Skip per-arg limits and limit property update
        }
        // Update limit if this is earliest
        if (isEarliest) {
          state.limit = typeof _options.error !== 'undefined'
            ? {args: _options.args, error: _options.error}
            : {args: _options.args}
          updateArgLimits(state, _options.args, templates, keys, keysCount, equals, limitArgOnError)
        }
      }
    },
    start() {
      state.cycleIndex++
      resetIteratorState(state, templates, keysCount)
      state.started = true
    },
    next() {
      if (!state.started) {
        throw new Error('[testVariantsIterator] start() must be called before next()')
      }
      // Try next repeat for current variant
      if (state.index >= 0 && state.repeatIndex + 1 < repeatsPerVariant) {
        // Check if current variant is still within limit
        if (state.count == null || state.index < state.count) {
          state.repeatIndex++
          if (getSeed) {
            const seed = getSeed({
              variantIndex: state.index,
              cycleIndex  : state.cycleIndex,
              repeatIndex : state.repeatIndex,
            })
            state.currentArgs = {...state.args, seed} as Args
          }
          else {
            state.currentArgs = {...state.args}
          }
          return state.currentArgs
        }
      }

      // Move to next variant
      state.repeatIndex = 0
      if (!advanceVariant(state, templates, keys, keysCount)) {
        // First complete cycle sets count to total variant count
        if (state.count == null) {
          state.count = state.index + 1
        }
        return null
      }
      state.index++

      // Process pending limits at new position
      if (state.pendingLimits.length > 0) {
        processPendingLimits(state, templates, keys, keysCount, equals, limitArgOnError)
      }

      // Check count limit (may have been updated by pending limit)
      if (state.count != null && state.index >= state.count) {
        return null
      }
      if (getSeed) {
        const seed = getSeed({
          variantIndex: state.index,
          cycleIndex  : state.cycleIndex,
          repeatIndex : state.repeatIndex,
        })
        state.currentArgs = {...state.args, seed} as Args
      }
      else {
        state.currentArgs = {...state.args}
      }
      return state.currentArgs
    },
  }

  return iterator
}
