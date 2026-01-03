import { type IAbortSignalFast } from '@flemist/abort-controller-fast'
import { isPromiseLike, type PromiseOrValue } from '@flemist/async-utils'
import { formatAny, type Obj } from '@flemist/simple-utils'
import {
  ArgsWithSeed,
  type TestVariantsLogOptions,
} from 'src/common/test-variants/types'

export type ErrorEvent<Args extends Obj> = {
  error: any
  args: Args
  /** Number of tests run before this error (including attemptsPerVariant) */
  tests: number
}

export type OnErrorCallback<Args extends Obj> = (
  event: ErrorEvent<Args>,
) => PromiseOrValue<void>

export type TestVariantsCreateTestRunOptions<Args extends Obj> = {
  onError?: null | OnErrorCallback<Args>
  /** Logging options; null/true uses defaults; false disables all */
  log?: null | boolean | TestVariantsLogOptions
}

export type TestVariantsTestRunResult = void | {
  iterationsAsync: number
  iterationsSync: number
}

export type TestVariantsTestRun<Args extends Obj> = (
  args: ArgsWithSeed<Args>,
  tests: number,
  abortSignal: IAbortSignalFast,
) => PromiseOrValue<TestVariantsTestRunResult>

export type TestVariantsTestResult = number | void | TestVariantsTestRunResult

export type TestVariantsTest<Args extends Obj> = (
  args: Args,
  abortSignal: IAbortSignalFast,
) => PromiseOrValue<TestVariantsTestResult>

/** Normalize test result to standard format */
function normalizeTestResult(
  value: TestVariantsTestResult,
  isAsync: boolean,
): TestVariantsTestRunResult {
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

export function testVariantsCreateTestRun<Args extends Obj>(
  test: TestVariantsTest<Args>,
  options?: null | TestVariantsCreateTestRunOptions<Args>,
): TestVariantsTestRun<Args> {
  const log = options?.log
  const logError =
    log === false
      ? false
      : log === true || log == null
        ? true
        : (log.error ?? true)

  let errorEvent: ErrorEvent<Args> | null = null
  // Debug mode: counts iterations for step-by-step debugging of failing variant.
  // DO NOT REMOVE - enables repeating same failing variant up to 5 times in JS debugger.
  let debugIteration = 0

  // Error handler with debug mode support.
  // When debugger statement pauses execution and developer resumes (>50ms elapsed),
  // returns void instead of throwing to repeat the same variant for debugging.
  // This allows setting breakpoints and stepping through the failing case multiple times.
  // DO NOT REMOVE debug logic - it is essential for debugging failing test variants.
  function onError(error: any, args: Args, tests: number): void {
    // Log only on first error occurrence to avoid spam during debug iterations
    if (errorEvent == null) {
      errorEvent = {
        error,
        args,
        tests,
      }
      if (logError) {
        console.error(
          `[test-variants] error variant: ${tests}\n${formatAny(args, { pretty: true })}`,
        )
        console.error(error)
      }
    }

    // Debug mode: rerun failed variant up to 5 times for step-by-step debugging.
    // The debugger statement pauses execution. If developer is in JS debugger
    // and resumes (time elapsed > 50ms), we return without throwing,
    // causing testVariantsRun to repeat the same variant.
    const time0 = Date.now()
    // eslint-disable-next-line no-debugger
    debugger
    if (Date.now() - time0 > 50 && debugIteration < 5) {
      console.log('[test-variants] DEBUG ITERATION: ' + debugIteration)
      debugIteration++
      return
    }

    if (options?.onError) {
      options.onError(errorEvent)
    }

    throw errorEvent.error
  }

  return function testRun(
    args: Args,
    tests: number,
    abortSignal: IAbortSignalFast,
  ): PromiseOrValue<TestVariantsTestRunResult> {
    try {
      const promiseOrResult = test(args, abortSignal)

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
