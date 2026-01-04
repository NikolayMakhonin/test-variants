import type { TestVariantsRunResult } from 'src/common'
import { TestArgs } from 'src/common/test-variants/-test/types'

/**
 * Validates iteration count in test result
 *
 * ## Applicability
 * Active when test completes without thrown error.
 * Validates result.iterations matches expected calculation.
 *
 * ## Validated Rules
 * - iterations >= 0
 * - iterations equals sum of iterations from all test calls based on sync/async mode
 */
export class IterationsInvariant {
  private readonly iterationsSync: number
  private readonly iterationsAsync: number
  private readonly isAsync: boolean | null

  constructor(
    iterationsSync: number,
    iterationsAsync: number,
    isAsync: boolean | null,
  ) {
    this.iterationsSync = iterationsSync
    this.iterationsAsync = iterationsAsync
    this.isAsync = isAsync
  }

  /**
   * Validates iteration count after test execution
   *
   * @param callCount - Number of test function calls
   * @param result - The test result (null when error thrown)
   */
  validate(
    callCount: number,
    result: TestVariantsRunResult<TestArgs> | null,
  ): void {
    if (result == null) {
      return
    }

    if (result.iterations < 0) {
      throw new Error(
        `[test][IterationsInvariant] iterations ${result.iterations} < 0`,
      )
    }

    const iterationsExpected = this.calculateExpectedIterations(callCount)
    if (result.iterations !== iterationsExpected) {
      throw new Error(
        `[test][IterationsInvariant] iterations ${result.iterations} !== expected ${iterationsExpected}`,
      )
    }
  }

  private calculateExpectedIterations(callCount: number): number {
    if (this.isAsync === true) {
      return callCount * this.iterationsAsync
    }
    if (this.isAsync === false) {
      return callCount * this.iterationsSync
    }
    // Mixed mode: even-numbered calls are async, odd-numbered calls are sync
    const syncCalls = Math.ceil(callCount / 2)
    const asyncCalls = Math.floor(callCount / 2)
    return syncCalls * this.iterationsSync + asyncCalls * this.iterationsAsync
  }
}
