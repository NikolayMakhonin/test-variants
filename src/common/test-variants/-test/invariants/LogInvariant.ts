import type { TestVariantsLogOptions } from 'src/common'
import type { TestVariantsLogType } from 'src/common/test-variants/types'
import { RequiredNonNullable } from '@flemist/simple-utils'

/**
 * Validates log callback behavior
 *
 * ## Applicability
 * Active when log options are provided to runOptions.
 * Validates every log callback invocation during test execution.
 *
 * ## Invariants
 *
 * ### Per-log validation (onLog)
 * - Each log type is called exclusively when its corresponding option is enabled
 * - No logs occur after 'completed'
 * - 'start' log called exactly once, before any other logs
 * - 'completed' log called exactly once, at the end
 * - 'progress' and 'error' logs occur exclusively after at least one test call (tests > 0)
 * - 'modeChange' and 'debug' logs can occur before test calls
 *
 * ### Content validation (values only, not format)
 * - 'start': no value checks
 * - 'completed': tests value
 * - 'modeChange': modeIndex value, mode name value (forward/backward/random)
 * - 'progress': tests value
 * - 'error': tests value
 * - 'debug': no value checks
 *
 * ### Log examples
 *
 * start:
 * ```
 * [test-variants] start, memory: 139MB
 * ```
 *
 * progress:
 * ```
 * [test-variants] tests: 615 (5.0s), async: 12, memory: 148MB (+8.8MB)
 * ```
 *
 * modeChange:
 * ```
 * [test-variants] mode[0]: forward
 * [test-variants] mode[1]: backward, limitTests=10
 * [test-variants] mode[2]: random, limitTime=10.9m
 * ```
 *
 * completed:
 * ```
 * [test-variants] end, tests: 815 (7.0s), async: 123, memory: 138MB (-1.0MB)
 * ```
 *
 * error:
 * ```
 * [test-variants] error variant: {arg1: value1}
 * Error: test error message
 * tests: 5
 * ```
 *
 * debug:
 * ```
 * [test-variants] debug iteration: 0
 * ```
 *
 * ## Note on modeChange validation
 *
 * Library emits modeChange log BEFORE calling onModeChange callback.
 * LogInvariant stores modeChange message in onLog, then validates it
 * when onModeChange is called with actual mode info.
 */
export class LogInvariant {
  private _logStartCount = 0
  private _logCompletedCount = 0
  private _logProgressCount = 0
  private _logModeChangeCount = 0
  private _logErrorCount = 0
  private _logDebugCount = 0
  private _anyLogAfterCompleted = false

  /** Stores last modeChange message for validation in onModeChange */
  private _pendingModeChangeMessage: string | null = null

  private readonly _logOptions: TestVariantsLogOptions

  constructor(logOptions: RequiredNonNullable<TestVariantsLogOptions>) {
    this._logOptions = logOptions
  }

  /**
   * Call when mode changes to validate pending modeChange log
   *
   * Library calls logFunc('modeChange', ...) BEFORE onModeChange callback,
   * so we validate the stored message here when we know the actual mode info
   */
  onModeChange(modeIndex: number, modeName: string): void {
    if (this._pendingModeChangeMessage == null) {
      return
    }

    const message = this._pendingModeChangeMessage
    this._pendingModeChangeMessage = null

    if (!new RegExp('\\b' + modeIndex + '\\b').test(message)) {
      throw new Error(
        `[test][LogInvariant] modeChange log missing modeIndex value "${modeIndex}"\nmessage: ${message}`,
      )
    }

    if (!message.includes(modeName)) {
      throw new Error(
        `[test][LogInvariant] modeChange log missing mode name "${modeName}"\nmessage: ${message}`,
      )
    }
  }

  /** Call for each log func invocation */
  onLog(type: TestVariantsLogType, message: string, tests: number): void {
    if (this._logCompletedCount > 0) {
      this._anyLogAfterCompleted = true
      throw new Error(`[test][LogInvariant] log after completed: type=${type}`)
    }

    if (type === 'start') {
      this._validateStartLog(message)
      return
    }

    if (type === 'completed') {
      this._validateCompletedLog(message, tests)
      return
    }

    if (type === 'modeChange') {
      this._onModeChangeLog(message)
      return
    }

    if (type === 'progress') {
      this._validateProgressLog(message, tests)
      return
    }

    if (type === 'error') {
      this._validateErrorLog(message, tests)
      return
    }

    if (type === 'debug') {
      this._validateDebugLog(message)
      return
    }

    throw new Error(`[test][LogInvariant] unknown log type "${type}"`)
  }

  private _validateStartLog(_message: string): void {
    if (!this._logOptions.start) {
      throw new Error(`[test][LogInvariant] start log when disabled`)
    }

    this._logStartCount++

    if (this._logStartCount > 1) {
      throw new Error(`[test][LogInvariant] start logged multiple times`)
    }
  }

