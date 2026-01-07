import type { TestVariantsResult } from 'src/common'
import { TestArgs } from 'src/common/test-variants/-test/types'

/**
 * Validates iteration count in test result
 *
 * ## Applicability
 * Active for all test executions. Validates result.iterations.
 *
 * ## Validated Rules
 * - iterations >= 0
 * - iterations equals sum of iterations from all COMPLETED (successful) test calls
 * - Calculation based on completedCount, not callCount
 * - Mixed mode: odd calls are sync, even calls are async (1=sync, 2=async, 3=sync, ...)
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
   * @param completedCount - Number of successfully completed test calls
   * @param result - The test result (null when error thrown without dontThrowIfError)
   */
  validate(
    completedCount: number,
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

    const iterationsExpected = this._calculateExpectedIterations(completedCount)

    if (result.iterations !== iterationsExpected) {
      throw new Error(
        `[test][IterationsInvariant] iterations ${result.iterations} !== expected ${iterationsExpected} (completedCount=${completedCount})`,
      )
    }
  }

  private _calculateExpectedIterations(completedCount: number): number {
    if (this._isAsync === true) {
      return completedCount * this._iterationsAsync
    }
    if (this._isAsync === false) {
      return completedCount * this._iterationsSync
    }
    // Mixed mode: odd calls (1, 3, 5, ...) are sync, even calls (2, 4, 6, ...) are async
    const syncCalls = Math.ceil(completedCount / 2)
    const asyncCalls = Math.floor(completedCount / 2)
    return syncCalls * this._iterationsSync + asyncCalls * this._iterationsAsync
  }
}
