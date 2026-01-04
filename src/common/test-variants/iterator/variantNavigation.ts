import type { Obj } from '@flemist/simple-utils'
import type {
  LimitArgOnError,
  TestVariantsTemplatesWithExtra,
  VariantNavigationState,
} from 'src/common/test-variants/types'
import { findValueIndex } from 'src/common/test-variants/helpers/findValueIndex'

/** Calculate template values for given key index */
export function calcArgValues<Args extends Obj>(
  templates: TestVariantsTemplatesWithExtra<Args, any>,
  args: Args,
  keyIndex: number,
): readonly any[] {
  const template = templates.templates[keyIndex]
  const extra = templates.extra[keyIndex]
  let values: readonly any[]
  if (typeof template === 'function') {
    values = template(args)
  } else {
    values = template
  }

  // Это снижает производительность на горячем пути,
  // но пока не приходит в голову как сделать лучше.
  // Но эта ситуация возможна только если пользователь
  // изменяет шаблон между запусками тестов,
  // а сохраненная ошикбка выходит за рамки нового шаблона.
  let valuesWithExtra: any[] | null = null
  for (let i = 0, len = extra.length; i < len; i++) {
    const extraValue = extra[i]
    if (findValueIndex(values, extraValue) < 0) {
      if (valuesWithExtra == null) {
        valuesWithExtra = [...values, extraValue]
      } else {
        valuesWithExtra.push(extraValue)
      }
    }
  }

  return valuesWithExtra ?? values
}

/** Get exclusive upper bound for arg values index, considering limits
 */
export function getArgValuesMaxIndex(
  state: VariantNavigationState<any>,
  argValueIndex: number,
): number {
  const valuesLen = state.argValues[argValueIndex].length
  const argLimit = state.argLimits[argValueIndex]
  if (argLimit == null) {
    return valuesLen
  }
  return Math.min(argLimit + 1, valuesLen)
}

/** Reset iteration position to beginning (for `forward` mode) */
export function resetVariantNavigationToStart<Args extends Obj>(
  state: VariantNavigationState<Args>,
  templates: TestVariantsTemplatesWithExtra<Args, any>,
  argsKeys: (keyof Args)[],
): void {
  const argsKeysLength = argsKeys.length
  state.attemptIndex = 0
  for (let i = 0; i < argsKeysLength; i++) {
    state.indexes[i] = -1
    state.argValues[i] = []
    // high performance way to delete property
    state.args[argsKeys[i]] = void 0 as any
  }
  if (argsKeysLength > 0) {
    state.argValues[0] = calcArgValues(templates, state.args, 0)
  }
}

/** Reset iteration position to end (for `backward` mode); returns true if valid position exists */
export function resetVariantNavigationToEnd<Args extends Obj>(
  state: VariantNavigationState<Args>,
  templates: TestVariantsTemplatesWithExtra<Args, any>,
  argsKeys: (keyof Args)[],
): boolean {
  const keysCount = argsKeys.length
  state.attemptIndex = 0
  for (let i = 0; i < keysCount; i++) {
    // high performance way to delete property
    state.args[argsKeys[i]] = void 0 as any
  }
  // Set each arg to its max value within limits
  for (let i = 0; i < keysCount; i++) {
    state.argValues[i] = calcArgValues(templates, state.args, i)
    const maxIndex = getArgValuesMaxIndex(state, i) - 1
    if (maxIndex < 0) {
      return false
    }
    state.indexes[i] = maxIndex
    state.args[argsKeys[i]] = state.argValues[i][maxIndex]
  }
  return true
}

export function isVariantNavigationAtStart<Args extends Obj>(
  state: VariantNavigationState<Args>,
): boolean {
  for (let i = 0, len = state.indexes.length; i < len; i++) {
    if (state.indexes[i] > 0) {
      return false
    }
  }
  return true
}

