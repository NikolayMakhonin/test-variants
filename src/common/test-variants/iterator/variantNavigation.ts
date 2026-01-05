import type { Obj } from '@flemist/simple-utils'
import { ArgName, TestVariantsTemplates, VariantNavigationState } from './types'
import { findValueIndex } from 'src/common/test-variants/helpers/findValueIndex'
import type { LimitArgOnError } from 'src/common'

export function createVariantNavigationState<Args extends Obj>(
  templates: TestVariantsTemplates<Args>,
  equals: VariantNavigationState<Args>['equals'],
  limitArgOnError: null | boolean | LimitArgOnError,
): VariantNavigationState<Args> {
  const argsNames = Object.keys(templates) as ArgName<Args>[]
  const args: Args = {} as Args
  const indexes: number[] = []
  const argValues: (readonly any[])[] = []
  const argLimits: (number | null)[] = []
  const argsCount = argsNames.length
  for (let i = 0; i < argsCount; i++) {
    const argName = argsNames[i]
    args[argName] = void 0 as any
    indexes.push(-1)
    argValues.push(void 0 as any)
    argLimits.push(null)
  }
  return {
    args,
    argsNames,
    indexes,
    argValues,
    argLimits,
    attemptIndex: 0,
    templates: {
      templates,
      extra: {} as any,
    },
    limitArgOnError,
    equals,
  }
}

/** Calculate template values for given arg name */
export function calcArgValues<Args extends Obj>(
  state: VariantNavigationState<Args>,
  argName: ArgName<Args>,
): readonly any[] {
  const template = state.templates.templates[argName]
  const extra = state.templates.extra[argName]
  let values: readonly any[]
  if (typeof template === 'function') {
    values = template(state.args)
  } else {
    values = template
  }

  if (extra == null) {
    return values
  }

  // Это снижает производительность на горячем пути,
  // но пока не приходит в голову как сделать лучше.
  // Но эта ситуация возможна только если пользователь
  // изменяет шаблон между запусками тестов,
  // а сохраненная ошикбка выходит за рамки нового шаблона.
  let valuesWithExtra: any[] | null = null
  for (let i = 0, len = extra.length; i < len; i++) {
    const extraValue = extra[i]
    if (findValueIndex(values, extraValue, state.equals) < 0) {
      if (valuesWithExtra == null) {
        valuesWithExtra = [...values, extraValue]
      } else {
        valuesWithExtra.push(extraValue)
      }
    }
  }

  return valuesWithExtra ?? values
}

/** Get max possible arg value index, considering limits */
export function getArgValueMaxIndex(
  state: VariantNavigationState<any>,
  argIndex: number,
  belowMax: boolean,
): number {
  const valuesLen = state.argValues[argIndex].length
  const argLimit = state.argLimits[argIndex]
  if (argLimit == null) {
    return valuesLen - 1
  }
  let limitArgOnError = state.limitArgOnError
  if (typeof limitArgOnError === 'function') {
    const argName = state.argsNames[argIndex]
    const valueIndex = state.indexes[argIndex]
    limitArgOnError = limitArgOnError({
      name: argName,
      valueIndex,
      values: state.argValues[argIndex],
      maxValueIndex: argLimit,
    })
  }
  if (!belowMax || limitArgOnError) {
    return Math.min(argLimit, valuesLen - 1)
  }
  return valuesLen - 1
}

/**
 * Reset variant navigation to initial state
 * Variant position will be undefined
 * @return true if valid position exists
 */
export function resetVariantNavigation<Args extends Obj>(
  state: VariantNavigationState<Args>,
): void {
  const argsCount = state.indexes.length
  for (let argIndex = 0; argIndex < argsCount; argIndex++) {
    state.indexes[argIndex] = -1
    state.argValues[argIndex] = void 0 as any
    // high performance alternative to delete property
    state.args[state.argsNames[argIndex]] = void 0 as any
  }
}

/**
 * Check if any position is strictly below its max
 * When state.limitArgOnError is true, also check that each argument not exceeds its max.
 */
