import type { ModeConfig, TestVariantsLogOptions } from 'src/common'
import type { TestVariantsLogType } from 'src/common/test-variants/types'
import { isLogEnabled } from 'src/common/test-variants/-test/log'
import { log } from 'src/common/helpers/log'
import { estimateModeChanges } from 'src/common/test-variants/-test/estimations/estimateModeChanges'

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

  private readonly startEnabled: boolean
  private readonly completedEnabled: boolean
  private readonly progressEnabled: boolean
  private readonly modeChangeEnabled: boolean
  private readonly errorEnabled: boolean
  private readonly debugEnabled: boolean
  private readonly getCallCount: () => number

  constructor(
    logOptions: TestVariantsLogOptions | boolean | undefined | null,
    getCallCount: () => number,
  ) {
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
      this.progressEnabled = logOptions?.progress !== false
      this.modeChangeEnabled = !!logOptions?.modeChange
      this.errorEnabled = !!logOptions?.error
      this.debugEnabled = !!logOptions?.debug
    }
  }

  onLog(type: TestVariantsLogType, message: string): void {
    if (isLogEnabled()) {
      log(`[${type}] ${message}`)
    }
    if (this.logCompleted) {
      throw new Error(`logFunc: log after completed`)
    }

    if (type === 'start') {
      if (this.logStart) {
        throw new Error(`logFunc: start logged multiple times`)
      }
      if (!this.startEnabled) {
        throw new Error(`logFunc: start log when not enabled`)
      }
      this.logStart = true
      return
    }

    if (type === 'modeChange') {
      if (!this.modeChangeEnabled) {
        throw new Error(`logFunc: modeChange log when not enabled`)
      }
      this.logModeChanges++
      return
    }

    if (type === 'debug') {
      if (!this.debugEnabled) {
        throw new Error(`logFunc: debug log when not enabled`)
      }
      this.logDebugs++
      return
    }

    if (type === 'completed') {
      if (this.logCompleted) {
        throw new Error(`logFunc: completed logged multiple times`)
      }
      if (!this.completedEnabled) {
        throw new Error(`logFunc: completed log when not enabled`)
      }
      this.logCompleted = true
      return
    }

    if (this.getCallCount() === 0) {
      throw new Error(`logFunc: log before test started`)
    }

    if (type === 'progress') {
      if (!this.progressEnabled) {
        throw new Error(`logFunc: progress log when not enabled`)
      }
      this.logProgressCount++
      return
    }

    if (type === 'error') {
      if (!this.errorEnabled) {
        throw new Error(`logFunc: error log when not enabled`)
      }
      this.logErrors++
      return
    }

    throw new Error(`logFunc: unknown log type "${type}"`)
  }

  /**
   * Validates final log state after test execution
   *
   * ## Applicability
   * Call after test execution completes, only when debug logging is disabled
   */
  validateFinal(
    callCount: number,
    logProgressOption: number | boolean | undefined | null,
    elapsedTime: number,
    iterationModes: readonly ModeConfig[] | undefined | null,
    lastError: Error | null,
  ): void {
    if (this.startEnabled && !this.logStart) {
      throw new Error(`Start log expected but not logged`)
    }
    if (this.completedEnabled && !this.logCompleted) {
      throw new Error(`Completed log expected but not logged`)
    }
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
          `Progress log count ${this.logProgressCount} !== expected ${logProgressExpected}`,
        )
      }
    }
    if (this.modeChangeEnabled && iterationModes) {
      const modeChangesRange = estimateModeChanges(iterationModes, callCount)
      if (this.logModeChanges < modeChangesRange[0]) {
        throw new Error(
          `Mode changes log count ${this.logModeChanges} < expected minimum ${modeChangesRange[0]}`,
        )
      }
    }
    if (this.errorEnabled && lastError != null && this.logErrors <= 0) {
      throw new Error(`Error log expected but not logged`)
    }
  }
}
