import type { IAbortSignalFast } from '@flemist/abort-controller-fast'
import type { ITimeController } from '@flemist/time-controller'

/**
 * Validates callOptions passed to test function
 *
 * ## Applicability
 * Active for every test function call. Validates callOptions properties.
 *
 * ## Validated Rules
 * - abortSignal is provided and is an object
 * - timeController matches expected controller (identity check)
 *
 * ## Why abortSignal.aborted is NOT checked
 * The library creates a combined abortSignal from external + parallel abort controller.
 * When sequentialOnError triggers (findBestError switches from parallel to sequential),
 * the library aborts the parallel controller, which aborts the combined signal.
 * Subsequent sequential tests are still called with this aborted signal.
 * This is valid library behavior - the aborted signal just indicates parallel execution
 * was cancelled, but sequential execution continues.
 *
 * Tests should handle aborted signals gracefully (check signal before async operations).
 *
 * ## Why abortSignal identity is NOT checked
 * The library creates a NEW combined signal (combineAbortSignals) which is different
 * from our mock's abortController.signal. Checking identity would always fail.
 */
export class CallOptionsInvariant {
  private readonly _timeController: ITimeController

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
  }
}
