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

  if (errorVariantIndex != null) {
    return [1, LIMIT_MAX]
  }

  const completionCount = runOptions.cycles ?? 1

  // Check if any sequential modes exist in config
  let hasSequentialModes = false
  for (let i = 0, len = modes.length; i < len; i++) {
    if (modes[i].mode === 'forward' || modes[i].mode === 'backward') {
      hasSequentialModes = true
      break
    }
  }

  // Check if any mode is alive from start
  let hasAnyAliveMode = false
  let hasAliveSequentialMode = false
  for (let i = 0, len = modes.length; i < len; i++) {
    const mode = modes[i]
    if (mode.limitTests != null && mode.limitTests <= 0) {
      continue
    }
    if (mode.limitTime != null && mode.limitTime <= 0) {
      continue
    }
    const isSequential = mode.mode === 'forward' || mode.mode === 'backward'
    if (isSequential) {
      if (mode.cycles != null && mode.cycles <= 0) {
        continue
      }
      if (mode.attemptsPerVariant != null && mode.attemptsPerVariant <= 0) {
        continue
      }
      hasAliveSequentialMode = true
    }
    hasAnyAliveMode = true
  }

  // If no modes are alive, stops immediately after initialize
  if (!hasAnyAliveMode) {
    return [1, 1]
  }

  // With any sequential modes in config and cycles=0: stops immediately after initialize
  if (hasSequentialModes && completionCount <= 0) {
    return [1, 1]
  }

  // Sequential modes exist in config but all are dead: stops at initialize
  if (hasSequentialModes && !hasAliveSequentialMode) {
    return [1, 1]
  }

  // When variantsCount=0 or no tests will run
  if (variantsCount === 0 || callCountRange[1] === 0) {
    // Even with 0 variants, mode cycles still complete and trigger mode changes
    // Each completion cycles through all modes, each mode entry triggers mode change
    // For random-only modes, at least one modes pass happens regardless of completionCount
    const effectiveCompletions = hasSequentialModes ? completionCount : 1
    // modeChanges = 1 (initial) + effectiveCompletions * modesCount
    return [1, 1 + effectiveCompletions * modesCount]
  }

  let hasTimeLimits = runOptions.limitTime != null

  let hasActiveSequentialMode = false
  let hasActiveRandomMode = false

  const testsPerTurnList: number[] = []
  let maxTurnsPerCompletion: number | null = null

  for (let i = 0, len = modes.length; i < len; i++) {
    const mode = modes[i]
    if (
      (mode.limitTests != null && mode.limitTests <= 0) ||
      (mode.limitTime != null && mode.limitTime <= 0)
    ) {
      testsPerTurnList.push(0)
      continue
    }

    switch (mode.mode) {
      case 'forward':
      case 'backward': {
        const modeCycles = mode.cycles ?? 1
        const attempts = mode.attemptsPerVariant ?? 1
        if (modeCycles <= 0 || attempts <= 0) {
          testsPerTurnList.push(0)
          continue
        }
        const testsPerCompletion = variantsCount * modeCycles * attempts
        const testsPerTurn = min(
          testsPerCompletion,
          mode.limitTests ?? LIMIT_MAX,
        )
        testsPerTurnList.push(testsPerTurn)
        let turnsForThisMode = Math.ceil(testsPerCompletion / testsPerTurn)
        // Add +1 when limitTests exactly divides testsPerCompletion
        // because the last production turn fills up, leaving no room to detect cycle completion
        if (
          mode.limitTests != null &&
          mode.limitTests <= testsPerCompletion &&
          testsPerCompletion % mode.limitTests === 0
        ) {
          turnsForThisMode++
        }
        maxTurnsPerCompletion = max(maxTurnsPerCompletion, turnsForThisMode)
        if (testsPerCompletion > 0) {
          hasActiveSequentialMode = true
        }
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

  if (!hasActiveSequentialMode && !hasActiveRandomMode) {
    return [1, 1]
  }

  // Calculate mode changes based on modes passes
  // Mode change happens when entering a mode (initial + each mode switch)
  // modeChanges = 1 + (completeModesPasses × modesCount)

  let _min = 1
  let _max = 1

  if (hasActiveSequentialMode && maxTurnsPerCompletion != null) {
    // Sequential modes control termination via completionCount
    // Each turn triggers a mode switch, modeChanges = 1 + (turns × modesCount)
    if (modesCount === 1) {
      // Single mode: each turn triggers mode switch (wrap to self)
      // modeChanges = 1 (initial) + maxTurnsPerCompletion * completionCount
      _min = 1
      _max = 1 + maxTurnsPerCompletion * completionCount
    } else {
      // Multiple modes: add buffer for interleaving variations
      const minModesPasses =
        Math.floor(maxTurnsPerCompletion / 2) * completionCount
      const maxModesPasses = maxTurnsPerCompletion * (completionCount + 2)

      _min = max(1, 1 + minModesPasses * modesCount)
      _max = max(1, 1 + maxModesPasses * modesCount)
    }
  } else if (hasActiveRandomMode) {
    // Only random modes: estimate based on callCount and testsPerModesPass
    // modeChanges = modesPasses * modesCount (each modesPass starts with mode entry)
    const testsPerModesPass = testsPerTurnList.reduce((sum, t) => sum + t, 0)
    if (testsPerModesPass > 0) {
      const minModesPasses =
        callCountRange[0] > 0
          ? Math.floor(callCountRange[0] / testsPerModesPass)
          : 0
      const maxModesPasses =
        callCountRange[1] > 0
          ? Math.ceil(callCountRange[1] / testsPerModesPass)
          : 0

      _min = max(1, minModesPasses * modesCount)
      // +1 buffer for partial modesPass edge cases
      _max = max(1, (maxModesPasses + 1) * modesCount)
    }
  }

  // Apply global limitTests constraint
  if (runOptions.limitTests != null && runOptions.limitTests > 0) {
    // Global limitTests can cause early termination at any point
    _min = 1
    const testsPerModesPass = testsPerTurnList.reduce((sum, t) => sum + t, 0)
    if (testsPerModesPass > 0) {
      const maxModesPassesByLimit =
        Math.ceil(runOptions.limitTests / testsPerModesPass) + 1
      _max = min(_max, 1 + maxModesPassesByLimit * modesCount)
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
