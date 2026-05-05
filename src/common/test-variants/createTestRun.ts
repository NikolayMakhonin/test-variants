import {
  abortSignalToPromise,
  combineAbortSignals,
  isPromiseLike,
  type PromiseOrValue,
} from '@flemist/async-utils'
import type { Obj, Unsubscribe } from '@flemist/simple-utils'
import {
  type ArgsWithSeed,
  type ErrorEvent,
  type TestVariantsState,
  type TestVariantsTestResult,
  TimeoutError,
} from './types'
import type {
  TestFuncResult,
  TestVariantsCreateTestRunOptions,
  TestVariantsTest,
  TestVariantsTestRun,
} from './run/types'
import { AbortErrorSilent } from 'src/common/test-variants/run/AbortErrorSilent'
import { NowObservable } from './NowObservable'
import { AbortControllerFast } from '@flemist/abort-controller-fast'

/** Minimum pause time (ms) to detect JS debugger stepping */
const DEBUG_PAUSE_THRESHOLD_MS = 50
/** Maximum debug iterations before throwing error */
const MAX_DEBUG_ITERATIONS = 5

function resolveTimeout<Args extends Obj>(
  timeout:
    | null
    | undefined
    | number
    | ((args: Args) => number | null | undefined),
  args: Args,
): number | null {
  if (timeout == null) {
    return null
  }
  if (typeof timeout === 'number') {
    return timeout
  }
  return timeout(args) ?? null
}

function normalizeTestResult(
  value: TestVariantsTestResult,
  isAsync: boolean,
): TestFuncResult {
  if (typeof value === 'number') {
    return { iterationsAsync: 0, iterationsSync: value }
  }
  if (value != null && typeof value === 'object') {
    return value
  }
  return isAsync
    ? { iterationsAsync: 1, iterationsSync: 0 }
    : { iterationsAsync: 0, iterationsSync: 1 }
}

export function createTestRun<Args extends Obj>(
  test: TestVariantsTest<Args>,
  options: TestVariantsCreateTestRunOptions<Args>,
): TestVariantsTestRun<Args> {
  const logOptions = options.log
  const pauseDebuggerOnError = options.pauseDebuggerOnError ?? true
  const onStart = options.onStart
  const onEnd = options.onEnd

  // Return original error after debug iterations complete
  // If no debugging occurred, return the last error
  // Debugging should not affect other functionality
  let firstErrorEvent: ErrorEvent<Args> | null = null
  let debugIterations = 0

  /**
   * Handle test error with debugger support.
   *
   * Returns void to signal "repeat same variant" when:
   * - Debugger is attached (pause > threshold)
   * - Debug iteration limit not reached
   *
   * Otherwise, throws the error.
   */
  function handleTestError(error: unknown, args: Args, tests: number): void {
    if (firstErrorEvent == null) {
      firstErrorEvent = { error, args, tests }

      if (logOptions.error) {
        logOptions.func(
          'error',
          `[test-variants] error variant: ${logOptions.format(args)}\ntests: ${tests}\n${logOptions.format(error)}`,
        )
      }
    }

    const beforeDebugger = Date.now()

    if (pauseDebuggerOnError) {
      // eslint-disable-next-line no-debugger
      debugger
    }
    const pauseDuration = Date.now() - beforeDebugger

    // Debugger was attached and user stepped through - repeat variant for debugging
    if (
      pauseDuration > DEBUG_PAUSE_THRESHOLD_MS &&
      debugIterations < MAX_DEBUG_ITERATIONS
    ) {
      logOptions.func(
        'debug',
        `[test-variants] debug iteration: ${debugIterations}`,
      )
      debugIterations++
      // Return void to signal debug mode (repeat same variant)
      return
    }

    const errorEvent = firstErrorEvent
    firstErrorEvent = null

    if (options.onError) {
      options.onError(errorEvent)
    }

    throw errorEvent.error
  }

  const nowObservable = new NowObservable(100)

  return function testRun(
    args: ArgsWithSeed<Args>,
    tests: number,
    testOptions: TestVariantsState,
  ): PromiseOrValue<void | TestFuncResult> {
    if (onStart) {
      onStart({ args, tests })
    }

    const timeoutTime = resolveTimeout(options.timeout, args)
    let timeStart: number | null = null
    let actualTestOptions = testOptions
    let timeoutAbortController: AbortControllerFast | null = null
    if (timeoutTime) {
      timeStart = Date.now()
      timeoutAbortController = new AbortControllerFast()
      const abortSignal = combineAbortSignals(
        testOptions.abortSignal,
        timeoutAbortController.signal,
      )
      actualTestOptions = {
        abortSignal,
        timeController: testOptions.timeController,
      }
    }

    function abortTimeout(): void {
      timeoutAbortController!.abort(
        new TimeoutError(
          `[test-variants] test timeout ${timeoutTime}ms exceeded`,
        ),
      )
    }

    try {
      let promiseOrResult = test(args, actualTestOptions)

      if (isPromiseLike(promiseOrResult)) {
        let timeoutUnsubscribe: Unsubscribe | null = null
        if (timeoutAbortController) {
          timeoutUnsubscribe = nowObservable.subscribe(() => {
            if (Date.now() - timeStart! >= timeoutTime!) {
              abortTimeout()
              timeoutUnsubscribe!()
            }
          })
          promiseOrResult = Promise.race([
            promiseOrResult,
            abortSignalToPromise(timeoutAbortController.signal),
          ])
        }

        return promiseOrResult.then(
          value => {
            timeoutUnsubscribe?.()
            const result = normalizeTestResult(value, true)
            if (onEnd) {
              onEnd({ args, tests, result })
            }
            return result
          },
          err => {
            timeoutUnsubscribe?.()
            if (onEnd && !(err instanceof AbortErrorSilent)) {
              onEnd({ args, tests, error: err })
            }
            return handleTestError(err, args, tests)
          },
        )
      }

      if (timeStart != null && Date.now() - timeStart >= timeoutTime!) {
        abortTimeout()
        timeoutAbortController!.signal.throwIfAborted()
      }

      const result = normalizeTestResult(promiseOrResult, false)
      if (onEnd) {
        onEnd({ args, tests, result })
      }
      return result
    } catch (err) {
      if (err instanceof AbortErrorSilent) {
        return
      }
      if (onEnd) {
        onEnd({ args, tests, error: err })
      }
      return handleTestError(err, args, tests)
    }
  }
}
