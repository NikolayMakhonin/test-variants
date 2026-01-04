import type { NumberRange } from '@flemist/simple-utils'

/**
 * Validates call count bounds
 *
 * ## Applicability
 * Active for all test executions. Validates every test function call.
 *
 * ## Validated Rules
 * - callCount never exceeds callCountMax
 * - callCount is at least callCountMin after test completion
 */
export class CallCountInvariant {
  private readonly callCountMin: number
  private readonly callCountMax: number

  constructor(callCountRange: NumberRange) {
    this.callCountMin = callCountRange[0]
    this.callCountMax = callCountRange[1]
  }

  onCall(callCount: number): void {
    if (callCount > this.callCountMax) {
      throw new Error(
        `[test][CallCountInvariant] callCount ${callCount} exceeded max ${this.callCountMax}`,
      )
    }
  }

  validateFinal(callCount: number): void {
    if (callCount < this.callCountMin) {
      throw new Error(
        `[test][CallCountInvariant] callCount ${callCount} < min ${this.callCountMin}`,
      )
    }
    if (callCount > this.callCountMax) {
      throw new Error(
        `[test][CallCountInvariant] callCount ${callCount} > max ${this.callCountMax}`,
      )
    }
  }
}
