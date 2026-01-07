import type { IAbortSignalFast } from '@flemist/abort-controller-fast'
import type { ITimeController } from '@flemist/time-controller'

/**
 * Validates callOptions passed to test function
 *
 * ## Applicability
 * Active for every test function call. Validates callOptions properties.
 *
 * ## Validated Rules
 * - abortSignal is provided
 * - timeController matches expected controller
 *
 * ## Note
 * - abortSignal identity is not checked because the library creates a combined
 *   signal from external + internal parallel abort controller
 * - abortSignal.aborted is not checked because the library may call tests
 *   with an aborted signal (e.g., after sequentialOnError switch)
 * - timeController is passed through unchanged, so identity check works
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
