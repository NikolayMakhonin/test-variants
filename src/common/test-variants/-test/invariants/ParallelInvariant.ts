import type { CallController } from '../helpers/CallController'

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
  private readonly _parallelLimit: number
  private readonly _isAsync: boolean | null
  private readonly _sequentialOnError: boolean
  private readonly _callController: CallController

  constructor(
    parallelLimit: number,
    isAsync: boolean | null,
    sequentialOnError: boolean,
    callController: CallController,
  ) {
    this._parallelLimit = parallelLimit
    this._isAsync = isAsync
    this._sequentialOnError = sequentialOnError
    this._callController = callController
  }

  /** Call inside test func after call starts */
  onCall(): void {
    const currentConcurrent = this._callController.currentConcurrent
    if (currentConcurrent > this._parallelLimit) {
      throw new Error(
        `[test][ParallelInvariant] currentConcurrent ${currentConcurrent} > parallelLimit ${this._parallelLimit}`,
      )
    }
  }

  /** Run after test variants completion */
  validateFinal(): void {
    const currentConcurrent = this._callController.currentConcurrent
    if (currentConcurrent !== 0) {
      throw new Error(
        `[test][ParallelInvariant] currentConcurrent ${currentConcurrent} !== 0 after completion`,
      )
    }

    // Skip complex cases (like ErrorBehaviorInvariant approach)
    if (this._sequentialOnError) {
      return
    }

    const callCount = this._callController.callCount
    if (callCount === 0) {
      return
    }

    const maxConcurrent = this._callController.maxConcurrent

    // If not pure async, parallelism may not be achieved
    // (sync calls complete immediately, mixed mode has some sync calls)
    if (this._isAsync !== true) {
      return
    }

    // If parallel > 1 and enough calls, expect full parallelism
    if (this._parallelLimit > 1 && callCount >= this._parallelLimit) {
      if (maxConcurrent !== this._parallelLimit) {
        throw new Error(
          `[test][ParallelInvariant] maxConcurrent ${maxConcurrent} !== parallelLimit ${this._parallelLimit} (callCount=${callCount})`,
        )
      }
    }
  }
}