export function isVariantNavigationBelowMax<Args extends Obj>(
  state: VariantNavigationState<Args>,
): boolean {
  let belowMax = false
  const argsCount = state.indexes.length
  for (let argIndex = 0; argIndex < argsCount; argIndex++) {
    const maxIndex = getArgValueMaxIndex(state, argIndex, belowMax)
    if (state.indexes[argIndex] > maxIndex) {
      return false
    }
    if (state.indexes[argIndex] < maxIndex) {
      belowMax = true
    }
  }
  return belowMax
}

/** Advance to next variant in cartesian product; returns true if successful */
export function advanceVariantNavigation<Args extends Obj>(
  state: VariantNavigationState<Args>,
): boolean {
  const argsCount = state.indexes.length
  if (argsCount === 0) {
    return false
  }

  // Check if we're in initial state (any index is -1)
  let isInitial = false
  for (let i = 0; i < argsCount; i++) {
    if (state.indexes[i] < 0) {
      isInitial = true
      break
    }
  }

  if (isInitial) {
    // Initialize all args from left to right
    let belowMax = false
    for (let i = 0; i < argsCount; i++) {
      // Clear current arg before calculating template (for dependent templates)
      state.args[state.argsNames[i]] = void 0 as any
      state.argValues[i] = calcArgValues(state, state.argsNames[i])
      const maxIndex = getArgValueMaxIndex(state, i, belowMax)
      if (maxIndex < 0) {
        return false
      }
      state.indexes[i] = 0
      state.args[state.argsNames[i]] = state.argValues[i][0]
      const limitedMaxIndex = getArgValueMaxIndex(state, i, false)
      if (0 < limitedMaxIndex) {
        belowMax = true
      }
    }
    return true
  }

  // Normal advance: try to increment from right to left
  let argIndex = argsCount - 1
  while (argIndex >= 0) {
    // Calculate current belowMax status for args 0..argIndex-1
    let belowMax = false
    for (let i = 0; i < argIndex; i++) {
      const limitedMaxIndex = getArgValueMaxIndex(state, i, false)
      if (state.indexes[i] < limitedMaxIndex) {
        belowMax = true
        break
      }
    }

    // Ensure argValues is calculated for current arg
    if (state.argValues[argIndex] == null) {
      state.argValues[argIndex] = calcArgValues(
        state,
        state.argsNames[argIndex],
      )
    }

    const maxIndex = getArgValueMaxIndex(state, argIndex, belowMax)
    const valueIndex = state.indexes[argIndex] + 1

    if (valueIndex > maxIndex) {
      // Can't increment this arg, move left
      argIndex--
      continue
    }

    // Can increment this arg
    state.indexes[argIndex] = valueIndex
    state.args[state.argsNames[argIndex]] =
      state.argValues[argIndex][valueIndex]

    // Update belowMax based on new value
    const limitedMaxIndex = getArgValueMaxIndex(state, argIndex, false)
    if (valueIndex < limitedMaxIndex) {
      belowMax = true
    }

    // Clear subsequent args before calculating their templates
    for (let i = argIndex + 1; i < argsCount; i++) {
      state.args[state.argsNames[i]] = void 0 as any
    }

    // Initialize subsequent args to 0
    let success = true
    for (let i = argIndex + 1; i < argsCount; i++) {
      state.argValues[i] = calcArgValues(state, state.argsNames[i])
      const iMaxIndex = getArgValueMaxIndex(state, i, belowMax)
      if (iMaxIndex < 0) {
        success = false
        break
      }
      state.indexes[i] = 0
      state.args[state.argsNames[i]] = state.argValues[i][0]
      const iLimitedMaxIndex = getArgValueMaxIndex(state, i, false)
      if (0 < iLimitedMaxIndex) {
        belowMax = true
      }
    }

    if (success) {
      return true
    }
    // Failed to initialize subsequent arg; continue trying current arg
    // (indexes[argIndex] was incremented, next iteration tries valueIndex + 1)
  }

  return false
}

