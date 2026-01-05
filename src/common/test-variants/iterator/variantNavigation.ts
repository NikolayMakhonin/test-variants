import type { Obj } from '@flemist/simple-utils'
import { ArgName, TestVariantsTemplates, VariantNavigationState } from './types'
import { findValueIndex } from 'src/common/test-variants/iterator/findValueIndex'
import type { LimitArgOnError } from 'src/common'
import type { Equals } from 'src/common/test-variants/types'

/** Create initial variant navigation state for given templates */
export function createVariantNavigationState<Args extends Obj>(
  templates: TestVariantsTemplates<Args>,
  equals: null | Equals,
  limitArgOnError: null | boolean | LimitArgOnError,
  includeErrorVariant: boolean,
): VariantNavigationState<Args> {
  const argsNames = Object.keys(templates) as ArgName<Args>[]
  const args: Args = {} as Args
  const indexes: number[] = []
  const argValues: (readonly any[])[] = []
  const argLimits: (number | null)[] = []
  const argsCount = argsNames.length
  for (let argIndex = 0; argIndex < argsCount; argIndex++) {
    const argName = argsNames[argIndex]
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
    includeErrorVariant,
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

  // This reduces performance on the hot path,
  // but no better solution comes to mind.
  // This situation only occurs when user modifies template between test runs,
  // and saved error falls outside the new template bounds.
  let valuesWithExtra: any[] | null = null
  const extraCount = extra.length
  for (let extraIndex = 0; extraIndex < extraCount; extraIndex++) {
    const extraValue = extra[extraIndex]
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
  const valuesCount = state.argValues[argIndex].length
  const argLimit = state.argLimits[argIndex]
  if (argLimit == null) {
    return valuesCount - 1
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
    return Math.min(argLimit, valuesCount - 1)
  }
  return valuesCount - 1
}

/** Check if variant navigation is at limit or beyond (lexicographic comparison) */
function isVariantNavigationAtLimit<Args extends Obj>(
  state: VariantNavigationState<Args>,
): boolean {
  const argsCount = state.indexes.length
  for (let argIndex = 0; argIndex < argsCount; argIndex++) {
    const argLimit = state.argLimits[argIndex]
    if (argLimit == null) {
      return false
    }
    const index = state.indexes[argIndex]
    if (index > argLimit) {
      // Beyond limit in this arg - lexicographically beyond
      return true
    }
    if (index < argLimit) {
      // Below limit in this arg - lexicographically below
      return false
    }
    // index === argLimit - continue to next arg
  }
  // All args exactly at their limits
  return !state.includeErrorVariant
}

/** Reset variant navigation to initial state; variant position will be undefined */
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

/** Advance to next variant in cartesian product; returns true if successful */
export function advanceVariantNavigation<Args extends Obj>(
  state: VariantNavigationState<Args>,
): boolean {
  let isInitial = false
  let initComplete = true
  // First initialize argValues to first values if not yet done
  const argsCount = state.indexes.length
  // Arguments after belowMaxIndex can use full range since we're lexicographically below the limit.
  let belowMaxIndex = argsCount
  for (let argIndex = 0; argIndex < argsCount; argIndex++) {
    if (state.argValues[argIndex] == null) {
      isInitial = true
      state.argValues[argIndex] = calcArgValues(
        state,
        state.argsNames[argIndex],
      )
      const maxIndex = getArgValueMaxIndex(
        state,
        argIndex,
        argIndex > belowMaxIndex,
      )
      if (maxIndex < 0) {
        // No valid values for this arg with current combination of previous args.
        // Mark init as incomplete and let the increment section backtrack.
        initComplete = false
        state.indexes[argIndex] = -1
        break
      }
      state.indexes[argIndex] = 0
      state.args[state.argsNames[argIndex]] = state.argValues[argIndex][0]
      if (belowMaxIndex === argsCount && state.indexes[argIndex] < maxIndex) {
        belowMaxIndex = argIndex
      }
    } else if (belowMaxIndex === argsCount) {
      const maxIndex = getArgValueMaxIndex(state, argIndex, false)
      if (state.indexes[argIndex] < maxIndex) {
        belowMaxIndex = argIndex
      }
    }
  }
  if (isVariantNavigationAtLimit(state)) {
    resetVariantNavigation(state)
    return false
  }
  if (isInitial && initComplete) {
    return true
  }

  for (let argIndex = argsCount - 1; argIndex >= 0; argIndex--) {
    // Skip args that weren't initialized (occurs when init failed partway through)
    if (state.argValues[argIndex] == null) {
      continue
    }
    let belowMax = argIndex > belowMaxIndex
    const maxIndex = getArgValueMaxIndex(state, argIndex, belowMax)

    const valueIndex = state.indexes[argIndex] + 1

    if (valueIndex <= maxIndex) {
      state.indexes[argIndex] = valueIndex
      state.args[state.argsNames[argIndex]] =
        state.argValues[argIndex][valueIndex]

      if (valueIndex < maxIndex) {
        belowMax = true
      }

      // Clear subsequent state.argsNames from args before calculating their template values
      for (let i = argIndex + 1; i < argsCount; i++) {
        // high performance alternative to delete property
        state.args[state.argsNames[i]] = void 0 as any
      }

      for (argIndex++; argIndex < argsCount; argIndex++) {
        state.argValues[argIndex] = calcArgValues(
          state,
          state.argsNames[argIndex],
        )
        const maxIndex = getArgValueMaxIndex(state, argIndex, belowMax)
        if (maxIndex < 0) {
          break
        }
        state.indexes[argIndex] = 0
        state.args[state.argsNames[argIndex]] = state.argValues[argIndex][0]
        if (maxIndex > 0) {
          belowMax = true
        }
      }
      if (argIndex >= argsCount) {
        if (isVariantNavigationAtLimit(state)) {
          resetVariantNavigation(state)
          return false
        }
        return true
      }
    }
  }

  resetVariantNavigation(state)
  return false
}

/** Retreat to previous variant (decrement with borrow); returns true if successful */
export function retreatVariantNavigation<Args extends Obj>(
  state: VariantNavigationState<Args>,
): boolean {
  if (isVariantNavigationAtLimit(state)) {
    // Если лимит стал меньше текущей позиции и мы двигаемся назад,
    // то мы должны начать с последнего валидного варианта, вместо возврата false.
    // А этого проще всего добиться сбросом состояния навигации и последующим продвижением назад.
    resetVariantNavigation(state)
  }

  let isInitial = false
  let initComplete = true
  // First initialize argValues to last values if not yet done
  const argsCount = state.indexes.length
  // Arguments after belowMaxIndex can use full range since we're lexicographically below the limit.
  let belowMaxIndex = argsCount
  for (let argIndex = 0; argIndex < argsCount; argIndex++) {
    if (state.argValues[argIndex] == null) {
      isInitial = true
      state.argValues[argIndex] = calcArgValues(
        state,
        state.argsNames[argIndex],
      )
      const maxIndex = getArgValueMaxIndex(
        state,
        argIndex,
        argIndex > belowMaxIndex,
      )
      if (maxIndex < 0) {
        // No valid values for this arg with current combination of previous args.
        // Mark init as incomplete and let the decrement section backtrack.
        initComplete = false
        state.indexes[argIndex] = -1
        break
      }
      state.indexes[argIndex] = maxIndex
      state.args[state.argsNames[argIndex]] =
        state.argValues[argIndex][maxIndex]
      if (belowMaxIndex === argsCount && state.indexes[argIndex] < maxIndex) {
        belowMaxIndex = argIndex
      }
    } else if (belowMaxIndex === argsCount) {
      const maxIndex = getArgValueMaxIndex(state, argIndex, false)
      if (state.indexes[argIndex] < maxIndex) {
        belowMaxIndex = argIndex
      }
    }
  }
  if (isInitial && initComplete && !isVariantNavigationAtLimit(state)) {
    return true
  }

  for (let argIndex = argsCount - 1; argIndex >= 0; argIndex--) {
    // Skip args that weren't initialized (occurs when init failed partway through)
    if (state.argValues[argIndex] == null) {
      continue
    }
    let belowMax = argIndex > belowMaxIndex
    const maxIndex = getArgValueMaxIndex(state, argIndex, belowMax)

    const valueIndex = state.indexes[argIndex] - 1

    if (valueIndex >= 0) {
      state.indexes[argIndex] = valueIndex
      state.args[state.argsNames[argIndex]] =
        state.argValues[argIndex][valueIndex]

      if (valueIndex < maxIndex) {
        belowMax = true
      }

      // Clear subsequent state.argsNames from args before calculating their template values
      for (let i = argIndex + 1; i < argsCount; i++) {
        // high performance alternative to delete property
        state.args[state.argsNames[i]] = void 0 as any
      }

      for (argIndex++; argIndex < argsCount; argIndex++) {
        state.argValues[argIndex] = calcArgValues(
          state,
          state.argsNames[argIndex],
        )
        const maxIndex = getArgValueMaxIndex(state, argIndex, belowMax)
        if (maxIndex < 0) {
          break
        }
        state.indexes[argIndex] = maxIndex
        state.args[state.argsNames[argIndex]] =
          state.argValues[argIndex][maxIndex]
        if (maxIndex > 0) {
          belowMax = true
        }
      }
      if (argIndex >= argsCount) {
        return true
      }
    }
  }

  resetVariantNavigation(state)
  return false
}

/** Random pick within limits; returns true if successful */
export function randomVariantNavigation<Args extends Obj>(
  state: VariantNavigationState<Args>,
): boolean {
  const argsCount = state.indexes.length
  let belowMax = false
  for (let argIndex = 0; argIndex < argsCount; argIndex++) {
    // Always recalculate argValues since random picks different previous arg values each time
    state.argValues[argIndex] = calcArgValues(state, state.argsNames[argIndex])
    const maxIndex = getArgValueMaxIndex(state, argIndex, belowMax)
    if (maxIndex < 0) {
      resetVariantNavigation(state)
      return false
    }
    state.indexes[argIndex] = Math.floor(Math.random() * (maxIndex + 1))
    state.args[state.argsNames[argIndex]] =
      state.argValues[argIndex][state.indexes[argIndex]]
    if (state.indexes[argIndex] < maxIndex) {
      belowMax = true
    }
  }

  if (isVariantNavigationAtLimit(state)) {
    return retreatVariantNavigation(state)
  }

  return true
}
