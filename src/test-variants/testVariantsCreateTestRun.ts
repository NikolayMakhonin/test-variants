import {type IAbortSignalFast} from '@flemist/abort-controller-fast'
import {isPromiseLike, type PromiseOrValue} from '@flemist/async-utils'
import {Obj} from 'src/test-variants/types'
import {argsToString} from 'src/test-variants/argsToString'

export type ErrorEvent<Args extends Obj> = {
  error: any,
  args: Args,
  index: number,
}

export type OnErrorCallback<Args extends Obj> = (event: ErrorEvent<Args>) => PromiseOrValue<void>

export type TestVariantsCreateTestRunOptions<Args extends Obj> = {
  onError?: null | OnErrorCallback<Args>,
  logError?: null | boolean,
}

export type TestVariantsTestRunResult = void | {
  iterationsAsync: number,
  iterationsSync: number,
}

export type TestVariantsTestRun<Args extends Obj> =(
  args: Args, index: number, abortSignal: IAbortSignalFast
) => PromiseOrValue<TestVariantsTestRunResult>

export type TestVariantsTestResult = number | void | TestVariantsTestRunResult

export type TestVariantsTest<Args extends Obj> = (args: Args & { seed?: null | number }, abortSignal: IAbortSignalFast)
  => PromiseOrValue<TestVariantsTestResult>

export function testVariantsCreateTestRun<Args extends Obj>(
  test: TestVariantsTest<Args>,
  options?: null | TestVariantsCreateTestRunOptions<Args>,
): TestVariantsTestRun<Args> {
  const logError = options?.logError ?? true
  let debugIteration = 0

  let errorEvent: ErrorEvent<Args> | null = null

  async function onError(
    error: any,
    args: Args,
    index: number,
  ): Promise<void> {
    errorEvent = {
      error,
      args,
      index: index,
    }
    if (logError) {
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
      await options.onError(errorEvent)
    }

    throw errorEvent.error
  }

  return function testRun(
    args: Args,
    index: number,
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
          return onError(err, args, index)
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
      return onError(err, args, index)
    }
  }
}
