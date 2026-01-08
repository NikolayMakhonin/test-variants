import type { TestVariantsRunOptions } from 'src/common'
import { TestArgs } from 'src/common/test-variants/-test/types'
import { TestError } from 'src/common/test-variants/-test/helpers/TestError'
import { deepEqualJsonLikeWithoutSeed } from 'src/common/test-variants/-test/helpers/deepEqualJsonLikeWithoutSeed'
import { getParallelLimit } from '../helpers/getParallelLimit'

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
 * - tests parameter is non-negative integer not exceeding callCount
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
  private readonly _runOptions: TestVariantsRunOptions<TestArgs>
  private readonly _errorVariantArgs: TestArgs | null

  constructor(
    runOptions: TestVariantsRunOptions<TestArgs>,
    errorVariantArgs: TestArgs | null,
  ) {
    this._runOptions = runOptions
    this._errorVariantArgs = errorVariantArgs
  }

  onError(
    event: { error: unknown; args: TestArgs; tests: number },
    callCount: number,
    lastThrownError: TestError | null,
  ): void {
    const parallel = this._runOptions.parallel
    const parallelLimit = getParallelLimit(parallel)
    const sequentialOnError =
      parallel != null && typeof parallel === 'object'
        ? (parallel.sequentialOnError ?? false)
        : false
    const findBestErrorEnabled = !!this._runOptions.findBestError

    // Skip validation for parallel without sequentialOnError (race conditions)
    if (parallelLimit > 1 && !sequentialOnError) {
      this._onErrorCount++
      return
    }

    // After first error with sequentialOnError, execution is sequential
    const isSequential =
      parallelLimit <= 1 || (sequentialOnError && this._onErrorCount > 0)

    if (this._onErrorCount > 0 && !findBestErrorEnabled) {
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

    if (event.tests < 0) {
      throw new Error(`[test][OnErrorInvariant] tests ${event.tests} < 0`)
    }

    if (isSequential && event.tests > callCount) {
      throw new Error(
        `[test][OnErrorInvariant] tests ${event.tests} > callCount ${callCount}`,
      )
    }

    // With findBestError, tests should not decrease (search progresses forward lexicographically)
    if (
      findBestErrorEnabled &&
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
    const parallel = this._runOptions.parallel
    const parallelLimit = getParallelLimit(parallel)
    const sequentialOnError =
      parallel != null && typeof parallel === 'object'
        ? (parallel.sequentialOnError ?? false)
        : false

    // Skip validation for parallel without sequentialOnError (race conditions)
    if (parallelLimit > 1 && !sequentialOnError) {
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
