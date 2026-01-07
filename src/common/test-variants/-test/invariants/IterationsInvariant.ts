import type { TestVariantsResult } from 'src/common'
import { TestArgs } from 'src/common/test-variants/-test/types'

/**
 * Validates iteration count in test result
 *
 * ## Applicability
 * Test completion when result is returned
 *
 * ## Invariants
 * - iterations ≥ 0
 * - iterations equals sum of iterations from all completed test calls
 * - Calculation based on completedCount
 * - Mixed mode: call 1 is sync, call 2 is async, call 3 is sync, etc
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

  /** Run after test variants completion */
  validateFinal(
    completedCount: number,
    result: TestVariantsResult<TestArgs> | null,
  ): void {
    if (result == null) {
      return
    }

    if (result.iterations < 0) {
      throw new Error(
        `[test][IterationsInvariant] iterations (${result.iterations}) < 0`,
      )
    }

    const expected = this._calculateExpectedIterations(completedCount)

    if (result.iterations !== expected) {
      throw new Error(
        `[test][IterationsInvariant] iterations (${result.iterations}) !== expected (${expected}), completedCount (${completedCount})`,
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
    const syncCalls = Math.ceil(completedCount / 2)
    const asyncCalls = Math.floor(completedCount / 2)
    return syncCalls * this._iterationsSync + asyncCalls * this._iterationsAsync
  }
}