export function isVariantNavigationAtEndOrBeyond<Args extends Obj>(
  state: VariantNavigationState<Args>,
): boolean {
  for (let i = 0, len = state.indexes.length; i < len; i++) {
    const maxIndex = getArgValuesMaxIndex(state, i) - 1
    if (state.indexes[i] < maxIndex) {
      return false
    }
  }
  return true
}

/** Advance to next variant in cartesian product; returns true if successful */
export function advanceVariantNavigation<Args extends Obj>(
  state: VariantNavigationState<Args>,
  templates: TestVariantsTemplatesWithExtra<Args, any>,
  keys: (keyof Args)[],
): boolean {
  const keysCount = keys.length
  for (let keyIndex = keysCount - 1; keyIndex >= 0; keyIndex--) {
    const valueIndex = state.indexes[keyIndex] + 1
    const maxIndex = getArgValuesMaxIndex(state, keyIndex)
    if (valueIndex < maxIndex) {
      state.indexes[keyIndex] = valueIndex
      state.args[keys[keyIndex]] = state.argValues[keyIndex][valueIndex]
      // Clear subsequent keys from args before calculating their template values
      for (let i = keyIndex + 1; i < keysCount; i++) {
        // high performance way to delete property
        state.args[keys[i]] = void 0 as any
      }
      for (keyIndex++; keyIndex < keysCount; keyIndex++) {
        state.argValues[keyIndex] = calcArgValues(
          templates,
          state.args,
          keyIndex,
        )
        const keyMaxIndex = getArgValuesMaxIndex(state, keyIndex)
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
export function retreatVariantNavigation<Args extends Obj>(
  state: VariantNavigationState<Args>,
  templates: TestVariantsTemplatesWithExtra<Args, any>,
  keys: (keyof Args)[],
): boolean {
  const keysCount = keys.length
  for (let keyIndex = keysCount - 1; keyIndex >= 0; keyIndex--) {
    const valueIndex = state.indexes[keyIndex] - 1
    if (valueIndex >= 0) {
      state.indexes[keyIndex] = valueIndex
      state.args[keys[keyIndex]] = state.argValues[keyIndex][valueIndex]
      // Set subsequent keys to their max values
      for (let i = keyIndex + 1; i < keysCount; i++) {
        // high performance way to delete property
        state.args[keys[i]] = void 0 as any
      }
      for (keyIndex++; keyIndex < keysCount; keyIndex++) {
        state.argValues[keyIndex] = calcArgValues(
          templates,
          state.args,
          keyIndex,
        )
        const maxIndex = getArgValuesMaxIndex(state, keyIndex) - 1
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
export function randomPickVariantNavigation<Args extends Obj>(
  state: VariantNavigationState<Args>,
  templates: TestVariantsTemplatesWithExtra<Args, any>,
  keys: (keyof Args)[],
  limitArgOnError?: null | boolean | LimitArgOnError,
): boolean {
  const keysCount = keys.length

  if (keysCount <= 0) {
    // Nothing to pick
    return false
  }

  // Calculate argValues for first arg (subsequent args calculated during picking)
  state.argValues[0] = calcArgValues(templates, state.args, 0)

  if (limitArgOnError) {
    for (let keyIndex = 0; keyIndex < keysCount; keyIndex++) {
      const len = state.argValues[keyIndex].length
      if (len === 0) {
        return false
      }
      const maxIndex = getArgValuesMaxIndex(state, keyIndex)
      if (maxIndex <= 0) {
        break
      }
      state.indexes[keyIndex] = Math.floor(Math.random() * maxIndex)
      state.args[keys[keyIndex]] =
        state.argValues[keyIndex][state.indexes[keyIndex]]
      if (keyIndex + 1 < keysCount) {
        state.argValues[keyIndex + 1] = calcArgValues(
          templates,
          state.args,
          keyIndex + 1,
        )
      }
    }
    return true
  }

  // Combination constraint: must be below max combination lexicographically
  const isAtEndOrBeyond = isVariantNavigationAtEndOrBeyond(state)
  if (isAtEndOrBeyond) {
    return retreatVariantNavigation(state, templates, keys)
  }

  return true
}
