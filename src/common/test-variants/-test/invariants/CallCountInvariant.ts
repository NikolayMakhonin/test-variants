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
  private callCount = 0
  private readonly callCountMin: number
  private readonly callCountMax: number

  constructor(callCountRange: NumberRange) {
    this.callCountMin = callCountRange[0]
    this.callCountMax = callCountRange[1]
  }

  onCall(): number {
    ++this.callCount
    if (this.callCount > this.callCountMax) {
      throw new Error(
        `testFunc: callCount ${this.callCount} exceeded max ${this.callCountMax}`,
      )
    }
    return this.callCount
  }

  getCallCount(): number {
    return this.callCount
  }

  validateFinal(): void {
    if (this.callCount < this.callCountMin) {
      throw new Error(
        `testFunc: callCount ${this.callCount} < min ${this.callCountMin}`,
      )
    }
    if (this.callCount > this.callCountMax) {
      throw new Error(
        `testFunc: callCount ${this.callCount} > max ${this.callCountMax}`,
      )
    }
  }
}
