import {
  AbortControllerFast,
  IAbortControllerFast,
  IAbortSignalFast,
} from '@flemist/abort-controller-fast'
import { TimeControllerMock } from '@flemist/time-controller'
import { delay, PromiseOrValue } from '@flemist/async-utils'
import { isLogEnabled } from '../log'
import { log } from 'src/common/helpers/log'
import type { TestFuncResult } from 'src/common/test-variants/run/types'
import { ITERATIONS_ASYNC, ITERATIONS_SYNC } from '../constants'
import { TestError } from '../helpers/TestError'

/**
 * Emulates test function call with sync/async behavior
 * Counts number of calls
 */
export class CallController {
  private _callCount = 0
  private _completedCount = 0
  private _currentConcurrent = 0
  private _maxConcurrent = 0
  private readonly _isAsync: boolean | null
  private readonly _withDelay: boolean
  private readonly _abortController: IAbortControllerFast
  private readonly _timeController: TimeControllerMock

  constructor(isAsync: boolean | null, withDelay: boolean) {
    this._isAsync = isAsync
    this._withDelay = withDelay
    this._abortController = new AbortControllerFast()
    this._timeController = new TimeControllerMock()
  }

  /** Use inside test func */
  call(start: () => void, end: () => void): PromiseOrValue<TestFuncResult> {
    this._callCount++
    this._currentConcurrent++
    if (this._currentConcurrent > this._maxConcurrent) {
      this._maxConcurrent = this._currentConcurrent
    }

    start()

    const shouldBeAsync =
      (this._isAsync == null && this._callCount % 2 === 0) || this._isAsync

    if (isLogEnabled()) {
      log('[test][CallController][execute]', {
        callCount: this._callCount,
        currentConcurrent: this._currentConcurrent,
        maxConcurrent: this._maxConcurrent,
        shouldBeAsync,
      })
    }

    let decremented = false
    const decrementConcurrent = () => {
      if (!decremented) {
        decremented = true
        this._currentConcurrent--
      }
    }

    const complete = (): TestFuncResult => {
      decrementConcurrent()
      this._completedCount++
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
      decrementConcurrent()
      if (!(err instanceof TestError)) {
        this._abortController.abort()
      }
      throw err
    }

    if (shouldBeAsync) {
      if (this._withDelay) {
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

  get completedCount(): number {
    return this._completedCount
  }

  get currentConcurrent(): number {
    return this._currentConcurrent
  }

  get maxConcurrent(): number {
    return this._maxConcurrent
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
