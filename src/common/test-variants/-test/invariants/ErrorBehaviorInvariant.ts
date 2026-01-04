import type { FindBestErrorOptions, TestVariantsRunResult } from 'src/common'
import { TestError } from 'src/common/test-variants/-test/helpers/TestError'
import { TestArgs } from 'src/common/test-variants/-test/types'

/**
 * Validates error handling behavior
 *
 * ## Applicability
 * Active for all test executions. Validates error propagation based on
 * findBestError and dontThrowIfError options.
 *
 * ## Validated Rules
 * - When error expected and findBestError.dontThrowIfError=true: no error thrown, bestError populated
 * - When error expected and findBestError enabled: error thrown after finding best
 * - When error expected without findBestError: error thrown immediately
 * - When no error expected: no error thrown, bestError is null
 */
export class ErrorBehaviorInvariant {
  private readonly findBestError: FindBestErrorOptions | undefined | null
  private readonly errorVariantIndex: number | null
  private readonly retriesToError: number

  constructor(
    findBestError: FindBestErrorOptions | undefined | null,
    errorVariantIndex: number | null,
    retriesToError: number,
  ) {
    this.findBestError = findBestError
    this.errorVariantIndex = errorVariantIndex
    this.retriesToError = retriesToError
  }

  /**
   * Validates error behavior after test execution
   *
   * @param callCount - Number of test function calls
   * @param thrownError - The error that was thrown (or null)
   * @param lastError - The last TestError that occurred (or null)
   * @param result - The test result (may be null if error thrown)
   */
  validate(
    callCount: number,
    thrownError: unknown,
    lastError: TestError | null,
    result: TestVariantsRunResult<TestArgs> | null,
  ): void {
    const errorExpected =
      (this.errorVariantIndex != null &&
        this.retriesToError === 0 &&
        callCount > this.errorVariantIndex) ||
      !!lastError
    const dontThrowIfError = this.findBestError?.dontThrowIfError ?? false

    if (errorExpected) {
      if (lastError == null) {
        throw new Error(`Error was expected but lastError is null`)
      }
      if (this.findBestError && dontThrowIfError) {
        if (thrownError != null) {
          throw new Error(`Error was thrown but dontThrowIfError=true`)
        }
        if (result?.bestError == null) {
          throw new Error(`bestError is null but error was expected`)
        }
        if (result.bestError.error !== lastError) {
          throw new Error(`bestError.error is not TestError`)
        }
      } else if (this.findBestError) {
        if (thrownError == null) {
          throw new Error(`Error expected but not thrown (findBestError=true)`)
        }
        if (thrownError !== lastError) {
          throw new Error(`Thrown error does not match lastError`)
        }
      } else {
        if (thrownError == null) {
          throw new Error(`Error expected but not thrown`)
        }
        if (thrownError !== lastError) {
          throw new Error(`Thrown error does not match lastError`)
        }
      }
    } else {
      if (thrownError != null) {
        throw new Error(`No error expected but error was thrown`)
      }
      if (result?.bestError != null) {
        throw new Error(`bestError is set but no error was expected`)
      }
    }
  }
}
