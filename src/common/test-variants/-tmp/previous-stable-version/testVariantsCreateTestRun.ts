import { isPromiseLike, type PromiseOrValue } from '@flemist/async-utils'
import {
  formatAny,
  type Obj,
  type RequiredNonNullable,
} from '@flemist/simple-utils'
import type {
  ArgsWithSeed,
  ErrorEvent,
  OnErrorCallback,
  TestVariantsLogOptions,
  TestVariantsTest,
  TestVariantsTestOptions,
  TestVariantsTestResult,
  TestVariantsTestRun,
  TestFuncResult,
} from './types'

export type TestVariantsCreateTestRunOptions<Args extends Obj> = {
  onError?: null | OnErrorCallback<Args>
  /** Resolved logging options */
  log: RequiredNonNullable<TestVariantsLogOptions>
}

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

export function testVariantsCreateTestRun<Args extends Obj>(
  test: TestVariantsTest<Args>,
  options: TestVariantsCreateTestRunOptions<Args>,
): TestVariantsTestRun<Args> {
  const logOpts = options.log

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
      if (logOpts.error) {
        logOpts.func(
          'error',
          `[test-variants] error variant: ${tests}\n${formatAny(args, { pretty: true })}\n${formatAny(error)}`,
        )
      }
    }

    // Debug mode: rerun failed variant up to 5 times for step-by-step debugging.
    // The debugger statement pauses execution. If developer is in JS debugger
    // and resumes (time elapsed > 50ms), we return without throwing,
    // causing testVariantsRun to repeat the same variant.
    const time0 = Date.now()

    // debugger
    if (Date.now() - time0 > 50 && debugIteration < 5) {
      logOpts.func(
        'debug',
        '[test-variants] DEBUG ITERATION: ' + debugIteration,
      )
      debugIteration++
      return
    }

    if (options?.onError) {
      options.onError(errorEvent)
    }

    throw errorEvent.error
  }

  return function testRun(
    args: ArgsWithSeed<Args>,
    tests: number,
    options: TestVariantsTestOptions,
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
