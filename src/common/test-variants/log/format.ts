import type { ModeConfig } from 'src/common/test-variants/types'
import { getMemoryUsage } from './getMemoryUsage'

/** Format duration in human-readable form */
export function formatDuration(ms: number): string {
  const seconds = ms / 1000
  if (seconds < 0.1) {
    return `${seconds.toFixed(3)}s`
  }
  if (seconds < 1) {
    return `${seconds.toFixed(2)}s`
  }
  if (seconds < 10) {
    return `${seconds.toFixed(1)}s`
  }
  if (seconds < 60) {
    return `${seconds.toFixed(0)}s`
  }
  const minutes = seconds / 60
  if (minutes < 10) {
    return `${minutes.toFixed(1)}m`
  }
  if (minutes < 60) {
    return `${minutes.toFixed(0)}m`
  }
  const hours = minutes / 60
  if (hours < 10) {
    return `${hours.toFixed(1)}h`
  }
  return `${hours.toFixed(0)}h`
}

/** Format bytes in human-readable form */
export function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) {
    return gb >= 10 ? `${Math.round(gb)}GB` : `${gb.toFixed(1)}GB`
  }
  const mb = bytes / (1024 * 1024)
  if (mb >= 10) {
    return `${Math.round(mb)}MB`
  }
  return `${mb.toFixed(1)}MB`
}

export function formatMemoryDiff(current: number, previous: number): string {
  const diff = current - previous
  const sign = diff >= 0 ? '+' : ''
  return `${formatBytes(current)} (${sign}${formatBytes(diff)})`
}

export type TestStatsResult = {
  message: string
  memory: number | null
}

export function formatTestStats(
  tests: number,
  elapsed: number,
  maxTestDuration: number,
  iterationsAsync: number,
  prevMemory?: null | number,
): TestStatsResult {
  let msg = `tests: ${tests} (${formatDuration(elapsed)}), maxTime: ${formatDuration(maxTestDuration)}, async: ${iterationsAsync}`
  let memory: number | null = null
  if (prevMemory != null) {
    memory = getMemoryUsage()
    if (memory != null) {
      msg += `, memory: ${formatMemoryDiff(memory, prevMemory)}`
    }
  }
  return { message: msg, memory }
}

/** Format mode config for logging */
export function formatModeConfig(
  modeConfig: ModeConfig | null,
  modeIndex: number,
): string {
  if (!modeConfig) {
    return `mode[${modeIndex}]: null`
  }
  let result = `mode[${modeIndex}]: ${modeConfig.mode}`
  if (modeConfig.mode === 'forward' || modeConfig.mode === 'backward') {
    if (modeConfig.cycles != null) {
      result += `, cycles=${modeConfig.cycles}`
    }
    if (modeConfig.attemptsPerVariant != null) {
      result += `, attempts=${modeConfig.attemptsPerVariant}`
    }
  }
  if (modeConfig.limitTime != null) {
    result += `, limitTime=${formatDuration(modeConfig.limitTime)}`
  }
  if (modeConfig.limitTests != null) {
    result += `, limitTests=${modeConfig.limitTests}`
  }
  return result
}
