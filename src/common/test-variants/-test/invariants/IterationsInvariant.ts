import type { TestVariantsResult } from 'src/common'
import { TestArgs } from 'src/common/test-variants/-test/types'

/**
 * Validates iteration count in test result
 *
 * ## Applicability
 * Active when test completes without error.
 * Validates result.iterations matches expected calculation.
 *
 * ## Validated Rules
 * - iterations >= 0
 * - When no error: iterations equals sum of iterations from all test calls
 * - When error occurred: iterations <= expected (some calls may not have completed)
 */
export class IterationsInvariant {
  private readonly _iterationsSync: number
  private readonly _iterationsAsync: number
  private readonly _isAsync: boolean | null

  constructor(
    iterationsSync: number,
    iterationsAsync: number,
    isAsync: boolean | null,
  ) {
    this._iterationsSync = iterationsSync
    this._iterationsAsync = iterationsAsync
    this._isAsync = isAsync
  }

  /**
   * Validates iteration count after test execution
   *
   * @param callCount - Number of test function calls
   * @param result - The test result (null when error thrown)
   */
  validate(
    callCount: number,
    result: TestVariantsResult<TestArgs> | null,
  ): void {
    if (result == null) {
      return
    }

    if (result.iterations < 0) {
      throw new Error(
        `[test][IterationsInvariant] iterations ${result.iterations} < 0`,
      )
    }

    const iterationsExpected = this._calculateExpectedIterations(callCount)

    if (result.bestError != null) {
      // When error occurred, iterations may be less than expected
      // because the failing call's iterations are not counted
      if (result.iterations > iterationsExpected) {
        throw new Error(
          `[test][IterationsInvariant] iterations ${result.iterations} > expected ${iterationsExpected} (with error)`,
        )
      }
    } else {
      // When no error, iterations must match exactly
      if (result.iterations !== iterationsExpected) {
        throw new Error(
          `[test][IterationsInvariant] iterations ${result.iterations} !== expected ${iterationsExpected}`,
        )
      }
    }
  }

  private _calculateExpectedIterations(callCount: number): number {
    if (this._isAsync === true) {
      return callCount * this._iterationsAsync
    }
    if (this._isAsync === false) {
      return callCount * this._iterationsSync
    }
    // Mixed mode: even-numbered calls are async, odd-numbered calls are sync
    const syncCalls = Math.ceil(callCount / 2)
    const asyncCalls = Math.floor(callCount / 2)
    return syncCalls * this._iterationsSync + asyncCalls * this._iterationsAsync
  }
}
