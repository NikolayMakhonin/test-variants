import {
  AbortControllerFast,
  IAbortControllerFast,
  IAbortSignalFast,
} from '@flemist/abort-controller-fast'
import { TimeControllerMock } from '@flemist/time-controller'
import { delay, PromiseOrValue } from '@flemist/async-utils'
import { isLogEnabled } from '../log'
import { log } from 'src/common/helpers/log'
import { TestFuncResult } from 'src/common/test-variants/types'
import { ITERATIONS_ASYNC, ITERATIONS_SYNC } from '../constants'
import { TestError } from '../helpers/TestError'

/**
 * Emulates test function call with sync/async behavior
 * Counts number of calls
 */
export class CallController {
  private _callCount = 0
  private readonly _isAsync: boolean | null
  private readonly _shouldDelay: boolean | null
  private readonly _abortController: IAbortControllerFast
  private readonly _timeController: TimeControllerMock

  constructor(isAsync: boolean | null, shouldDelay: boolean | null) {
    this._isAsync = isAsync
    this._shouldDelay = shouldDelay
    this._abortController = new AbortControllerFast()
    this._timeController = new TimeControllerMock()
  }

  /** Use inside test func */
  call(start: () => void, end: () => void): PromiseOrValue<TestFuncResult> {
    this._callCount++

    start()

    const shouldBeAsync =
      (this._isAsync == null && this._callCount % 2 === 0) || this._isAsync

    if (isLogEnabled()) {
      log('[test][CallController][execute]', {
        callCount: this._callCount,
        shouldBeAsync,
      })
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

    const onError = (err: any): never => {
      if (!(err instanceof TestError)) {
        this._abortController.abort()
      }
      throw err
    }

    if (shouldBeAsync) {
      if (this._shouldDelay) {
        return delay(
          1,
          this._abortController.signal,
          this._timeController,
        ).then(complete, onError)
      }
      return Promise.resolve().then(complete, onError)
    }

    try {
      return complete()
    } catch (err) {
      return onError(err)
    }
  }

  get callCount(): number {
    return this._callCount
  }

  get abortSignal(): IAbortSignalFast {
    return this._abortController.signal
  }

  get timeController(): TimeControllerMock {
    return this._timeController
  }

  finalize(): void {
    this._abortController.abort()
  }
}
