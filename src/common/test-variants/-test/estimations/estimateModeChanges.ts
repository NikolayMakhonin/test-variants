import type { TestVariantsRunOptions } from 'src/common'
import { max, min, NumberRange } from '@flemist/simple-utils'
import { StressTestArgs, TestArgs } from '../types'
import { LIMIT_MAX, MODES_DEFAULT } from '../constants'

export function estimateModeChanges(
  options: StressTestArgs,
  runOptions: TestVariantsRunOptions<TestArgs>,
  variantsCount: number,
  errorVariantIndex: number | null,
  withDelay: boolean,
  callCountRange: NumberRange,
): NumberRange {
  const modes = runOptions.iterationModes ?? MODES_DEFAULT
  const modesCount = modes.length

  if (modesCount === 0) {
    return [0, 0]
  }

  if (variantsCount === 0) {
    return [1, 1]
  }

  if (errorVariantIndex != null) {
    return [1, LIMIT_MAX]
  }

  let hasTimeLimits = runOptions.limitTime != null

  let hasActiveSequentialMode = false
  let hasActiveRandomMode = false

  const testsPerModeList: number[] = []

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
        const testsPerModeCycle = variantsCount * attempts
        const testsPerMode = testsPerModeCycle * modeCycles
        const testsPerModeTurn = min(testsPerMode, mode.limitTests ?? LIMIT_MAX)
        testsPerModeList.push(testsPerModeTurn)
        if (testsPerMode > 0) {
          hasActiveSequentialMode = true
        }
        if (mode.limitTime != null) {
          hasTimeLimits = true
        }
        break
      }
      case 'random': {
        hasActiveRandomMode = true
        const testsPerModeTurn = mode.limitTests ?? LIMIT_MAX
        testsPerModeList.push(testsPerModeTurn)
        if (mode.limitTime != null) {
          hasTimeLimits = true
        }
        break
      }
      default: {
        throw new Error(`Unknown mode type: ${(mode as any).mode}`)
      }
    }
  }

  if (!hasActiveSequentialMode && !hasActiveRandomMode) {
    return [1, 1]
  }

  const completionCount = runOptions.cycles ?? 1

  let _min = 1
  let _max = 1

  if (modesCount === 1) {
    _min = 1
    _max = 1
  } else {
    const testsPerModesPass = testsPerModeList.reduce(
      (sum, testsPerMode) => sum + testsPerMode,
      0,
    )

    if (testsPerModesPass > 0) {
      const minModesPassCount = Math.floor(
        callCountRange[0] / testsPerModesPass,
      )
      const maxModesPassCount = Math.ceil(callCountRange[1] / testsPerModesPass)

      _min = max(1, 1 + minModesPassCount * modesCount - (modesCount - 1))
      _max = max(
        1,
        1 + maxModesPassCount * modesCount * (completionCount + 2) + modesCount,
      )
    }
  }

  _min = min(_min, LIMIT_MAX)
  _max = min(_max, LIMIT_MAX)

  if (_min > _max) {
    throw new Error(
      `Inconsistent estimation results: min (${_min}) > max (${_max})`,
    )
  }

  if (withDelay && hasTimeLimits) {
    _min = 1
  }

  if (options.argType !== 'static' && hasActiveRandomMode) {
    _min = 1
  }

  return [_min, _max]
}
