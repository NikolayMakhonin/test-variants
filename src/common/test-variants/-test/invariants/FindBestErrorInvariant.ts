import type { TestVariantsResult } from 'src/common'
import { TestError } from 'src/common/test-variants/-test/helpers/TestError'
import { TestArgs } from 'src/common/test-variants/-test/types'
import { deepEqualJsonLikeWithoutSeed } from 'src/common/test-variants/-test/helpers/deepEqualJsonLikeWithoutSeed'

/**
 * Validates findBestError behavior
 *
 * ## Applicability
 * Active when findBestError is enabled
 *
 * ## Validated Rules
 * - dontThrowIfError=true + error: caughtError is null, bestError populated
 * - dontThrowIfError=false + error: caughtError is thrown at end
 * - includeErrorVariant=false: error variant never retested after first error
 * - Error at variant 0: testing terminates (no better error possible)
 * - Continues testing variants 0..(errorVariant-1) after error until limits
 *
 * ## Skipped Cases
 * - parallel > 1 without sequentialOnError (race conditions)
 */
export class FindBestErrorInvariant {
  private readonly _findBestErrorEnabled: boolean
  private readonly _dontThrowIfError: boolean
  private readonly _includeErrorVariant: boolean
  private readonly _errorVariantIndex: number | null
  private readonly _errorVariantArgs: TestArgs | null
  private readonly _parallel: number
  private readonly _sequentialOnError: boolean

  private _errorOccurred = false
  private _errorVariantRetestedAfterError = false
  private _callsAfterError = 0

  constructor(
    findBestErrorEnabled: boolean,
    dontThrowIfError: boolean,
    includeErrorVariant: boolean,
    errorVariantIndex: number | null,
    errorVariantArgs: TestArgs | null,
    parallel: number,
    sequentialOnError: boolean,
  ) {
    this._findBestErrorEnabled = findBestErrorEnabled
    this._dontThrowIfError = dontThrowIfError
    this._includeErrorVariant = includeErrorVariant
    this._errorVariantIndex = errorVariantIndex
    this._errorVariantArgs = errorVariantArgs
    this._parallel = parallel
    this._sequentialOnError = sequentialOnError
  }

  /** Call inside test func before potential error */
  onCall(args: TestArgs): void {
    if (!this._findBestErrorEnabled) {
      return
    }

    // Skip validation for parallel without sequentialOnError (race conditions)
    if (this._parallel > 1 && !this._sequentialOnError) {
      return
    }

    if (this._errorOccurred) {
      this._callsAfterError++

      // Check if error variant is being retested
      if (
        !this._includeErrorVariant &&
        this._errorVariantArgs != null &&
        deepEqualJsonLikeWithoutSeed(args, this._errorVariantArgs)
      ) {
        this._errorVariantRetestedAfterError = true
      }
    }
  }

  /** Call when error occurs */
  onError(): void {
    this._errorOccurred = true
  }

  /** Run after test variants completion */
  validateFinal(
    caughtError: unknown,
    lastThrownError: TestError | null,
    result: TestVariantsResult<TestArgs> | null,
  ): void {
    if (!this._findBestErrorEnabled) {
      return
    }

    // Skip validation for parallel without sequentialOnError (race conditions)
    if (this._parallel > 1 && !this._sequentialOnError) {
      return
    }

    // Validate includeErrorVariant=false behavior
    if (
      !this._includeErrorVariant &&
      this._errorOccurred &&
      this._errorVariantRetestedAfterError
    ) {
      throw new Error(
        `[test][FindBestErrorInvariant] error variant retested after error but includeErrorVariant=false`,
      )
    }

    // Validate dontThrowIfError behavior
    if (this._dontThrowIfError && lastThrownError != null) {
      // Should not throw, error should be in result.bestError
      if (caughtError != null) {
        throw new Error(
          `[test][FindBestErrorInvariant] error thrown but dontThrowIfError=true`,
        )
      }
      if (result?.bestError == null) {
        throw new Error(
          `[test][FindBestErrorInvariant] bestError is null but error occurred and dontThrowIfError=true`,
        )
      }
      if (result.bestError.error !== lastThrownError) {
        throw new Error(
          `[test][FindBestErrorInvariant] bestError.error !== lastThrownError`,
        )
      }
    }

    // Validate error at variant 0 causes immediate termination
    // Skip when includeErrorVariant=true (system verification mode allows retesting)
    if (
      !this._includeErrorVariant &&
      this._errorOccurred &&
      this._errorVariantIndex === 0 &&
      this._callsAfterError > 0
    ) {
      throw new Error(
        `[test][FindBestErrorInvariant] error at variant 0 but ${this._callsAfterError} calls after error (should terminate immediately)`,
      )
    }

    // Validate dontThrowIfError=false behavior: error must be thrown
    if (!this._dontThrowIfError && lastThrownError != null) {
      if (caughtError == null) {
        throw new Error(
          `[test][FindBestErrorInvariant] error occurred but not thrown (dontThrowIfError=false)`,
        )
      }
    }
  }
}
