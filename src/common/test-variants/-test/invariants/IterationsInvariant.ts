import type { TestVariantsResult } from 'src/common'
import type { StressTestArgs, TestArgs } from '../types'
import { ITERATIONS_SYNC, ITERATIONS_ASYNC } from '../constants'

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
  private readonly _options: StressTestArgs

  constructor(options: StressTestArgs) {
    this._options = options
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
    if (this._options.async === true) {
      return completedCount * ITERATIONS_ASYNC
    }
    if (this._options.async === false) {
      return completedCount * ITERATIONS_SYNC
    }
    const syncCalls = Math.ceil(completedCount / 2)
    const asyncCalls = Math.floor(completedCount / 2)
    return syncCalls * ITERATIONS_SYNC + asyncCalls * ITERATIONS_ASYNC
  }
}
