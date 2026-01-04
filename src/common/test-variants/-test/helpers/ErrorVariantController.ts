import { deepEqualJsonLike } from '@flemist/simple-utils'
import { TestArgs } from 'src/common/test-variants/-test/types'
import { TestError } from 'src/common/test-variants/-test/helpers/TestError'

/**
 * Controls error variant behavior during test execution
 *
 * Tracks error attempts and throws TestError when retry limit is exceeded.
 *
 * ## Behavior
 * - Compares current args with errorVariantArgs using deep equality
 * - Increments errorAttempts on each match
 * - Throws TestError when errorAttempts exceeds retriesToError
 * - Resets errorAttempts after throwing
 */
export class ErrorVariantController {
  private errorAttempts = 0
  private lastError: TestError | null = null
  private readonly errorVariantArgs: TestArgs | null
  private readonly retriesToError: number

  constructor(errorVariantArgs: TestArgs | null, retriesToError: number) {
    this.errorVariantArgs = errorVariantArgs
    this.retriesToError = retriesToError
  }

  /**
   * Checks if current args match error variant and throws if retry limit exceeded
   *
   * @param args - Current test args
   * @param callIndex - Current call index (0-based)
   * @throws TestError when errorAttempts exceeds retriesToError
   */
  onCall(args: TestArgs, callIndex: number): void {
    const isErrorVariant = deepEqualJsonLike(args, this.errorVariantArgs)
    if (isErrorVariant) {
      this.errorAttempts++
      if (this.errorAttempts > this.retriesToError) {
        this.errorAttempts = 0
        this.lastError = new TestError(`Test error at variant ${callIndex}`)
        throw this.lastError
      }
    }
  }

  getLastError(): TestError | null {
    return this.lastError
  }

  getErrorVariantArgs(): TestArgs | null {
    return this.errorVariantArgs
  }
}
