import type { TestVariantsRunOptions } from 'src/common'
import { max, min, NumberRange } from '@flemist/simple-utils'
import { TestArgs } from '../types'
import { LIMIT_MAX, MODES_DEFAULT } from '../constants'

export function estimateCallCount(
  runOptions: TestVariantsRunOptions<TestArgs>,
  variantsCount: number,
  errorVariantIndex: number | null,
): NumberRange {
  if (variantsCount === 0) {
    return [0, 0]
  }

  let minCompletionCount: number | null = null
  let countActiveModes = 0

  const completionCount = runOptions.cycles ?? 1
  const modes = runOptions.iterationModes ?? MODES_DEFAULT

  for (let i = 0, len = modes.length; i < len; i++) {
    const mode = modes[i]
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
        const tests = variantsCount * modeCycles * attempts * completionCount
        if (tests <= 0) {
          continue
        }
        countActiveModes++
        if (!runOptions.findBestError) {
          minCompletionCount = max(minCompletionCount, tests)
        }
        break
      }
      case 'random':
        countActiveModes++
        break
      default: {
        throw new Error(`Unknown mode type: ${(mode as any).mode}`)
      }
    }
  }

  if (countActiveModes === 0) {
    return [0, 0]
  }

  let _min = min(minCompletionCount ?? 1, runOptions.limitTests)
  let _max = min(
    min(minCompletionCount ?? LIMIT_MAX, LIMIT_MAX),
    runOptions.limitTests,
  )

  if (errorVariantIndex === 0) {
    _max = min(_max, 1)
  }
  if (
    errorVariantIndex != null &&
    errorVariantIndex < variantsCount &&
    !runOptions.findBestError
  ) {
    _max = min(_max, errorVariantIndex + 1)
    _min = _max
  }

  return [_min, _max]
}
