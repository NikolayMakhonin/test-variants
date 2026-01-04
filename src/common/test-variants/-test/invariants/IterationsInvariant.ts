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
 * - iterations equals sum of (iterationsSync + iterationsAsync) from all test calls
 */
export class IterationsInvariant {
  private readonly iterationsSync: number
  private readonly iterationsAsync: number

  constructor(iterationsSync: number, iterationsAsync: number) {
    this.iterationsSync = iterationsSync
    this.iterationsAsync = iterationsAsync
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

    const iterationsExpected =
      callCount * this.iterationsSync + callCount * this.iterationsAsync
    if (result.iterations !== iterationsExpected) {
      throw new Error(
        `[test][IterationsInvariant] iterations ${result.iterations} !== expected ${iterationsExpected}`,
      )
    }
  }
}
