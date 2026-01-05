import type { RequiredNonNullable, Obj } from '@flemist/simple-utils'
import type {
  TestVariantsLogOptions,
  ModeConfig,
} from 'src/common/test-variants/types'
import type { RunContext } from './RunContext'
import { formatBytes, formatDuration, formatModeConfig } from '../log/format'
import { getMemoryUsage } from '../log/getMemoryUsage'

function formatMemoryDiff(current: number, previous: number): string {
  const diff = current - previous
  const sign = diff >= 0 ? '+' : ''
  return `${formatBytes(current)} (${sign}${formatBytes(diff)})`
}

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

export function logCompleted(runContext: RunContext<Obj>): void {
  const { options, state } = runContext
  const { logOptions, timeController } = options

  if (!logOptions.completed) {
    return
  }

  const totalElapsed = timeController.now() - state.startTime
  let msg = `[test-variants] end, tests: ${state.tests} (${formatDuration(totalElapsed)}), async: ${state.iterationsAsync}`

  if (state.startMemory != null) {
    const memory = getMemoryUsage()
    if (memory != null) {
      msg += `, memory: ${formatMemoryDiff(memory, state.startMemory)}`
    }
  }

  logOptions.func('completed', msg)
}

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

function calcEstimatedCycleTime(
  cycleElapsed: number,
  index: number,
  max: number,
  prevCycleDuration: number | null,
  prevCycleVariantsCount: number | null,
): number {
  if (index <= 0) {
    return 0
  }

  const canUseAdjusted =
    prevCycleDuration != null &&
    prevCycleVariantsCount != null &&
    index < prevCycleVariantsCount &&
    cycleElapsed < prevCycleDuration

  if (canUseAdjusted) {
    const adjustedDuration = prevCycleDuration! - cycleElapsed
    const adjustedCount = prevCycleVariantsCount! - index
    const speedForRemaining = adjustedDuration / adjustedCount
    const remainingTime = (max - index) * speedForRemaining
    return cycleElapsed + remainingTime
  }

  return (cycleElapsed * max) / index
}

export function logProgress(runContext: RunContext<Obj>): void {
  const { options, variantsIterator, state } = runContext
  const { logOptions, timeController, findBestError } = options
  const now = timeController.now()

  if (!logOptions.progress || now - state.prevLogTime < logOptions.progress) {
    return
  }

  if (state.modeChanged) {
    logModeChange(
      logOptions,
      variantsIterator.modeConfig,
      variantsIterator.modeIndex,
    )
    state.modeChanged = false
  }

  const cycleElapsed = now - state.cycleStartTime
  const totalElapsed = now - state.startTime
  let msg = '[test-variants] '

  if (findBestError) {
    msg += `cycle: ${variantsIterator.cycleIndex}, variant: ${variantsIterator.index}`
    let max = variantsIterator.count
    if (
      max != null &&
      state.prevCycleVariantsCount != null &&
      state.prevCycleVariantsCount < max
    ) {
      max = state.prevCycleVariantsCount
    }
    if (max != null) {
      const estimated = calcEstimatedCycleTime(
        cycleElapsed,
        variantsIterator.index,
        max,
        state.prevCycleDuration,
        state.prevCycleVariantsCount,
      )
      msg += `/${max} (${formatDuration(cycleElapsed)}/${formatDuration(estimated)})`
    } else {
      msg += ` (${formatDuration(cycleElapsed)})`
    }
  } else {
    msg += `variant: ${variantsIterator.index} (${formatDuration(cycleElapsed)})`
  }

  msg += `, tests: ${state.tests} (${formatDuration(totalElapsed)}), async: ${state.iterationsAsync}`

  if (state.prevLogMemory != null) {
    const memory = getMemoryUsage()
    if (memory != null) {
      msg += `, memory: ${formatMemoryDiff(memory, state.prevLogMemory)}`
      state.prevLogMemory = memory
    }
  }

  logOptions.func('progress', msg)
  state.prevLogTime = now
}
