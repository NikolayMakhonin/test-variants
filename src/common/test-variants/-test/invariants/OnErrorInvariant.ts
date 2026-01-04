import { TestArgs } from 'src/common/test-variants/-test/types'
import { TestError } from 'src/common/test-variants/-test/helpers/TestError'

/**
 * Validates onError callback behavior
 *
 * ## Applicability
 * Active when errors occur during test execution.
 * Validates onError callback is called correctly.
 *
 * ## Validated Rules
 * - Without findBestError: onError called at most once
 * - With findBestError: onError can be called multiple times
 * - args parameter matches the error variant args
 * - tests parameter matches callCount
 * - error parameter matches the thrown error
 */
export class OnErrorInvariant {
  private onErrorCount = 0
  private readonly findBestErrorEnabled: boolean

  constructor(findBestErrorEnabled: boolean) {
    this.findBestErrorEnabled = findBestErrorEnabled
  }

  onError(
    event: { error: unknown; args: TestArgs; tests: number },
    expectedArgs: TestArgs | null,
    expectedCallCount: number,
    expectedError: TestError | null,
  ): void {
    if (this.onErrorCount > 0 && !this.findBestErrorEnabled) {
      throw new Error(`onError called multiple times`)
    }
    this.onErrorCount++
    if (event.args !== expectedArgs) {
      throw new Error(`onError: args do not match errorVariantArgs`)
    }
    if (event.tests !== expectedCallCount) {
      throw new Error(
        `onError: tests ${event.tests} !== callCount ${expectedCallCount}`,
      )
    }
    if (event.error !== expectedError) {
      throw new Error(`onError: error does not match`)
    }
  }
}
