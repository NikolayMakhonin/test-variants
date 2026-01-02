import type {ModeConfig, TestVariantsLogOptions} from 'src/common/test-variants/types'

/** Default log options when logging is enabled */
export const logOptionsDefault: Required<TestVariantsLogOptions> = {
  start           : true,
  progressInterval: 5000,
  completed       : true,
  error           : true,
  modeChange      : true,
  debug           : false,
}

/** Log options when logging is disabled */
export const logOptionsDisabled: TestVariantsLogOptions = {
  start           : false,
  progressInterval: false,
  completed       : false,
  error           : false,
  modeChange      : false,
  debug           : false,
}

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

/** Get current memory usage (Node.js or Chrome) */
export function getMemoryUsage(): number | null {
  // Node.js
  if (typeof process !== 'undefined' && process.memoryUsage) {
    try {
      return process.memoryUsage().heapUsed
    }
    catch {
      // ignore
    }
  }
  // Browser (Chrome only, non-standard)
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    try {
      return (performance as any).memory.usedJSHeapSize
    }
    catch {
      // ignore
    }
  }
  return null
}

/** Format mode config for logging */
export function formatModeConfig(modeConfig: ModeConfig | null, modeIndex: number): string {
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

/** Resolve log options from various input formats */
export function resolveLogOptions(
  logRaw: boolean | TestVariantsLogOptions | null | undefined,
): TestVariantsLogOptions {
  if (logRaw === false) {
    return logOptionsDisabled
  }
  if (logRaw === true) {
    return logOptionsDefault
  }
  if (logRaw && typeof logRaw === 'object') {
    return logRaw
  }
  return logOptionsDefault
}
