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

function estimateCycleTime(
  elapsed: number,
  current: number,
  total: number,
  prevDuration: number | null,
  prevCount: number | null,
): number {
  if (current <= 0) {
    return 0
  }

  // Use previous cycle data when available and current progress is within bounds
  if (
    prevDuration != null &&
    prevCount != null &&
    current < prevCount &&
    elapsed < prevDuration
  ) {
    const remainingCount = prevCount - current
    const remainingTime = prevDuration - elapsed
    const timePerVariant = remainingTime / remainingCount
    return elapsed + (total - current) * timePerVariant
  }

  // Linear extrapolation from current progress
  return (elapsed * total) / current
}

function formatVariantProgress(runContext: RunContext<Obj>): string {
  const { options, variantsIterator, state } = runContext
  const { findBestError, timeController } = options
  const elapsed = timeController.now() - state.cycleStartTime

  if (!findBestError) {
    return `variant: ${variantsIterator.index} (${formatDuration(elapsed)})`
  }

  const prefix = `cycle: ${variantsIterator.cycleIndex}, variant: ${variantsIterator.index}`

  let total = variantsIterator.count
  if (total != null && state.prevCycleVariantsCount != null) {
    total = Math.min(total, state.prevCycleVariantsCount)
  }

  if (total == null) {
    return `${prefix} (${formatDuration(elapsed)})`
  }

  const estimated = estimateCycleTime(
    elapsed,
    variantsIterator.index,
    total,
    state.prevCycleDuration,
    state.prevCycleVariantsCount,
  )

  return `${prefix}/${total} (${formatDuration(elapsed)}/${formatDuration(estimated)})`
}

/** Returns true if logging was performed */
export function logProgress(runContext: RunContext<Obj>): boolean {
  const { options, variantsIterator, state } = runContext
  const { logOptions, timeController } = options
  const now = timeController.now()

  if (!logOptions.progress || now - state.prevLogTime < logOptions.progress) {
    return false
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

  return true
}
