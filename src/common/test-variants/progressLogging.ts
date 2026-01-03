import type {
  ModeConfig,
  TestVariantsLogFunc,
  TestVariantsLogOptions,
  TestVariantsLogType,
} from './types'
import { log } from 'src/common/helpers/log'
import { type RequiredNonNullable } from '@flemist/simple-utils'

/** Chrome-specific performance.memory API (non-standard) */
type PerformanceMemory = {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

/** Default log function - outputs using log helper */
const logFuncDefault: TestVariantsLogFunc = (
  _type: TestVariantsLogType,
  message: string,
): void => {
  log(message)
}

/** Default log options when logging is enabled */
export const logOptionsDefault: RequiredNonNullable<TestVariantsLogOptions> = {
  start: true,
  progress: 5000,
  completed: true,
  error: true,
  modeChange: true,
  debug: false,
  func: logFuncDefault,
}

/** Log options when logging is disabled */
export const logOptionsDisabled: RequiredNonNullable<TestVariantsLogOptions> = {
  start: false,
  progress: false,
  completed: false,
  error: false,
  modeChange: false,
  debug: false,
  func: logFuncDefault,
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
    } catch {
      // ignore
    }
  }
  // Browser (Chrome only, non-standard)
  if (typeof performance !== 'undefined') {
    const memory = (performance as { memory?: PerformanceMemory }).memory
    if (memory) {
      try {
        return memory.usedJSHeapSize
      } catch {
        // ignore
      }
    }
  }
  return null
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

/** Resolve log options from various input formats */
export function resolveLogOptions(
  logRaw: boolean | TestVariantsLogOptions | null | undefined,
): RequiredNonNullable<TestVariantsLogOptions> {
  if (logRaw === false) {
    return logOptionsDisabled
  }
  if (logRaw === true || !logRaw) {
    return logOptionsDefault
  }
  return {
    start: logRaw.start ?? logOptionsDefault.start,
    progress: logRaw.progress ?? logOptionsDefault.progress,
    completed: logRaw.completed ?? logOptionsDefault.completed,
    error: logRaw.error ?? logOptionsDefault.error,
    modeChange: logRaw.modeChange ?? logOptionsDefault.modeChange,
    debug: logRaw.debug ?? logOptionsDefault.debug,
    func: logRaw.func ?? logOptionsDefault.func,
  }
}
