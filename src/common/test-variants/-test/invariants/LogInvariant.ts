import type { TestVariantsLogOptions } from 'src/common'
import type { TestVariantsLogType } from 'src/common/test-variants/types'
import type { NumberRange } from '@flemist/simple-utils'
import { isLogEnabled } from 'src/common/test-variants/-test/log'
import { log } from 'src/common/helpers/log'

/**
 * Validates log callback behavior
 *
 * ## Applicability
 * Active when log options are provided to runOptions.
 * Validates every log callback invocation during test execution.
 *
 * ## Validated Rules
 * - Each log type is called only when its corresponding option is enabled
 * - 'start' log is called exactly once before any test execution
 * - 'completed' log is called exactly once at the end
 * - No logs occur after 'completed'
 * - 'progress' and 'error' logs occur only after at least one test call
 * - 'modeChange' and 'debug' logs can occur before test calls
 */
export class LogInvariant {
  private logStart = false
  private logCompleted = false
  private logProgressCount = 0
  private logModeChanges = 0
  private logErrors = 0
  private logDebugs = 0

  private readonly logOptions:
    | TestVariantsLogOptions
    | boolean
    | undefined
    | null
  private readonly startEnabled: boolean
  private readonly completedEnabled: boolean
  private readonly progressEnabled: boolean
  private readonly modeChangeEnabled: boolean
  private readonly errorEnabled: boolean
  private readonly debugEnabled: boolean
  private readonly modeChangesRange: NumberRange
  private readonly getCallCount: () => number

  constructor(
    logOptions: TestVariantsLogOptions | boolean | undefined | null,
    modeChangesRange: NumberRange,
    getCallCount: () => number,
  ) {
    this.logOptions = logOptions
    this.modeChangesRange = modeChangesRange
    this.getCallCount = getCallCount
    if (typeof logOptions === 'boolean') {
      this.startEnabled = logOptions
      this.completedEnabled = logOptions
      this.progressEnabled = logOptions
      this.modeChangeEnabled = logOptions
      this.errorEnabled = logOptions
      this.debugEnabled = logOptions
    } else {
      this.startEnabled = !!logOptions?.start
      this.completedEnabled = !!logOptions?.completed
      this.progressEnabled = !!logOptions?.progress
      this.modeChangeEnabled = !!logOptions?.modeChange
      this.errorEnabled = !!logOptions?.error
      this.debugEnabled = !!logOptions?.debug
    }
  }

  onLog(type: TestVariantsLogType, message: string): void {
    if (isLogEnabled()) {
      log(`[test][LogInvariant][onLog] type=${type} message=${message}`)
    }
    if (this.logCompleted) {
      throw new Error(`[test][LogInvariant] log after completed`)
    }

    if (type === 'start') {
      if (this.logStart) {
        throw new Error(`[test][LogInvariant] start logged multiple times`)
      }
      if (!this.startEnabled) {
        throw new Error(`[test][LogInvariant] start log when not enabled`)
      }
      this.logStart = true
      return
    }

    if (type === 'modeChange') {
      if (!this.modeChangeEnabled) {
        throw new Error(`[test][LogInvariant] modeChange log when not enabled`)
      }
      this.logModeChanges++
      return
    }

    if (type === 'debug') {
      if (!this.debugEnabled) {
        throw new Error(`[test][LogInvariant] debug log when not enabled`)
      }
      this.logDebugs++
      return
    }

    if (type === 'completed') {
      if (this.logCompleted) {
        throw new Error(`[test][LogInvariant] completed logged multiple times`)
      }
      if (!this.completedEnabled) {
        throw new Error(`[test][LogInvariant] completed log when not enabled`)
      }
      this.logCompleted = true
      return
    }

    if (this.getCallCount() === 0) {
      throw new Error(`[test][LogInvariant] log before test started`)
    }

    if (type === 'progress') {
      if (!this.progressEnabled) {
        throw new Error(`[test][LogInvariant] progress log when not enabled`)
      }
      this.logProgressCount++
      return
    }

    if (type === 'error') {
      if (!this.errorEnabled) {
        throw new Error(`[test][LogInvariant] error log when not enabled`)
      }
      this.logErrors++
      return
    }

    throw new Error(`[test][LogInvariant] unknown log type "${type}"`)
  }

  /**
   * Validates final log state after test execution
   */
  validateFinal(
    callCount: number,
    elapsedTime: number,
    lastThrownError: Error | null,
  ): void {
    if (isLogEnabled()) {
      return
    }
    if (this.startEnabled && !this.logStart) {
      throw new Error(`[test][LogInvariant] start log expected but not logged`)
    }
    if (this.completedEnabled && !this.logCompleted) {
      throw new Error(
        `[test][LogInvariant] completed log expected but not logged`,
      )
    }
    const logProgressOption =
      typeof this.logOptions === 'boolean'
        ? this.logOptions
        : this.logOptions?.progress
    if (
      this.progressEnabled &&
      typeof logProgressOption === 'number' &&
      callCount > 0
    ) {
      const logProgressExpected =
        logProgressOption === 0
          ? callCount
          : Math.floor(elapsedTime / logProgressOption)
      if (this.logProgressCount !== logProgressExpected) {
        throw new Error(
          `[test][LogInvariant] progress log count ${this.logProgressCount} !== expected ${logProgressExpected}`,
        )
      }
    }
    if (
      this.modeChangeEnabled &&
      this.logModeChanges < this.modeChangesRange[0]
    ) {
      throw new Error(
        `[test][LogInvariant] mode changes log count ${this.logModeChanges} < expected minimum ${this.modeChangesRange[0]}`,
      )
    }
    if (this.errorEnabled && lastThrownError != null && this.logErrors <= 0) {
      throw new Error(`[test][LogInvariant] error log expected but not logged`)
    }
  }
}
