import type { NumberRange } from '@flemist/simple-utils'

/**
 * Validates call count bounds
 *
 * ## Applicability
 * - Every test function call
 *
 * ## Invariants
 * - callCount never exceeds callCountRange
 */
export class CallCountInvariant {
  private readonly _callCountRange: NumberRange

  constructor(callCountRange: NumberRange) {
    this._callCountRange = callCountRange
  }

  /** Use inside test func */
  onCall(callCount: number): void {
    if (callCount > this._callCountRange[1]) {
      throw new Error(
        `[test][CallCountInvariant] callCount ${callCount} > max ${this._callCountRange[1]}`,
      )
    }
  }

  /** Run after test variants completion */
  validateFinal(callCount: number): void {
    if (callCount < this._callCountRange[0]) {
      throw new Error(
        `[test][CallCountInvariant] callCount ${callCount} < min ${this._callCountRange[0]}`,
      )
    }
    if (callCount > this._callCountRange[1]) {
      throw new Error(
        `[test][CallCountInvariant] callCount ${callCount} > max ${this._callCountRange[1]}`,
      )
    }
  }
}
