import {type IAbortSignalFast} from '@flemist/abort-controller-fast'
import {isPromiseLike, type PromiseOrValue} from '@flemist/async-utils'
import {Obj} from 'src/test-variants/types'
import {argsToString} from 'src/test-variants/argsToString'

export type ErrorEvent<Args extends Obj> = {
  error: any,
  args: Args,
  /** Number of tests run before this error (including attemptsPerVariant) */
  tests: number,
}

export type OnErrorCallback<Args extends Obj> = (event: ErrorEvent<Args>) => PromiseOrValue<void>

export type TestVariantsCreateTestRunOptions<Args extends Obj> = {
  onError?: null | OnErrorCallback<Args>,
  /** Logging options; null/true uses defaults; false disables all */
  log?: null | boolean | { error?: null | boolean },
}

export type TestVariantsTestRunResult = void | {
  iterationsAsync: number,
  iterationsSync: number,
}

export type TestVariantsTestRun<Args extends Obj> =(
  args: Args, tests: number, abortSignal: IAbortSignalFast
) => PromiseOrValue<TestVariantsTestRunResult>

export type TestVariantsTestResult = number | void | TestVariantsTestRunResult

export type TestVariantsTest<Args extends Obj> = (args: Args, abortSignal: IAbortSignalFast)
  => PromiseOrValue<TestVariantsTestResult>

export function testVariantsCreateTestRun<Args extends Obj>(
  test: TestVariantsTest<Args>,
  options?: null | TestVariantsCreateTestRunOptions<Args>,
): TestVariantsTestRun<Args> {
  const log = options?.log
  const logError = log === false
    ? false
    : log === true || log == null
      ? true
      : log.error ?? true

  let errorEvent: ErrorEvent<Args> | null = null

  async function onError(
    error: any,
    args: Args,
    tests: number,
  ): Promise<void> {
    errorEvent = {
      error,
      args,
      tests,
    }
    if (logError) {
      console.error(`[test-variants] error variant: ${tests}\n${argsToString(args)}`)
      console.error(error)
    }

    if (options.onError) {
      await options.onError(errorEvent)
    }

    throw errorEvent.error
  }

  return function testRun(
    args: Args,
    tests: number,
    abortSignal: IAbortSignalFast,
  ): PromiseOrValue<TestVariantsTestRunResult> {
    try {
      const promiseOrIterations = test(args, abortSignal)

      if (isPromiseLike(promiseOrIterations)) {
        return promiseOrIterations.then(value => {
          // README: "number is equivalent to iterationsSync" - applies regardless of async/sync test
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
            iterationsAsync: 1,
            iterationsSync : 0,
          }
        }, err => {
          return onError(err, args, tests)
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
      return onError(err, args, tests)
    }
  }
}
