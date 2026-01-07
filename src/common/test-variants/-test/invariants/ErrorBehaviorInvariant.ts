import type { FindBestErrorOptions, TestVariantsResult } from 'src/common'
import { TestError } from 'src/common/test-variants/-test/helpers/TestError'
import { StressTestArgs, TestArgs } from 'src/common/test-variants/-test/types'

/**
 * Validates error handling behavior
 *
 * ## Applicability
 * Active for all test executions. Validates error propagation based on
 * findBestError and dontThrowIfError options.
 *
 * ## Validated Rules
 * - When error expected and dontThrowIfError=true: no error thrown, bestError populated
 * - When error expected and dontThrowIfError=false: error thrown, matches lastThrownError
 * - When no error expected: no error thrown, bestError is null
 */
export class ErrorBehaviorInvariant {
  private readonly _options: StressTestArgs
  private readonly _findBestError: FindBestErrorOptions | undefined | null
  private readonly _variantsCount: number
  private readonly _errorVariantIndex: number | null
  private readonly _retriesToError: number

  constructor(
    options: StressTestArgs,
    findBestError: FindBestErrorOptions | undefined | null,
    variantsCount: number,
    errorVariantIndex: number | null,
    retriesToError: number,
  ) {
    this._options = options
    this._findBestError = findBestError
    this._variantsCount = variantsCount
    this._errorVariantIndex = errorVariantIndex
    this._retriesToError = retriesToError
  }

  /**
   * Validates error behavior after test execution
   *
   * @param callCount - Number of test function calls
   * @param caughtError - The error that was thrown (or null)
   * @param lastThrownError - The last TestError that occurred (or null)
   * @param result - The test result (may be null if error thrown)
   */
  validate(
    callCount: number,
    caughtError: unknown,
    lastThrownError: TestError | null,
    result: TestVariantsResult<TestArgs> | null,
  ): void {
    if (caughtError != null && !(caughtError instanceof TestError)) {
      throw caughtError
    }

    let errorExpected: boolean | null = null
    if (
      this._errorVariantIndex == null ||
      this._errorVariantIndex >= this._variantsCount
    ) {
      errorExpected = false
    } else if (this._variantsCount > 1 && this._options.modeType === 'random') {
      return
    } else {
      if (
        callCount >=
        (this._errorVariantIndex + 1) * (this._retriesToError + 1)
      ) {
        errorExpected = true
      }
      // TODO: add here: errorExpected = false
    }

    const dontThrowIfError = this._findBestError?.dontThrowIfError ?? false

    if (errorExpected) {
      if (lastThrownError == null) {
        throw new Error(
          `[test][ErrorBehaviorInvariant] error expected but lastThrownError is null`,
        )
      }
      if (this._findBestError && dontThrowIfError) {
        if (caughtError != null) {
          throw new Error(
            `[test][ErrorBehaviorInvariant] error thrown but dontThrowIfError=true`,
          )
        }
        if (result?.bestError == null) {
          throw new Error(
            `[test][ErrorBehaviorInvariant] bestError is null but error expected`,
          )
        }
        if (result.bestError.error !== lastThrownError) {
          throw new Error(
            `[test][ErrorBehaviorInvariant] bestError.error !== lastThrownError`,
          )
        }
      } else if (this._findBestError) {
        if (caughtError == null) {
          throw new Error(
            `[test][ErrorBehaviorInvariant] error expected but not thrown (findBestError=true)`,
          )
        }
        if (caughtError !== lastThrownError) {
          throw new Error(
            `[test][ErrorBehaviorInvariant] caughtError !== lastThrownError\ncaughtError: ${caughtError}\nlastThrownError: ${lastThrownError}`,
          )
        }
      } else {
        if (caughtError == null) {
          throw new Error(
            `[test][ErrorBehaviorInvariant] error expected but not thrown`,
          )
        }
        if (caughtError !== lastThrownError) {
          throw new Error(
            `[test][ErrorBehaviorInvariant] caughtError !== lastThrownError`,
          )
        }
      }
    } else {
      if (caughtError != null) {
        throw new Error(
          `[test][ErrorBehaviorInvariant] no error expected but error thrown`,
        )
      }
      if (result?.bestError != null) {
        throw new Error(
          `[test][ErrorBehaviorInvariant] bestError is set but no error expected`,
        )
      }
    }
  }
}