  private _validateCompletedLog(message: string, tests: number): void {
    if (!this._logOptions.completed) {
      throw new Error(`[test][LogInvariant] completed log when disabled`)
    }

    this._logCompletedCount++

    if (this._logCompletedCount > 1) {
      throw new Error(`[test][LogInvariant] completed logged multiple times`)
    }

    if (!new RegExp('\\b' + tests + '\\b').test(message)) {
      throw new Error(
        `[test][LogInvariant] completed log missing tests value "${tests}"\nmessage: ${message}`,
      )
    }
  }

  private _onModeChangeLog(message: string): void {
    if (!this._logOptions.modeChange) {
      throw new Error(`[test][LogInvariant] modeChange log when disabled`)
    }

    this._logModeChangeCount++
    this._pendingModeChangeMessage = message
  }

  private _validateProgressLog(message: string, tests: number): void {
    if (!this._logOptions.progress) {
      throw new Error(`[test][LogInvariant] progress log when disabled`)
    }

    if (tests <= 0) {
      throw new Error(
        `[test][LogInvariant] progress log before any tests (tests=${tests})`,
      )
    }

    this._logProgressCount++

    if (!new RegExp('\\b' + tests + '\\b').test(message)) {
      throw new Error(
        `[test][LogInvariant] progress log missing tests value "${tests}"\nmessage: ${message}`,
      )
    }
  }

  private _validateErrorLog(message: string, tests: number): void {
    if (!this._logOptions.error) {
      throw new Error(`[test][LogInvariant] error log when disabled`)
    }

    if (tests <= 0) {
      throw new Error(
        `[test][LogInvariant] error log before any tests (tests=${tests})`,
      )
    }

    this._logErrorCount++

    if (!new RegExp('\\b' + tests + '\\b').test(message)) {
      throw new Error(
        `[test][LogInvariant] error log missing tests value "${tests}"\nmessage: ${message}`,
      )
    }
  }

  private _validateDebugLog(_message: string): void {
    if (!this._logOptions.debug) {
      throw new Error(`[test][LogInvariant] debug log when disabled`)
    }

    this._logDebugCount++
  }

  /** Run after test variants completion */
  validateFinal(onErrorCount: number): void {
    if (this._anyLogAfterCompleted) {
      throw new Error(`[test][LogInvariant] log occurred after completed`)
    }

    if (this._logOptions.start && this._logStartCount !== 1) {
      throw new Error(
        `[test][LogInvariant] start log count ${this._logStartCount} !== 1`,
      )
    }

    if (!this._logOptions.start && this._logStartCount !== 0) {
      throw new Error(
        `[test][LogInvariant] start log count ${this._logStartCount} !== 0 when disabled`,
      )
    }

    if (this._logOptions.completed && this._logCompletedCount !== 1) {
      throw new Error(
        `[test][LogInvariant] completed log count ${this._logCompletedCount} !== 1`,
      )
    }

    if (!this._logOptions.completed && this._logCompletedCount !== 0) {
      throw new Error(
        `[test][LogInvariant] completed log count ${this._logCompletedCount} !== 0 when disabled`,
      )
    }

    if (!this._logOptions.modeChange && this._logModeChangeCount !== 0) {
      throw new Error(
        `[test][LogInvariant] modeChange log count ${this._logModeChangeCount} !== 0 when disabled`,
      )
    }

    if (!this._logOptions.progress && this._logProgressCount !== 0) {
      throw new Error(
        `[test][LogInvariant] progress log count ${this._logProgressCount} !== 0 when disabled`,
      )
    }

    if (!this._logOptions.error && this._logErrorCount !== 0) {
      throw new Error(
        `[test][LogInvariant] error log count ${this._logErrorCount} !== 0 when disabled`,
      )
    }

    if (!this._logOptions.debug && this._logDebugCount !== 0) {
      throw new Error(
        `[test][LogInvariant] debug log count ${this._logDebugCount} !== 0 when disabled`,
      )
    }

    if (this._logOptions.error && this._logErrorCount !== onErrorCount) {
      throw new Error(
        `[test][LogInvariant] error log count ${this._logErrorCount} !== onErrorCount ${onErrorCount}`,
      )
    }
  }

  get logStartCount(): number {
    return this._logStartCount
  }

  get logCompletedCount(): number {
    return this._logCompletedCount
  }

  get logProgressCount(): number {
    return this._logProgressCount
  }

  get logModeChangeCount(): number {
    return this._logModeChangeCount
  }

  get logErrorCount(): number {
    return this._logErrorCount
  }

  get logDebugCount(): number {
    return this._logDebugCount
  }
}
