import type { IAbortSignalFast } from '@flemist/abort-controller-fast'
import type { ITimeController } from '@flemist/time-controller'

/**
 * Validates TestOptions passed to test function
 *
 * ## Applicability
 * Every test function call
 *
 * ## Invariants
 * - abortSignal exists
 * - timeController matches expected instance
 * - abortSignal is aborted after CallController.finalize
 *
 * ## Skipped Validations
 * - abortSignal identity (library combines signals via combineAbortSignals)
 * - abortSignal.aborted after first error with sequentialOnError (library aborts internal controller)
 */
export class CallOptionsInvariant {
  private readonly _timeController: ITimeController
  private _abortedDuringExecution = false
  private _lastAbortSignal: IAbortSignalFast | null = null

  constructor(timeController: ITimeController) {
    this._timeController = timeController
  }

  /** Use inside test func */
  onCall(callOptions: {
    abortSignal?: IAbortSignalFast
    timeController?: ITimeController
  }): void {
    if (callOptions.abortSignal == null) {
      throw new Error(`[test][CallOptionsInvariant] abortSignal is null`)
    }
    if (callOptions.timeController !== this._timeController) {
      throw new Error(`[test][CallOptionsInvariant] timeController mismatch`)
    }

    this._lastAbortSignal = callOptions.abortSignal

    if (callOptions.abortSignal.aborted && !this._abortedDuringExecution) {
      this._abortedDuringExecution = true
    }
  }

  /** Run after test variants completion */
  validateFinal(abortSignalShouldBeAborted: boolean): void {
    if (this._lastAbortSignal == null) {
      return
    }

    if (abortSignalShouldBeAborted && !this._lastAbortSignal.aborted) {
      throw new Error(
        `[test][CallOptionsInvariant] abortSignal not aborted after CallController.finalize()`,
      )
    }
  }
}
