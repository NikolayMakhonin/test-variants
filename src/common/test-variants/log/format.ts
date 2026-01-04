import type { ModeConfig } from 'src/common/test-variants/types'

/** Format duration in human-readable form */
export function formatDuration(ms: number): string {
  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  const minutes = seconds / 60
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`
  }
  const hours = minutes / 60
  return `${hours.toFixed(1)}h`
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
