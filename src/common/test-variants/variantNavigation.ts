import type {Obj} from '@flemist/simple-utils'
import type {LimitArgOnError, TestVariantsTemplate} from 'src/common/test-variants/types'

/** State required for variant navigation */
export type NavigationState<Args extends Obj> = {
  args: Args
  indexes: number[]
  argValues: any[][]
  argLimits: (number | null)[]
  extraValues: (any[] | null)[]
  repeatIndex: number
}

/** Calculate template values for given key index, including extra values from saved variants */
export function calcTemplateValues<Args extends Obj>(
  state: NavigationState<Args>,
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

/** Get effective max index for an arg (considering argLimit)
 * argLimit is INCLUSIVE upper bound; returns EXCLUSIVE upper bound for iteration
 */
export function getMaxIndex(state: NavigationState<any>, keyIndex: number): number {
  const valuesLen = state.argValues[keyIndex].length
  const argLimit = state.argLimits[keyIndex]
  if (argLimit == null) {
    return valuesLen
  }
  return Math.min(argLimit + 1, valuesLen)
}

/** Reset iteration position to beginning (for forward mode cycles) */
export function resetIterationPositionToStart<Args extends Obj>(
  state: NavigationState<Args>,
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
export function resetIterationPositionToEnd<Args extends Obj>(
  state: NavigationState<Args>,
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

/** Advance to next variant in cartesian product; returns true if successful
 * Uses shared keyIndex between loops: when inner loop breaks on empty template,
 * outer loop retries from that position
 */
export function advanceVariant<Args extends Obj>(
  state: NavigationState<Args>,
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
export function retreatVariant<Args extends Obj>(
  state: NavigationState<Args>,
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
export function randomPickVariant<Args extends Obj>(
  state: NavigationState<Args>,
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
