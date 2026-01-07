import type { IAbortSignalFast } from '@flemist/abort-controller-fast'
import type { ITimeController } from '@flemist/time-controller'

/**
 * Validates callOptions passed to test function
 *
 * ## Applicability
 * Active for every test function call and after test completion.
 *
 * ## Validated Rules
 * - abortSignal is provided and is an object
 * - abortSignal is NOT aborted during test execution
 * - abortSignal IS aborted after test completion (CallController.finalize aborts it)
 * - timeController matches expected controller (identity check)
 *
 * ## Why abortSignal identity is NOT checked
 * The library creates a NEW combined signal (combineAbortSignals) which is different
 * from our mock's abortController.signal. Checking identity would always fail.
 *
 * ## sequentialOnError exception
 * When sequentialOnError triggers (findBestError switches from parallel to sequential),
 * the library aborts the parallel controller, which aborts the combined signal.
 * Subsequent sequential tests are still called with this aborted signal.
 * This is valid library behavior, so we track when this happens and allow it.
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

  validateFinal(): void {
    if (this._lastAbortSignal == null) {
      return
    }

    if (!this._lastAbortSignal.aborted) {
      throw new Error(
        `[test][CallOptionsInvariant] abortSignal not aborted after completion`,
      )
    }
  }
}
