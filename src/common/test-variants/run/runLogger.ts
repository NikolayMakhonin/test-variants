import type { RequiredNonNullable, Obj } from '@flemist/simple-utils'
import type {
  TestVariantsLogOptions,
  ModeConfig,
} from 'src/common/test-variants/types'
import type { RunContext } from './RunContext'
import { formatBytes, formatDuration, formatModeConfig } from '../log/format'
import { getMemoryUsage } from '../log/getMemoryUsage'

/** Log test run start */
export function logStart(
  logOptions: RequiredNonNullable<TestVariantsLogOptions>,
  startMemory: number | null,
): void {
  if (!logOptions.start) {
    return
  }
  let msg = `[test-variants] start`
  if (startMemory != null) {
    msg += `, memory: ${formatBytes(startMemory)}`
  }
  logOptions.func('start', msg)
}

/** Log test run completion */
export function logCompleted<Args extends Obj>(
  runContext: RunContext<Args>,
): void {
  const { options, state } = runContext
  const { logOptions, timeController } = options

  if (!logOptions.completed) {
    return
  }
  const totalElapsed = timeController.now() - state.startTime
  let logMsg = `[test-variants] end, tests: ${state.tests} (${formatDuration(totalElapsed)}), async: ${state.iterationsAsync}`
  if (state.startMemory != null) {
    const memory = getMemoryUsage()
    if (memory != null) {
      const diff = memory - state.startMemory
      logMsg += `, memory: ${formatBytes(memory)} (${diff >= 0 ? '+' : ''}${formatBytes(diff)})`
    }
  }
  logOptions.func('completed', logMsg)
}

/** Log mode change */
export function logModeChange(
  logOptions: RequiredNonNullable<TestVariantsLogOptions>,
  modeConfig: ModeConfig | null,
  modeIndex: number,
): void {
  if (!logOptions.modeChange) {
    return
  }
  logOptions.func(
    'modeChange',
    `[test-variants] ${formatModeConfig(modeConfig, modeIndex)}`,
  )
}

/** Log progress */
export function logProgress<Args extends Obj>(
  runContext: RunContext<Args>,
): void {
  const { options, variantsIterator, state } = runContext
  const { logOptions, timeController, findBestError } = options
  const now = timeController.now()

  if (!logOptions.progress || now - state.prevLogTime < logOptions.progress) {
    return
  }

  // Log mode change together with progress when mode changed
  if (state.modeChanged) {
    logModeChange(
      logOptions,
      variantsIterator.modeConfig,
      variantsIterator.modeIndex,
    )
    state.modeChanged = false
  }

  let logMsg = '[test-variants] '
  const cycleElapsed = now - state.cycleStartTime
  const totalElapsed = now - state.startTime

  if (findBestError) {
    logMsg += `cycle: ${variantsIterator.cycleIndex}, variant: ${variantsIterator.index}`
    let max = variantsIterator.count
    if (max != null) {
      if (
        state.prevCycleVariantsCount != null &&
        state.prevCycleVariantsCount < max
      ) {
        max = state.prevCycleVariantsCount
      }
    }
    if (max != null) {
      let estimatedCycleTime: number
      if (
        state.prevCycleDuration != null &&
        state.prevCycleVariantsCount != null &&
        variantsIterator.index < state.prevCycleVariantsCount &&
        cycleElapsed < state.prevCycleDuration
      ) {
        const adjustedDuration = state.prevCycleDuration - cycleElapsed
        const adjustedCount =
          state.prevCycleVariantsCount - variantsIterator.index
        const speedForRemaining = adjustedDuration / adjustedCount
        const remainingTime = (max - variantsIterator.index) * speedForRemaining
        estimatedCycleTime = cycleElapsed + remainingTime
      } else if (variantsIterator.index > 0) {
        estimatedCycleTime = (cycleElapsed * max) / variantsIterator.index
      } else {
        estimatedCycleTime = 0
      }
      logMsg += `/${max} (${formatDuration(cycleElapsed)}/${formatDuration(estimatedCycleTime)})`
    } else {
      logMsg += ` (${formatDuration(cycleElapsed)})`
    }
  } else {
    logMsg += `variant: ${variantsIterator.index} (${formatDuration(cycleElapsed)})`
  }

  logMsg += `, tests: ${state.tests} (${formatDuration(totalElapsed)}), async: ${state.iterationsAsync}`

  if (state.prevLogMemory != null) {
    const memory = getMemoryUsage()
    if (memory != null) {
      const diff = memory - state.prevLogMemory
      logMsg += `, memory: ${formatBytes(memory)} (${diff >= 0 ? '+' : ''}${formatBytes(diff)})`
      state.prevLogMemory = memory
    }
  }

  logOptions.func('progress', logMsg)
  state.prevLogTime = now
}
