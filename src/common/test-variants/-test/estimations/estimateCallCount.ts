import type { TestVariantsRunOptions } from 'src/common'
import { min, NumberRange } from '@flemist/simple-utils'
import { TestArgs } from '../types'
import { LIMIT_MAX, MODES_DEFAULT } from '../constants'

export function estimateCallCount(
  runOptions: TestVariantsRunOptions<TestArgs>,
  variantsCount: number,
  errorVariantIndex: number | null,
  withDelay: boolean,
): NumberRange {
  if (variantsCount === 0) {
    return [0, 0]
  }

  if (errorVariantIndex != null) {
    return [0, LIMIT_MAX]
  }

  let sumSequentialTestsPerCompletion = 0

  let countActiveSequentialModes = 0
  let hasSequentialMode = false
  let countActiveRandomModes = 0
  let countRandomTests = 0
  let hasTimeLimits = runOptions.limitTime != null

  const completionCount = runOptions.cycles ?? 1
  const modes = runOptions.iterationModes ?? MODES_DEFAULT

  for (let i = 0, len = modes.length; i < len; i++) {
    const mode = modes[i]
    if (mode.mode === 'forward' || mode.mode === 'backward') {
      hasSequentialMode = true
    }
    if (
      (mode.limitTests != null && mode.limitTests <= 0) ||
      (mode.limitTime != null && mode.limitTime <= 0)
    ) {
      continue
    }
    switch (mode.mode) {
      case 'forward':
      case 'backward': {
        const modeCycles = mode.cycles ?? 1
        const attempts = mode.attemptsPerVariant ?? 1
        const testsPerCompletion = variantsCount * modeCycles * attempts
        if (testsPerCompletion <= 0) {
          continue
        }
        sumSequentialTestsPerCompletion += testsPerCompletion
        countActiveSequentialModes++
        if (mode.limitTime != null) {
          hasTimeLimits = true
        }
        break
      }
      case 'random':
        countActiveRandomModes++
        countRandomTests += mode.limitTests ?? LIMIT_MAX
        if (mode.limitTime != null) {
          hasTimeLimits = true
        }
        break
      default: {
        throw new Error(`Unknown mode type: ${(mode as any).mode}`)
      }
    }
  }

  if (hasSequentialMode) {
    if (countActiveSequentialModes === 0) {
      return [0, 0]
    }
    if (countActiveRandomModes > 0 && completionCount > 0) {
      return [countRandomTests, countRandomTests]
    }
  } else if (countActiveRandomModes === 0) {
    return [0, 0]
  }

  let _min =
    sumSequentialTestsPerCompletion > 0
      ? sumSequentialTestsPerCompletion * completionCount
      : hasSequentialMode
        ? 1
        : (runOptions.limitTests ?? 1)
  let _max =
    sumSequentialTestsPerCompletion > 0
      ? sumSequentialTestsPerCompletion * (completionCount + 1)
      : LIMIT_MAX
  _min = min(min(_min, LIMIT_MAX), runOptions.limitTests)
  _max = min(min(_max, LIMIT_MAX), runOptions.limitTests)

  if (_min > _max) {
    throw new Error(
      `Inconsistent estimation results: min (${_min}) > max (${_max})`,
    )
  }

  if (withDelay && hasTimeLimits) {
    _min = 0
  }

  return [_min, _max]
}
