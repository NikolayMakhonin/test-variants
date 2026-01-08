import type { IAbortSignalFast } from '@flemist/abort-controller-fast'
import type { ITimeController } from '@flemist/time-controller'
import type { CallController } from '../helpers/CallController'

/**
 * Validates TestOptions passed to test function
 *
 * ## Applicability
 * Every test function call
 *
 * ## Invariants
 * - abortSignal exists and is not null
 * - timeController matches expected instance
 * - abortSignal not aborted on first call
 * - abortSignal aborted after CallController.finalize (combined signal depends on internal signal)
 *
 * ## Skipped Validations
 * - abortSignal identity (library combines signals via combineAbortSignals)
 * - abortSignal.aborted state during execution (depends on errors and sequentialOnError)
 */
export class CallOptionsInvariant {
  private readonly _timeController: ITimeController
  private readonly _callController: CallController
  private _lastAbortSignal: IAbortSignalFast | null = null

  constructor(timeController: ITimeController, callController: CallController) {
    this._timeController = timeController
    this._callController = callController
  }

  /** Use inside test func */
  onCall(callOptions: {
    abortSignal?: IAbortSignalFast
    timeController?: ITimeController
  }): void {
    if (callOptions.abortSignal == null) {
      throw new Error(`[test][CallOptionsInvariant] abortSignal == null`)
    }
    if (callOptions.timeController !== this._timeController) {
      throw new Error(
        `[test][CallOptionsInvariant] timeController !== expected`,
      )
    }

    const callCount = this._callController.callCount
    if (callCount === 1 && callOptions.abortSignal.aborted) {
      throw new Error(
        `[test][CallOptionsInvariant] abortSignal aborted on first call`,
      )
    }

    this._lastAbortSignal = callOptions.abortSignal
  }

  /** Run after test variants completion */
  validateFinal(): void {
    if (this._lastAbortSignal == null) {
      return
    }

    if (!this._lastAbortSignal.aborted) {
      throw new Error(
        `[test][CallOptionsInvariant] abortSignal not aborted after finalize`,
      )
    }
  }
}
