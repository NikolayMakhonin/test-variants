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
import { AbortErrorSilent } from 'src/common/test-variants/run/AbortErrorSilent'

/** Minimum pause time (ms) to detect JS debugger stepping */
const DEBUG_PAUSE_THRESHOLD_MS = 50
/** Maximum debug iterations before throwing error */
const MAX_DEBUG_ITERATIONS = 5

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

  // Смысл в том чтобы после итераций отладки, вернуть оригинальную ошибку
  // А если отладки не было, то вернуть последнюю ошибку,
  // т.е. отладка не должна никак влиять на другой функционал
  let firstErrorEvent: ErrorEvent<Args> | null = null
  let debugIterations = 0

  /**
   * Handle test error with debugger support.
   *
   * Returns void to signal "repeat same variant" when:
   * - Debugger is attached (pause > threshold)
   * - Debug iteration limit not reached
   *
   * Otherwise throws the error.
   */
  function handleTestError(error: unknown, args: Args, tests: number): void {
    if (firstErrorEvent == null) {
      firstErrorEvent = { error, args, tests }

      if (logOptions.error) {
        logOptions.func(
          'error',
          `[test-variants] error variant: ${formatAny(args, { pretty: true })}\n${formatAny(error)}\ntests: ${tests}`,
        )
      }
    }

    const beforeDebugger = Date.now()

    // debugger
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

  return function testRun(
    args: ArgsWithSeed<Args>,
    tests: number,
    testOptions: TestOptions,
  ): PromiseOrValue<TestFuncResult> {
    try {
      const promiseOrResult = test(args, testOptions)

      if (isPromiseLike(promiseOrResult)) {
        return promiseOrResult.then(
          value => normalizeTestResult(value, true),
          err => handleTestError(err, args, tests),
        )
      }

      return normalizeTestResult(promiseOrResult, false)
    } catch (err) {
      if (err instanceof AbortErrorSilent) {
        return
      }
      return handleTestError(err, args, tests)
    }
  }
}
