import { isPromiseLike, type PromiseOrValue } from '@flemist/async-utils'
import { formatAny, type Obj } from '@flemist/simple-utils'
import type {
  ArgsWithSeed,
  ErrorEvent,
  TestOptions,
  TestVariantsTestResult,
} from './types'
import type {
  TestFuncResult,
  TestVariantsCreateTestRunOptions,
  TestVariantsTest,
  TestVariantsTestRun,
} from './run/types'

/** Minimum pause time (ms) to detect JS debugger stepping */
const DEBUG_PAUSE_THRESHOLD_MS = 50
/** Maximum debug iterations before throwing error */
const MAX_DEBUG_ITERATIONS = 5

/** Normalize test result to standard format */
function normalizeTestResult(
  value: TestVariantsTestResult,
  isAsync: boolean,
): TestFuncResult {
  if (typeof value === 'number') {
    return { iterationsAsync: 0, iterationsSync: value }
  }
  if (value !== null && typeof value === 'object') {
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

  let errorEvent: ErrorEvent<Args> | null = null
  let debugIteration = 0

  /**
   * Error handler with debug mode support.
   * When debugger pauses execution and developer resumes (elapsed > threshold),
   * returns void instead of throwing to repeat the same variant for debugging.
   */
  function onError(error: unknown, args: Args, tests: number): void {
    if (errorEvent == null) {
      errorEvent = {
        error,
        args,
        tests,
      }
      if (logOptions.error) {
        logOptions.func(
          'error',
          `[test-variants] error variant: ${tests}\n${formatAny(args, { pretty: true })}\n${formatAny(error)}`,
        )
      }
    }

    const startTime = Date.now()
    // eslint-disable-next-line no-debugger
    debugger
    const elapsed = Date.now() - startTime
    if (
      elapsed > DEBUG_PAUSE_THRESHOLD_MS &&
      debugIteration < MAX_DEBUG_ITERATIONS
    ) {
      logOptions.func(
        'debug',
        `[test-variants] debug iteration: ${debugIteration}`,
      )
      debugIteration++
      return
    }

    if (options.onError) {
      options.onError(errorEvent)
    }

    throw errorEvent.error
  }

  return function testRun(
    args: ArgsWithSeed<Args>,
    tests: number,
    options: TestOptions,
  ): PromiseOrValue<TestFuncResult> {
    try {
      const promiseOrResult = test(args, options)

      if (isPromiseLike(promiseOrResult)) {
        return promiseOrResult.then(
          value => normalizeTestResult(value, true),
          err => onError(err, args, tests),
        )
      }

      return normalizeTestResult(promiseOrResult, false)
    } catch (err) {
      return onError(err, args, tests)
    }
  }
}
