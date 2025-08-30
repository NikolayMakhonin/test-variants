import {type IAbortSignalFast} from '@flemist/abort-controller-fast'
import {isPromiseLike, type PromiseOrValue} from '@flemist/async-utils'
import {Obj} from 'src/test-variants/types'
import {argsToString} from 'src/test-variants/argsToString'

export type ErrorEvent<Args extends Obj> = {
  error: any,
  index: number,
  args: Args,
}

export type OnErrorCallback<Args extends Obj> = (event: ErrorEvent<Args>) => void

export type TestVariantsCreateTestRunOptions<Args extends Obj> = {
  onError?: null | OnErrorCallback<Args>,
}

export type TestVariantsTestRunResult = void | {
  iterationsAsync: number,
  iterationsSync: number,
}

export type TestVariantsTestRun<Args extends Obj> =(
  index: number, args: Args, abortSignal: IAbortSignalFast
) => PromiseOrValue<TestVariantsTestRunResult>

export type TestVariantsTestResult = number | void | TestVariantsTestRunResult

export type TestVariantsTest<Args extends Obj> = (args: Args & { seed?: null | number }, abortSignal: IAbortSignalFast)
  => PromiseOrValue<TestVariantsTestResult>

export function testVariantsCreateTestRun<Args extends Obj>(
  test: TestVariantsTest<Args>,
  options?: null | TestVariantsCreateTestRunOptions<Args>,
): TestVariantsTestRun<Args> {
  let debugIteration = 0

  let errorEvent: ErrorEvent<Args> | null = null

  function onError(
    error: any,
    index: number,
    args: Args,
  ): void {
    if (!errorEvent) {
      errorEvent = {
        error,
        index: index,
        args : args,
      }
      console.error(`[test-variants] error variant: ${index}\n${argsToString(args)}`)
      console.error(error)
    }

    // Rerun failed variant 5 times for debug
    const time0 = Date.now()
    // Will stop execution right before next error iteration for step-by-step debugging
    // eslint-disable-next-line no-debugger
    debugger
    if (Date.now() - time0 > 50 && debugIteration < 5) {
      console.log('[test-variants] DEBUG ITERATION: ' + debugIteration)
      debugIteration++
      return
    }

    if (options.onError) {
      options.onError(errorEvent)
    }

    throw errorEvent.error
  }

  return function testRun(
    index: number,
    args: Args,
    abortSignal: IAbortSignalFast,
  ): PromiseOrValue<TestVariantsTestRunResult> {
    try {
      const promiseOrIterations = test(args, abortSignal)

      if (isPromiseLike(promiseOrIterations)) {
        return promiseOrIterations.then(value => {
          if (typeof value === 'number') {
            return {
              iterationsAsync: value,
              iterationsSync : 0,
            }
          }
          if (value !== null && typeof value === 'object') {
            return value
          }
          return {
            iterationsAsync: 1,
            iterationsSync : 0,
          }
        }, err => {
          onError(err, index, args)
        })
      }

      const value = promiseOrIterations
      if (typeof value === 'number') {
        return {
          iterationsAsync: 0,
          iterationsSync : value,
        }
      }
      if (value !== null && typeof value === 'object') {
        return value
      }
      return {
        iterationsAsync: 0,
        iterationsSync : 1,
      }
    }
    catch (err) {
      onError(err, index, args)
    }
  }
}
