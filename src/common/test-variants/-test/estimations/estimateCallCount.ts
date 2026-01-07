import type { TestVariantsRunOptions } from 'src/common'
import { max, min, NumberRange } from '@flemist/simple-utils'
import { StressTestArgs, TestArgs } from '../types'
import { LIMIT_MAX, MODES_DEFAULT } from '../constants'

export function estimateCallCount(
  options: StressTestArgs,
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

  let hasSequentialMode = false
  let hasActiveSequentialMode = false
  let hasActiveRandomMode = false

  let hasTimeLimits = runOptions.limitTime != null
  const testsPerTurnList: number[] = []
  let maxTurnsPerCompletion: number | null = null

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
        const testsPerTurn = min(
          testsPerCompletion,
          mode.limitTests ?? LIMIT_MAX,
        )
        testsPerTurnList.push(testsPerTurn)
        maxTurnsPerCompletion = max(
          maxTurnsPerCompletion,
          Math.ceil(testsPerCompletion / testsPerTurn),
        )
        if (testsPerCompletion <= 0) {
          continue
        }
        sumSequentialTestsPerCompletion += testsPerCompletion
        hasActiveSequentialMode = true
        if (mode.limitTime != null) {
          hasTimeLimits = true
        }
        break
      }
      case 'random': {
        hasActiveRandomMode = true
        const testsPerTurn = mode.limitTests ?? LIMIT_MAX
        testsPerTurnList.push(testsPerTurn)
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

  let _min = LIMIT_MAX
  let _max = LIMIT_MAX

  if (!hasActiveSequentialMode && !hasActiveRandomMode) {
    return [0, 0]
  }

  if (hasSequentialMode && !hasActiveSequentialMode) {
    return [0, 0]
  }

  if (testsPerTurnList.length > 0 && maxTurnsPerCompletion != null) {
    const testsPerModesPass = testsPerTurnList.reduce(
      (sum, testsPerTurn) => sum + testsPerTurn,
      0,
    )
    _min = min(
      _min,
      testsPerModesPass * (maxTurnsPerCompletion - 1) * completionCount,
    )
    _max = min(
      _max,
      testsPerModesPass * maxTurnsPerCompletion * (completionCount + 2),
    )
  }

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

  if (options.argType !== 'static' && hasActiveRandomMode) {
    _min = 0
  }

  return [_min, _max]
}
