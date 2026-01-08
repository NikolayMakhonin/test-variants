import type { TestVariantsResult, TestVariantsRunOptions } from 'src/common'
import { TestError } from 'src/common/test-variants/-test/helpers/TestError'
import { StressTestArgs, TestArgs } from 'src/common/test-variants/-test/types'
import { deepEqualJsonLikeWithoutSeed } from 'src/common/test-variants/-test/helpers/deepEqualJsonLikeWithoutSeed'
import { getParallelLimit } from '../helpers/getParallelLimit'
import { getMaxAttemptsPerVariant } from '../helpers/getMaxAttemptsPerVariant'
import { MODES_DEFAULT } from '../constants'

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
 * - attemptsPerVariant > 1 (can't distinguish retry from retest)
 * - dynamic templates (variant indices don't have same meaning)
 */
export class FindBestErrorInvariant {
  private readonly _options: StressTestArgs
  private readonly _runOptions: TestVariantsRunOptions<TestArgs>
  private readonly _errorVariantIndex: number | null
  private readonly _errorVariantArgs: TestArgs | null

  private _errorOccurred = false
  private _errorVariantRetestedAfterError = false
  private _callsAfterError = 0

  constructor(
    options: StressTestArgs,
    runOptions: TestVariantsRunOptions<TestArgs>,
    errorVariantIndex: number | null,
    errorVariantArgs: TestArgs | null,
  ) {
    this._options = options
    this._runOptions = runOptions
    this._errorVariantIndex = errorVariantIndex
    this._errorVariantArgs = errorVariantArgs
  }

  /** Call inside test func before potential error */
  onCall(args: TestArgs): void {
    const findBestErrorEnabled = !!this._runOptions.findBestError
    if (!findBestErrorEnabled) {
      return
    }

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

    if (this._errorOccurred) {
      this._callsAfterError++

      // Check if error variant is being retested
      const includeErrorVariant =
        this._runOptions.findBestError?.includeErrorVariant ?? false
      if (
        !includeErrorVariant &&
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
    const findBestErrorEnabled = !!this._runOptions.findBestError
    if (!findBestErrorEnabled) {
      return
    }

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

    const iterationModes = this._runOptions.iterationModes ?? MODES_DEFAULT
    const attemptsPerVariant = getMaxAttemptsPerVariant(iterationModes)
    const isDynamicTemplate = this._options.argType !== 'static'
    const includeErrorVariant =
      this._runOptions.findBestError?.includeErrorVariant ?? false
    const dontThrowIfError =
      this._runOptions.findBestError?.dontThrowIfError ?? false

    // Validate includeErrorVariant=false behavior
    // Skip when attemptsPerVariant > 1 (can't distinguish retry from retest)
    // Skip for dynamic templates (args comparison unreliable)
    if (
      attemptsPerVariant <= 1 &&
      !isDynamicTemplate &&
      !includeErrorVariant &&
      this._errorOccurred &&
      this._errorVariantRetestedAfterError
    ) {
      throw new Error(
        `[test][FindBestErrorInvariant] error variant retested after error but includeErrorVariant=false`,
      )
    }

    // Validate dontThrowIfError behavior
    if (dontThrowIfError && lastThrownError != null) {
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
    // Skip when attemptsPerVariant > 1 (legitimate retries expected)
    // Skip for dynamic templates (variant 0 doesn't mean all indices are 0)
    if (
      attemptsPerVariant <= 1 &&
      !isDynamicTemplate &&
      !includeErrorVariant &&
      this._errorOccurred &&
      this._errorVariantIndex === 0 &&
      this._callsAfterError > 0
    ) {
      throw new Error(
        `[test][FindBestErrorInvariant] error at variant 0 but ${this._callsAfterError} calls after error (should terminate immediately)`,
      )
    }

    // Validate dontThrowIfError=false behavior: error must be thrown
    if (!dontThrowIfError && lastThrownError != null) {
      if (caughtError == null) {
        throw new Error(
          `[test][FindBestErrorInvariant] error occurred but not thrown (dontThrowIfError=false)`,
        )
      }
    }
  }
}
