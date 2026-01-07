import { TestArgs } from 'src/common/test-variants/-test/types'
import { TestError } from 'src/common/test-variants/-test/helpers/TestError'
import { deepEqualJsonLikeWithoutSeed } from 'src/common/test-variants/-test/helpers/deepEqualJsonLikeWithoutSeed'

/**
 * Validates onError callback behavior
 *
 * ## Applicability
 * Active when errors occur during test execution.
 * Validates onError callback is called correctly.
 *
 * ## Validated Rules
 * - error parameter is instanceof TestError
 * - error parameter matches lastThrownError (sequential execution)
 * - args parameter matches errorVariantArgs (ignoring seed)
 * - tests parameter is positive integer not exceeding callCount
 * - tests parameter does not decrease in findBestError mode
 * - Without findBestError: onError called at most once
 * - With findBestError: onError can be called multiple times
 * - If error occurred, onError was called at least once
 * - If no error occurred, onError was never called
 *
 * ## Skipped Cases
 * - parallel > 1 without sequentialOnError (race conditions)
 */
export class OnErrorInvariant {
  private _onErrorCount = 0
  private _lastOnErrorTests = 0
  private readonly _findBestErrorEnabled: boolean
  private readonly _errorVariantArgs: TestArgs | null
  private readonly _parallel: number
  private readonly _sequentialOnError: boolean

  constructor(
    findBestErrorEnabled: boolean,
    errorVariantArgs: TestArgs | null,
    parallel: number,
    sequentialOnError: boolean,
  ) {
    this._findBestErrorEnabled = findBestErrorEnabled
    this._errorVariantArgs = errorVariantArgs
    this._parallel = parallel
    this._sequentialOnError = sequentialOnError
  }

  onError(
    event: { error: unknown; args: TestArgs; tests: number },
    callCount: number,
    lastThrownError: TestError | null,
  ): void {
    // Skip validation for parallel without sequentialOnError (race conditions)
    if (this._parallel > 1 && !this._sequentialOnError) {
      this._onErrorCount++
      return
    }

    // After first error with sequentialOnError, execution is sequential
    const isSequential =
      this._parallel <= 1 || (this._sequentialOnError && this._onErrorCount > 0)

    if (this._onErrorCount > 0 && !this._findBestErrorEnabled) {
      throw new Error(
        `[test][OnErrorInvariant] onError called multiple times but findBestError disabled`,
      )
    }

    if (!(event.error instanceof TestError)) {
      throw new Error(
        `[test][OnErrorInvariant] error is not instanceof TestError: ${event.error}`,
      )
    }

    if (isSequential && event.error !== lastThrownError) {
      throw new Error(
        `[test][OnErrorInvariant] error does not match lastThrownError`,
      )
    }

    if (this._errorVariantArgs != null) {
      if (!deepEqualJsonLikeWithoutSeed(event.args, this._errorVariantArgs)) {
        throw new Error(
          `[test][OnErrorInvariant] args do not match errorVariantArgs (ignoring seed)\n` +
            `event.args: ${JSON.stringify(event.args)}\n` +
            `errorVariantArgs: ${JSON.stringify(this._errorVariantArgs)}`,
        )
      }
    }

    if (event.tests < 1) {
      throw new Error(`[test][OnErrorInvariant] tests ${event.tests} < 1`)
    }

    if (isSequential && event.tests > callCount) {
      throw new Error(
        `[test][OnErrorInvariant] tests ${event.tests} > callCount ${callCount}`,
      )
    }

    // With findBestError, tests should not decrease (search progresses forward lexicographically)
    if (
      this._findBestErrorEnabled &&
      this._onErrorCount > 0 &&
      isSequential &&
      event.tests < this._lastOnErrorTests
    ) {
      throw new Error(
        `[test][OnErrorInvariant] tests ${event.tests} < previous tests ${this._lastOnErrorTests} in findBestError mode`,
      )
    }

    this._lastOnErrorTests = event.tests
    this._onErrorCount++
  }

  get onErrorCount(): number {
    return this._onErrorCount
  }

  validateFinal(lastThrownError: TestError | null): void {
    // Skip validation for parallel without sequentialOnError (race conditions)
    if (this._parallel > 1 && !this._sequentialOnError) {
      return
    }

    if (lastThrownError != null && this._onErrorCount === 0) {
      throw new Error(
        `[test][OnErrorInvariant] error occurred but onError was not called`,
      )
    }

    if (lastThrownError == null && this._onErrorCount > 0) {
      throw new Error(
        `[test][OnErrorInvariant] onError called ${this._onErrorCount} times but no error occurred`,
      )
    }
  }
}