/** Fix variant position to be <= max; returns true if valid position exists */
function fixVariantNavigation<Args extends Obj>(
  state: VariantNavigationState<Args>,
): void {
  let belowMax = false
  for (let i = 0, len = state.indexes.length; i < len; i++) {
    const maxIndex = getArgValueMaxIndex(state, i, belowMax)
    if (state.indexes[i] > maxIndex) {
      state.indexes[i] = maxIndex
    }
    if (state.indexes[i] < maxIndex) {
      belowMax = true
    }
  }
}

/** Retreat to previous variant (decrement with borrow); returns true if successful */
export function retreatVariantNavigation<Args extends Obj>(
  state: VariantNavigationState<Args>,
): boolean {
  fixVariantNavigation(state)

  const keysCount = state.argsNames.length
  for (let keyIndex = keysCount - 1; keyIndex >= 0; keyIndex--) {
    const valueIndex = state.indexes[keyIndex] - 1
    if (valueIndex >= 0) {
      state.indexes[keyIndex] = valueIndex
      state.args[state.argsNames[keyIndex]] =
        state.argValues[keyIndex][valueIndex]

      // Check if we're now below max (for lexicographic constraint)
      let belowMax = false
      if (!state.limitArgOnError) {
        for (let i = 0; i <= keyIndex; i++) {
          const maxIndex = getArgValueMaxIndex(state, i, belowMax)
          if (state.indexes[i] < getArgValueMaxIndex(state, i)) {
            belowMax = true
            break
          }
        }
      }

      // Set subsequent state.argsNames to their max values
      for (let i = keyIndex + 1; i < keysCount; i++) {
        // high performance alternative to delete property
        state.args[state.argsNames[i]] = void 0 as any
      }
      for (keyIndex++; keyIndex < keysCount; keyIndex++) {
        state.argValues[keyIndex] = calcArgValues(
          state.templates,
          state.args,
          state.argsNames[keyIndex],
          state.equals,
        )
        const maxIndex = belowMaxSoFar
          ? state.argValues[keyIndex].length - 1
          : getArgValueMaxIndex(state, keyIndex) - 1
        if (maxIndex < 0) {
          break
        }
        state.indexes[keyIndex] = maxIndex
        state.args[state.argsNames[keyIndex]] =
          state.argValues[keyIndex][maxIndex]
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
): boolean {
  const keysCount = state.argsNames.length

  if (keysCount <= 0) {
    return false
  }

  state.argValues[0] = calcArgValues(
    state.templates,
    state.args,
    state.argsNames[0],
    state.equals,
  )

  // Once we pick a value strictly below the limit at some key,
  // all subsequent state.argsNames can have any value (lexicographically less than limit).
  // Only relevant when state.limitArgOnError is false.
  let belowMax = false

  for (let keyIndex = 0; keyIndex < keysCount; keyIndex++) {
    const len = state.argValues[keyIndex].length
    if (len === 0) {
      return false
    }

    let maxIndexExclusive: number
    if (!belowMax || state.limitArgOnError) {
      maxIndexExclusive = getArgValueMaxIndex(state, keyIndex)
    } else {
      maxIndexExclusive = len
    }
    if (maxIndexExclusive <= 0) {
      return false
    }

    const randomIndex = Math.floor(Math.random() * maxIndexExclusive)
    state.indexes[keyIndex] = randomIndex
    state.args[state.argsNames[keyIndex]] =
      state.argValues[keyIndex][randomIndex]

    if (!belowMax && randomIndex < maxIndexExclusive - 1) {
      belowMax = true
    }

    if (keyIndex + 1 < keysCount) {
      state.argValues[keyIndex + 1] = calcArgValues(
        state.templates,
        state.args,
        state.argsNames[keyIndex + 1],
        state.equals,
      )
    }
  }

  if (!belowMax) {
    return retreatVariantNavigation(
      state,
      state.templates,
      state.argsNames,
      state.limitArgOnError,
      state.equals,
    )
  }

  return true
}
