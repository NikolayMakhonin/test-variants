import type { IAbortSignalFast } from '@flemist/abort-controller-fast'
import type { ITimeController } from '@flemist/time-controller'
import { delay, PromiseOrValue } from '@flemist/async-utils'
import { isLogEnabled } from '../log'
import { log } from 'src/common/helpers/log'
import { TestFuncResult } from 'src/common/test-variants/types'
import { ITERATIONS_ASYNC, ITERATIONS_SYNC } from '../constants'

/**
 * Emulates test function call with sync/async behavior
 * Counts number of calls
 */
export class CallController {
  private _callCount = 0
  private readonly _isAsync: boolean | null
  private readonly _shouldDelay: boolean | null
  private readonly _abortSignal: IAbortSignalFast
  private readonly _timeController: ITimeController

  constructor(
    isAsync: boolean | null,
    shouldDelay: boolean | null,
    abortSignal: IAbortSignalFast,
    timeController: ITimeController,
  ) {
    this._isAsync = isAsync
    this._shouldDelay = shouldDelay
    this._abortSignal = abortSignal
    this._timeController = timeController
  }

  /** Use inside test func */
  call(start: () => void, end: () => void): PromiseOrValue<TestFuncResult> {
    this._callCount++

    start()

    const shouldBeAsync =
      (this._isAsync == null && this._callCount % 2 === 0) || this._isAsync

    if (isLogEnabled()) {
      log(
        `[test][CallController][execute] callCount=${this._callCount} isAsync=${shouldBeAsync}`,
      )
    }

    function complete(): TestFuncResult {
      end()

      if (shouldBeAsync) {
        return {
          iterationsSync: 0,
          iterationsAsync: ITERATIONS_ASYNC,
        }
      } else {
        return {
          iterationsSync: ITERATIONS_SYNC,
          iterationsAsync: 0,
        }
      }
    }

    if (shouldBeAsync) {
      if (this._shouldDelay) {
        return delay(1, this._abortSignal, this._timeController).then(complete)
      }
      return Promise.resolve().then(complete)
    }

    return complete()
  }

  get callCount(): number {
    return this._callCount
  }
}
