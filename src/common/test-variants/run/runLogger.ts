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

  // Use previous cycle data if available and current progress is within previous bounds
  if (
    prevCycleDuration != null &&
    prevCycleVariantsCount != null &&
    index < prevCycleVariantsCount &&
    cycleElapsed < prevCycleDuration
  ) {
    const remainingCount = prevCycleVariantsCount - index
    const remainingDuration = prevCycleDuration - cycleElapsed
    const speedPerVariant = remainingDuration / remainingCount
    return cycleElapsed + (max - index) * speedPerVariant
  }

  return (cycleElapsed * max) / index
}

function formatVariantProgress(runContext: RunContext<Obj>): string {
  const { options, variantsIterator, state } = runContext
  const { findBestError, timeController } = options
  const cycleElapsed = timeController.now() - state.cycleStartTime

  if (!findBestError) {
    return `variant: ${variantsIterator.index} (${formatDuration(cycleElapsed)})`
  }

  const msg = `cycle: ${variantsIterator.cycleIndex}, variant: ${variantsIterator.index}`

  let max = variantsIterator.count
  if (max != null && state.prevCycleVariantsCount != null) {
    max = Math.min(max, state.prevCycleVariantsCount)
  }

  if (max == null) {
    return msg + ` (${formatDuration(cycleElapsed)})`
  }

  const estimated = calcEstimatedCycleTime(
    cycleElapsed,
    variantsIterator.index,
    max,
    state.prevCycleDuration,
    state.prevCycleVariantsCount,
  )
  return (
    msg +
    `/${max} (${formatDuration(cycleElapsed)}/${formatDuration(estimated)})`
  )
}

export function logProgress(runContext: RunContext<Obj>): void {
  const { options, variantsIterator, state } = runContext
  const { logOptions, timeController } = options
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

  const totalElapsed = now - state.startTime
  let msg = `[test-variants] ${formatVariantProgress(runContext)}`
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
