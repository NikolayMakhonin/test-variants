import { deepEqualJsonLike } from '@flemist/simple-utils'
import { TestArgs } from 'src/common/test-variants/-test/types'
import { TestError } from 'src/common/test-variants/-test/helpers/TestError'

/**
 * Emulates error thrown for error variant after N retries
 */
export class ErrorVariantController {
  private _retries = 0
  private _lastError: TestError | null = null
  private readonly _errorVariantArgs: TestArgs | null
  private readonly _retriesToError: number

  constructor(errorVariantArgs: TestArgs | null, retriesToError: number) {
    this._errorVariantArgs = errorVariantArgs
    this._retriesToError = retriesToError
  }

  /** Run inside test func */
  onCall(args: TestArgs): void {
    const isErrorVariant = deepEqualJsonLike(args, this.errorVariantArgs)
    if (isErrorVariant) {
      this._retries++
      if (this._retries > this._retriesToError) {
        this._retries = 0
        this._lastError = new TestError('TEST ERROR')
        throw this.lastError
      }
    }
  }

  get lastError(): TestError | null {
    return this._lastError
  }

  get errorVariantArgs(): TestArgs | null {
    return this._errorVariantArgs
  }
}
