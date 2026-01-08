import type { RequiredNonNullable } from '@flemist/simple-utils'
import { formatBytes, formatDuration, formatModeConfig } from '../log/format'
import { getMemoryUsage } from '../log/getMemoryUsage'
import type { TestVariantsLogOptions } from '../types'
import type { RunContext } from './RunContext'

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

export function logCompleted(runContext: RunContext<any>): void {
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

/** Log pending mode change and clear it */
export function logModeChange(runContext: RunContext<any>): void {
  const { options, state } = runContext
  const { logOptions } = options
  const event = state.pendingModeChange

  if (!logOptions.modeChange || event == null) {
    return
  }

  logOptions.func(
    'modeChange',
    `[test-variants] ${formatModeConfig(event.mode, event.modeIndex)}`,
  )
  state.pendingModeChange = null
}

/**
 * Estimates total cycle time based on current progress.
 * Uses previous cycle data when available for more accurate estimation.
 */
function estimateCycleTime(
  elapsedTime: number,
  completedVariants: number,
  totalVariants: number,
  prevCycleDuration: number | null,
  prevCycleVariants: number | null,
): number {
  if (completedVariants <= 0) {
    return 0
  }

  // Use previous cycle data when current progress is within previous cycle bounds
  const hasPrevCycleData =
    prevCycleDuration != null && prevCycleVariants != null
  const isWithinPrevBounds =
    hasPrevCycleData &&
    completedVariants < prevCycleVariants &&
    elapsedTime < prevCycleDuration
  if (isWithinPrevBounds) {
    const remainingVariants = prevCycleVariants - completedVariants
    const remainingTime = prevCycleDuration - elapsedTime
    const timePerVariant = remainingTime / remainingVariants
    return elapsedTime + (totalVariants - completedVariants) * timePerVariant
  }

  // Linear extrapolation from current progress
  return (elapsedTime * totalVariants) / completedVariants
}

// function formatVariantProgress(runContext: RunContext<any>): string {
//   const { options, variantsIterator, state } = runContext
//   const { findBestError, timeController } = options
//   const elapsedTime = timeController.now() - state.cycleStartTime
//   const elapsedStr = formatDuration(elapsedTime)
//
//   if (!findBestError) {
//     return `variant: ${variantsIterator.index} (${elapsedStr})`
//   }
//
//   const prefix = `cycle: ${variantsIterator.cycleIndex}, variant: ${variantsIterator.index}`
//   const totalVariants =
//     variantsIterator.index >= 0 && state.prevCycleVariantsCount != null
//       ? Math.min(variantsIterator.index + 1, state.prevCycleVariantsCount)
//       : variantsIterator.index + 1
//
//   if (totalVariants == null) {
//     return `${prefix} (${elapsedStr})`
//   }
//
//   const estimatedTime = estimateCycleTime(
//     elapsedTime,
//     variantsIterator.index,
//     totalVariants,
//     state.prevCycleDuration,
//     state.prevCycleVariantsCount,
//   )
//
//   return `${prefix}/${totalVariants} (${elapsedStr}/${formatDuration(estimatedTime)})`
// }

/** Returns true if logging was performed */
export function logProgress(runContext: RunContext<any>): boolean {
  const { options, state } = runContext
  const { logOptions, timeController } = options
  const now = timeController.now()

  if (!logOptions.progress || now - state.prevLogTime < logOptions.progress) {
    return false
  }

  // Log pending mode change together with progress
  logModeChange(runContext)

  const totalElapsed = now - state.startTime
  // let msg = `[test-variants] ${formatVariantProgress(runContext)}`
  let msg = `[test-variants] tests: ${state.tests} (${formatDuration(totalElapsed)}), async: ${state.iterationsAsync}`

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
