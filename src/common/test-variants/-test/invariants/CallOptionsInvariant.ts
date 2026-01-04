import type { IAbortSignalFast } from '@flemist/abort-controller-fast'
import type { ITimeController } from '@flemist/time-controller'

/**
 * Validates callOptions passed to test function
 *
 * ## Applicability
 * Active for every test function call. Validates callOptions properties.
 *
 * ## Validated Rules
 * - abortSignal matches expected signal
 * - abortSignal is not aborted when test is called
 * - timeController matches expected controller
 * - Current time does not exceed limitTime
 */
export class CallOptionsInvariant {
  private readonly abortSignal: IAbortSignalFast
  private readonly timeController: ITimeController
  private readonly limitTime: number | undefined | null

  constructor(
    abortSignal: IAbortSignalFast,
    timeController: ITimeController,
    limitTime: number | undefined | null,
  ) {
    this.abortSignal = abortSignal
    this.timeController = timeController
    this.limitTime = limitTime
  }

  onCall(callOptions: {
    abortSignal?: IAbortSignalFast
    timeController?: ITimeController
  }): void {
    if (callOptions.abortSignal !== this.abortSignal) {
      throw new Error(`testFunc: abortSignal mismatch`)
    }
    if (callOptions.abortSignal.aborted) {
      throw new Error(`testFunc: call after aborted`)
    }
    if (callOptions.timeController !== this.timeController) {
      throw new Error(`testFunc: timeController mismatch`)
    }
    if (this.limitTime != null && this.timeController.now() > this.limitTime) {
      throw new Error(`testFunc: aborted due to time limit`)
    }
  }
}
