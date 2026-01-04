import type { RequiredNonNullable, Obj } from '@flemist/simple-utils'
import type { ITimeController } from '@flemist/time-controller'
import type {
  TestVariantsLogOptions,
  TestVariantsIterator,
  ModeConfig,
} from 'src/common/test-variants/types'
import type { TestVariantsRunState } from 'src/common/test-variants/run/createRunState'
import { formatBytes, formatDuration, formatModeConfig } from './format'
import { getMemoryUsage } from './getMemoryUsage'

export type RunLoggerDeps = {
  logOpts: RequiredNonNullable<TestVariantsLogOptions>
  timeController: ITimeController
  findBestError: boolean
}

/** Log test run start */
export function logStart(
  logOpts: RequiredNonNullable<TestVariantsLogOptions>,
  startMemory: number | null,
): void {
  if (!logOpts.start) {
    return
  }
  let msg = `[test-variants] start`
  if (startMemory != null) {
    msg += `, memory: ${formatBytes(startMemory)}`
  }
  logOpts.func('start', msg)
}

/** Log test run completion */
export function logCompleted(
  logOpts: RequiredNonNullable<TestVariantsLogOptions>,
  timeController: ITimeController,
  state: TestVariantsRunState,
): void {
  if (!logOpts.completed) {
    return
  }
  const totalElapsed = timeController.now() - state.startTime
  let logMsg = `[test-variants] end, tests: ${state.iterations} (${formatDuration(totalElapsed)}), async: ${state.iterationsAsync}`
  if (state.startMemory != null) {
    const memory = getMemoryUsage()
    if (memory != null) {
      const diff = memory - state.startMemory
      logMsg += `, memory: ${formatBytes(memory)} (${diff >= 0 ? '+' : ''}${formatBytes(diff)})`
    }
  }
  logOpts.func('completed', logMsg)
}

/** Log mode change */
export function logModeChange(
  logOpts: RequiredNonNullable<TestVariantsLogOptions>,
  modeConfig: ModeConfig | null,
  modeIndex: number,
): void {
  if (!logOpts.modeChange) {
    return
  }
  logOpts.func(
    'modeChange',
    `[test-variants] ${formatModeConfig(modeConfig, modeIndex)}`,
  )
}

/** Log progress */
export function logProgress<Args extends Obj>(
  deps: RunLoggerDeps,
  state: TestVariantsRunState,
  variants: TestVariantsIterator<Args>,
): void {
  const { logOpts, timeController, findBestError } = deps
  const now = timeController.now()

  // Log mode change together with progress when mode changed
  if (logOpts.modeChange && state.modeChanged) {
    logModeChange(logOpts, variants.modeConfig, variants.modeIndex)
    state.modeChanged = false
  }

  let logMsg = '[test-variants] '
  const cycleElapsed = now - state.cycleStartTime
  const totalElapsed = now - state.startTime

  if (findBestError) {
    logMsg += `cycle: ${variants.cycleIndex}, variant: ${variants.index}`
    let max = variants.count
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
        variants.index < state.prevCycleVariantsCount &&
        cycleElapsed < state.prevCycleDuration
      ) {
        const adjustedDuration = state.prevCycleDuration - cycleElapsed
        const adjustedCount = state.prevCycleVariantsCount - variants.index
        const speedForRemaining = adjustedDuration / adjustedCount
        const remainingTime = (max - variants.index) * speedForRemaining
        estimatedCycleTime = cycleElapsed + remainingTime
      } else {
        estimatedCycleTime = (cycleElapsed * max) / variants.index
      }
      logMsg += `/${max} (${formatDuration(cycleElapsed)}/${formatDuration(estimatedCycleTime)})`
    } else {
      logMsg += ` (${formatDuration(cycleElapsed)})`
    }
  } else {
    logMsg += `variant: ${variants.index} (${formatDuration(cycleElapsed)})`
  }

  logMsg += `, tests: ${state.iterations} (${formatDuration(totalElapsed)}), async: ${state.iterationsAsync}`

  if (state.prevLogMemory != null) {
    const memory = getMemoryUsage()
    if (memory != null) {
      const diff = memory - state.prevLogMemory
      logMsg += `, memory: ${formatBytes(memory)} (${diff >= 0 ? '+' : ''}${formatBytes(diff)})`
      state.prevLogMemory = memory
    }
  }

  logOpts.func('progress', logMsg)
  state.prevLogTime = now
}
