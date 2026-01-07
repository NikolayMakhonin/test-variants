import { TestArgs } from 'src/common/test-variants/-test/types'
import { TestError } from 'src/common/test-variants/-test/helpers/TestError'
import { deepEqualJsonLikeWithoutSeed } from 'src/common/test-variants/-test/helpers/deepEqualJsonLikeWithoutSeed'

/**
 * Emulates error thrown for error variant after N retries
 */
export class ErrorVariantController {
  private _retries = 0
  private _lastThrownError: TestError | null = null
  private readonly _errorVariantArgs: TestArgs | undefined | null
  private readonly _retriesToError: number
  private _nextErrorId: number = 0

  constructor(
    errorVariantArgs: TestArgs | null | undefined,
    retriesToError: number,
  ) {
    this._errorVariantArgs = errorVariantArgs
    this._retriesToError = retriesToError
  }

  /** Use inside test func */
  onCall(args: TestArgs): void {
    const isErrorVariant =
      this.errorVariantArgs != null &&
      deepEqualJsonLikeWithoutSeed(args, this.errorVariantArgs)
    if (isErrorVariant) {
      this._retries++
      if (this._retries > this._retriesToError) {
        this._retries = 0
        this._lastThrownError = new TestError(
          `TEST ERROR: ${this._nextErrorId}`,
        )
        this._nextErrorId++
        throw this.lastThrownError
      }
    }
  }

  get lastThrownError(): TestError | null {
    return this._lastThrownError
  }

  get errorVariantArgs(): TestArgs | null {
    return this._errorVariantArgs ?? null
  }
}
