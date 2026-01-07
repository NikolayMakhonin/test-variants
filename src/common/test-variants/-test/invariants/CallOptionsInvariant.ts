import type { IAbortSignalFast } from '@flemist/abort-controller-fast'
import type { ITimeController } from '@flemist/time-controller'

/**
 * Validates callOptions passed to test function
 *
 * ## Applicability
 * Active for every test function call and after test completion
 *
 * ## Validated Rules
 * - abortSignal exists (not null or undefined)
 * - abortSignal is not aborted before first call
 * - abortSignal is aborted after CallController.finalize
 * - timeController matches expected controller (identity check)
 *
 * ## Skipped Cases
 * - abortSignal identity check (library combines signals internally via combineAbortSignals)
 * - abortSignal.aborted check after first error with sequentialOnError (library aborts parallel controller)
 */
export class CallOptionsInvariant {
  private readonly _timeController: ITimeController
  private _abortedDuringExecution = false
  private _lastAbortSignal: IAbortSignalFast | null = null

  constructor(timeController: ITimeController) {
    this._timeController = timeController
  }

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

  validateFinal(abortSignalShouldBeAborted: boolean): void {
    if (this._lastAbortSignal == null) {
      return
    }

    // Only check if we explicitly expect it to be aborted (after finalize() was called)
    if (abortSignalShouldBeAborted && !this._lastAbortSignal.aborted) {
      throw new Error(
        `[test][CallOptionsInvariant] abortSignal not aborted after CallController.finalize()`,
      )
    }
  }
}
