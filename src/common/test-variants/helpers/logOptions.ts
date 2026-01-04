import type {
  TestVariantsLogFunc,
  TestVariantsLogOptions,
  TestVariantsLogType,
} from '../types'
import { log } from 'src/common/helpers/log'
import { type RequiredNonNullable } from '@flemist/simple-utils'

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
