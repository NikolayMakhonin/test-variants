/**
 * Validates parallel execution behavior
 *
 * ## Applicability
 * Active when callCount >= 2. Validates concurrency matches configuration.
 *
 * ## Validated Rules
 * - Sync-only tests (isAsync=false) never have parallel execution
 * - With parallel > 1 and async calls, actual parallelism occurs
 * - Concurrent calls never exceed parallelLimit
 */
export class ParallelInvariant {
  private concurrentCalls = 0
  private maxConcurrentCalls = 0
  private readonly parallelLimit: number

  constructor(parallel: number | boolean | undefined | null) {
    this.parallelLimit =
      parallel === true ? Infinity : typeof parallel === 'number' ? parallel : 1
  }

  onCallStart(): void {
    this.concurrentCalls++
    if (this.concurrentCalls > this.maxConcurrentCalls) {
      this.maxConcurrentCalls = this.concurrentCalls
    }
    if (this.concurrentCalls > this.parallelLimit) {
      throw new Error(
        `[test][ParallelInvariant] concurrentCalls ${this.concurrentCalls} exceeded limit ${this.parallelLimit}`,
      )
    }
  }

  onCallEnd(): void {
    this.concurrentCalls--
  }

  /**
   * Validates parallel execution after test completion
   *
   * @param callCount - Total number of test function calls
   * @param isAsync - Whether async execution was used (null = mixed)
   */
  validateFinal(callCount: number, isAsync: boolean | null): void {
    if (callCount >= 2) {
      if (isAsync === false) {
        if (this.maxConcurrentCalls > 1) {
          throw new Error(
            `[test][ParallelInvariant] sync tests should not have parallel but maxConcurrentCalls=${this.maxConcurrentCalls}`,
          )
        }
      } else if (this.parallelLimit > 1) {
        if (this.maxConcurrentCalls < 2) {
          throw new Error(
            `[test][ParallelInvariant] parallel expected (limit=${this.parallelLimit}, calls=${callCount}) but maxConcurrentCalls=${this.maxConcurrentCalls}`,
          )
        }
      }
    }
  }
}
