import type { Obj } from '@flemist/simple-utils'
import type { Equals, LimitArgOnError } from 'src/common/test-variants/types'
import type {
  TestVariantsTemplatesWithExtra,
  VariantNavigationState,
} from './types'
import { findValueIndex } from 'src/common/test-variants/helpers/findValueIndex'

/** Calculate template values for given key */
export function calcArgValues<Args extends Obj>(
  templates: TestVariantsTemplatesWithExtra<Args, any>,
  args: Args,
  key: keyof Args,
  equals?: null | Equals,
): readonly any[] {
  const template = templates.templates[key]
  const extra = templates.extra[key]
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
    if (findValueIndex(values, extraValue, equals) < 0) {
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
export function getArgValuesMaxIndexExclusive(
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
  equals?: null | Equals,
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
    state.argValues[0] = calcArgValues(
      templates,
      state.args,
      argsKeys[0],
      equals,
    )
  }
}

/** Reset iteration position to end (for `backward` mode); returns true if valid position exists */
export function resetVariantNavigationToEnd<Args extends Obj>(
  state: VariantNavigationState<Args>,
  templates: TestVariantsTemplatesWithExtra<Args, any>,
  argsKeys: (keyof Args)[],
  equals?: null | Equals,
): boolean {
  const keysCount = argsKeys.length
  state.attemptIndex = 0
  for (let i = 0; i < keysCount; i++) {
    // high performance way to delete property
    state.args[argsKeys[i]] = void 0 as any
  }
  // Set each arg to its max value within limits
  for (let i = 0; i < keysCount; i++) {
    state.argValues[i] = calcArgValues(
      templates,
      state.args,
      argsKeys[i],
      equals,
    )
    const maxIndex = getArgValuesMaxIndexExclusive(state, i) - 1
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
    const maxIndex = getArgValuesMaxIndexExclusive(state, i) - 1
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
  equals?: null | Equals,
): boolean {
  const keysCount = keys.length
  for (let keyIndex = keysCount - 1; keyIndex >= 0; keyIndex--) {
    const valueIndex = state.indexes[keyIndex] + 1
    const maxIndex = getArgValuesMaxIndexExclusive(state, keyIndex)
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
          keys[keyIndex],
          equals,
        )
        const keyMaxIndex = getArgValuesMaxIndexExclusive(state, keyIndex)
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
  equals?: null | Equals,
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
          keys[keyIndex],
          equals,
        )
        const maxIndex = getArgValuesMaxIndexExclusive(state, keyIndex) - 1
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
  equals?: null | Equals,
): boolean {
  const keysCount = keys.length

  if (keysCount <= 0) {
    return false
  }

  state.argValues[0] = calcArgValues(templates, state.args, keys[0], equals)

  // Once we pick a value strictly below the limit at some key,
  // all subsequent keys can have any value (lexicographically less than limit).
  // Only relevant when limitArgOnError is false.
  let belowMax = false

  for (let keyIndex = 0; keyIndex < keysCount; keyIndex++) {
    const len = state.argValues[keyIndex].length
    if (len === 0) {
      return false
    }

    let maxIndexExclusive: number
    if (!belowMax || limitArgOnError) {
      maxIndexExclusive = getArgValuesMaxIndexExclusive(state, keyIndex)
    } else {
      maxIndexExclusive = len
    }
    if (maxIndexExclusive <= 0) {
      return false
    }

    const randomIndex = Math.floor(Math.random() * maxIndexExclusive)
    state.indexes[keyIndex] = randomIndex
    state.args[keys[keyIndex]] = state.argValues[keyIndex][randomIndex]

    if (!belowMax && randomIndex < maxIndexExclusive - 1) {
      belowMax = true
    }

    if (keyIndex + 1 < keysCount) {
      state.argValues[keyIndex + 1] = calcArgValues(
        templates,
        state.args,
        keys[keyIndex + 1],
        equals,
      )
    }
  }

  if (!belowMax) {
    return randomPickVariantNavigation(
      state,
      templates,
      keys,
      limitArgOnError,
      equals,
    )
  }

  return true
}
