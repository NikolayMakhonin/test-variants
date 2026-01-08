import type { TestVariantsRunOptions } from 'src/common'
import type { StressTestArgs, TestArgs } from '../types'
import type { CallController } from '../helpers/CallController'
import { getParallelLimit } from '../helpers/getParallelLimit'

/**
 * Validates parallel execution behavior
 *
 * ## Applicability
 * Active when parallel execution is configured. Validates concurrency.
 *
 * ## Validated Rules
 * - Concurrent calls never exceed parallelLimit
 * - All calls complete (currentConcurrent === 0) after test execution
 * - Sync-only tests (isAsync=false) have maxConcurrent === 1
 * - With parallelLimit > 1 and enough calls, maxConcurrent === parallelLimit
 */
export class ParallelInvariant {
  private readonly _options: StressTestArgs
  private readonly _runOptions: TestVariantsRunOptions<TestArgs>
  private readonly _callController: CallController

  constructor(
    options: StressTestArgs,
    runOptions: TestVariantsRunOptions<TestArgs>,
    callController: CallController,
  ) {
    this._options = options
    this._runOptions = runOptions
    this._callController = callController
  }

  /** Call inside test func after call starts */
  onCall(): void {
    const parallelLimit = getParallelLimit(this._runOptions.parallel)
    const currentConcurrent = this._callController.currentConcurrent
    if (currentConcurrent > parallelLimit) {
      throw new Error(
        `[test][ParallelInvariant] currentConcurrent ${currentConcurrent} > parallelLimit ${parallelLimit}`,
      )
    }
  }

  /** Run after test variants completion */
  validateFinal(): void {
    const parallel = this._runOptions.parallel
    const parallelLimit = getParallelLimit(parallel)
    const sequentialOnError =
      parallel != null && typeof parallel === 'object'
        ? (parallel.sequentialOnError ?? false)
        : false

    const currentConcurrent = this._callController.currentConcurrent
    if (currentConcurrent !== 0) {
      throw new Error(
        `[test][ParallelInvariant] currentConcurrent ${currentConcurrent} !== 0 after completion`,
      )
    }

    // Skip complex cases (like ErrorBehaviorInvariant approach)
    if (sequentialOnError) {
      return
    }

    const callCount = this._callController.callCount
    if (callCount === 0) {
      return
    }

    const maxConcurrent = this._callController.maxConcurrent

    // If sync-only, no parallelism expected
    if (this._options.async === false) {
      if (maxConcurrent !== 1) {
        throw new Error(
          `[test][ParallelInvariant] sync tests should have maxConcurrent=1 but got ${maxConcurrent}`,
        )
      }
      return
    }

    // If not pure async, parallelism may not be achieved
    // (sync calls complete immediately, mixed mode has some sync calls)
    if (this._options.async !== true) {
      return
    }

    // If parallel > 1 and enough calls, expect full parallelism
    if (parallelLimit > 1 && callCount >= parallelLimit) {
      if (maxConcurrent !== parallelLimit) {
        throw new Error(
          `[test][ParallelInvariant] maxConcurrent ${maxConcurrent} !== parallelLimit ${parallelLimit} (callCount=${callCount})`,
        )
      }
    }
  }
}
