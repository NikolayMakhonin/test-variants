import type { TestVariantsResult, TestVariantsRunOptions } from 'src/common'
import { TestError } from 'src/common/test-variants/-test/helpers/TestError'
import { StressTestArgs, TestArgs } from 'src/common/test-variants/-test/types'
import { MODES_DEFAULT } from 'src/common/test-variants/-test/constants'
import { isModeSequential } from 'src/common/test-variants/iterator/helpers/mode'
import { getParallelLimit } from 'src/common/test-variants/-test/helpers/getParallelLimit'

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
  private readonly _runOptions: TestVariantsRunOptions<TestArgs>
  private readonly _variantsCount: number
  private readonly _errorVariantIndex: number | null
  private readonly _retriesToError: number

  constructor(
    options: StressTestArgs,
    runOptions: TestVariantsRunOptions<TestArgs>,
    variantsCount: number,
    errorVariantIndex: number | null,
    retriesToError: number,
  ) {
    this._options = options
    this._runOptions = runOptions
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

    const parallel = getParallelLimit(this._runOptions.parallel)
    if (parallel === Infinity) {
      return
    }

    // let modeType: ModeType | null = null
    const modes = this._runOptions.iterationModes ?? MODES_DEFAULT
    if (modes.length > 1) {
      return
    }
    const mode = modes[0]
    const modeType = mode.mode
    const attemptsPerVariant = isModeSequential(mode)
      ? (mode.attemptsPerVariant ?? 1)
      : 1

    if (this._retriesToError > 0 || attemptsPerVariant > 1) {
      return
    }

    let expectedCountToError: number

    if (callCount === 0) {
      expectedCountToError = Infinity
    } else if (
      this._errorVariantIndex == null ||
      this._errorVariantIndex >= this._variantsCount
    ) {
      expectedCountToError = Infinity
    } else if (modeType === 'random') {
      if (this._variantsCount > 1) {
        return
      }
      expectedCountToError = this._retriesToError + 1
    } else if (modeType === 'forward') {
      expectedCountToError =
        this._errorVariantIndex + 1 + this._variantsCount * this._retriesToError
    } else if (modeType === 'backward') {
      expectedCountToError =
        this._variantsCount -
        this._errorVariantIndex +
        this._variantsCount * this._retriesToError
    } else {
      throw new Error(
        `[test][ErrorBehaviorInvariant] unknown modeType "${modeType}"`,
      )
    }

    let errorExpected: boolean
    if (callCount >= expectedCountToError + parallel - 1) {
      errorExpected = true
    } else if (callCount < expectedCountToError) {
      errorExpected = false
    } else {
      return
    }

    const dontThrowIfError =
      this._runOptions.findBestError?.dontThrowIfError ?? false

    if (errorExpected) {
      if (lastThrownError == null) {
        throw new Error(
          `[test][ErrorBehaviorInvariant] error expected but lastThrownError is null`,
        )
      }
      if (this._runOptions.findBestError && dontThrowIfError) {
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
        // Skip identity check for parallel > 1: multiple errors on same variant can occur
        // before limit takes effect, making bestError.error differ from lastThrownError
        if (parallel <= 1 && result.bestError.error !== lastThrownError) {
          throw new Error(
            `[test][ErrorBehaviorInvariant] bestError.error !== lastThrownError`,
          )
        }
      } else if (this._runOptions.findBestError) {
        if (caughtError == null) {
          throw new Error(
            `[test][ErrorBehaviorInvariant] error expected but not thrown (findBestError=true)`,
          )
        }
        if (parallel <= 1 && caughtError !== lastThrownError) {
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
        if (parallel <= 1 && caughtError !== lastThrownError) {
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
