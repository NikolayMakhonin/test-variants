import { isPromiseLike, type PromiseOrValue } from '@flemist/async-utils'
import type { Obj } from '@flemist/simple-utils'
import { poolWait } from '@flemist/time-limits'
import type { ArgsWithSeed } from '../types'
import { handleErrorParallel, handleErrorSequential } from './errorHandlers'
import { shouldTriggerGC, triggerGC } from './gcManager'
import type { RunContext } from './RunContext'
import { logProgress } from './runLogger'
import type { TestFuncResult } from './types'
import { AbortErrorSilent } from 'src/common/test-variants/run/AbortErrorSilent'

function updateIterationState(
  state: RunContext<any>['state'],
  result: TestFuncResult,
): void {
  state.debugMode = false
  if (result) {
    state.iterationsAsync += result.iterationsAsync
    state.iterations += result.iterationsSync + result.iterationsAsync
  }
}

function enterDebugMode(runContext: RunContext<any>): void {
  runContext.state.debugMode = true
  runContext.abortControllerParallel.abort(new AbortErrorSilent())
}

function runSequentialTest<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
): PromiseOrValue<void> {
  const { testRun, testOptions, state } = runContext
  const tests = state.tests
  state.tests++

  try {
    const promiseOrResult = testRun(args, tests, testOptions)

    if (isPromiseLike(promiseOrResult)) {
      return promiseOrResult.then(
        result => {
          if (!result) {
            enterDebugMode(runContext)
            return
          }
          updateIterationState(state, result)
        },
        err => handleErrorSequential(runContext, args, err, tests),
      )
    }

    if (!promiseOrResult) {
      enterDebugMode(runContext)
      return
    }
    updateIterationState(state, promiseOrResult)
  } catch (err) {
    if (err instanceof AbortErrorSilent) {
      return
    }
    return handleErrorSequential(runContext, args, err, tests)
  }
}

function runParallelTest<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
): void {
  const { pool, abortSignal, testRun, testOptionsParallel, state } = runContext
  if (!pool) {
    return
  }

  const tests = state.tests
  state.tests++

  void (async () => {
    try {
      if (abortSignal.aborted) {
        return
      }

      let promiseOrResult = testRun(args, tests, testOptionsParallel)
      if (isPromiseLike(promiseOrResult)) {
        promiseOrResult = await promiseOrResult
      }

      if (!promiseOrResult) {
        enterDebugMode(runContext)
        return
      }
      updateIterationState(state, promiseOrResult)
    } catch (err) {
      if (err instanceof AbortErrorSilent) {
        return
      }
      handleErrorParallel(runContext, args, err, tests)
    } finally {
      void pool.release(1)
    }
  })()
}

function handlePeriodicTasks(
  runContext: RunContext<any>,
): PromiseOrValue<void> {
  const { options, state } = runContext
  const { logOptions, timeController, GC_Interval } = options

  if (!logOptions.progress && !GC_Interval) {
    return
  }

  logProgress(runContext)

  const now = timeController.now()
  if (shouldTriggerGC(runContext, now)) {
    return triggerGC(state, now)
  }
}

/** Check if external abort was requested (user cancellation) */
function isExternalAborted(runContext: RunContext<any>): boolean {
  return runContext.options.abortSignalExternal?.aborted ?? false
}

/** Check if parallel execution was aborted (error in findBestError mode) */
function isParallelAborted(runContext: RunContext<any>): boolean {
  return runContext.abortSignal.aborted
}

/**
 * Returns next args or null if cycle ended.
 * In debug mode returns same args for replay.
 */
function getNextArgs<Args extends Obj>(
  runContext: RunContext<Args>,
  currentArgs: ArgsWithSeed<Args> | null,
): ArgsWithSeed<Args> | null {
  if (runContext.state.debugMode) {
    return currentArgs
  }
  return runContext.variantsIterator.next()
}

/**
 * Async version of cycle runner.
 * @param pendingArgs - args already fetched in sync mode before switching to async
 */
async function runCycleAsync<Args extends Obj>(
  runContext: RunContext<Args>,
  pendingArgs?: ArgsWithSeed<Args> | null,
): Promise<void> {
  const { pool, state, options } = runContext
  const { parallel, logOptions } = options

  let currentArgs: ArgsWithSeed<Args> | null = pendingArgs ?? null

  // Only check external abort for cycle continuation
  // Parallel abort (from findBestError) causes fallback to sequential, not cycle exit
  while (!isExternalAborted(runContext)) {
    // When sequentialOnError=true and error occurred, parallel is aborted and falls back to sequential
    const useParallel = pool && !isParallelAborted(runContext)

    // In parallel mode, wait for pool slot BEFORE fetching args
    // This ensures time advances before limit check in getNextArgs()
    // slotHeld tracks ownership: true = we must release, false = transferred to runParallelTest
    let slotHeld = false
    if (useParallel) {
      if (!pool.hold(1)) {
        await poolWait({ pool, count: 1, hold: true })
      }
      slotHeld = true
    }

    try {
      // Use pending args for first iteration if provided, then fetch new ones
      if (currentArgs == null) {
        currentArgs = getNextArgs(runContext, currentArgs)
        if (currentArgs == null) {
          break
        }
      }

      const periodicResult = handlePeriodicTasks(runContext)
      if (isPromiseLike(periodicResult)) {
        await periodicResult
      }

      if (isExternalAborted(runContext)) {
        currentArgs = null
        continue
      }

      if (useParallel) {
        runParallelTest(runContext, currentArgs)
        slotHeld = false // ownership transferred to runParallelTest
      } else {
        if (logOptions.debug && pool && isParallelAborted(runContext)) {
          logOptions.func(
            'debug',
            `[test-variants] parallel aborted, running sequential: tests=${state.tests}`,
          )
        }
        const result = runSequentialTest(runContext, currentArgs)
        if (isPromiseLike(result)) {
          await result
        }
      }

      // Clear for next iteration to fetch new args
      currentArgs = null
    } finally {
      if (slotHeld) {
        void pool!.release(1)
      }
    }
  }

  // Wait for all parallel tests to complete before returning
  // Acquiring all slots means all tests have released theirs
  if (pool) {
    await poolWait({ pool, count: parallel, hold: true })
    void pool.release(parallel)
  }
}

/**
 * Main iteration loop with sync mode optimization.
 * Runs synchronously when all tests are sync and no async operations are triggered.
 * Iterator handles all termination conditions internally via next() returning null.
 */
export function runIterationLoop<Args extends Obj>(
  runContext: RunContext<Args>,
): PromiseOrValue<void> {
  const { pool, state, options } = runContext
  const { logOptions } = options

  // Parallel mode always requires async
  if (pool) {
    return runCycleAsync(runContext)
  }

  let currentArgs: ArgsWithSeed<Args> | null = null

  // Only check external abort for cycle continuation
  // Parallel abort (from findBestError) causes fallback to sequential, not cycle exit
  while (!isExternalAborted(runContext)) {
    currentArgs = getNextArgs(runContext, currentArgs)
    if (currentArgs == null) {
      break
    }

    const periodicResult = handlePeriodicTasks(runContext)
    if (isPromiseLike(periodicResult)) {
      // Switch to async mode, pass current args to continue from this point
      const args = currentArgs
      return periodicResult.then(() => runCycleAsync(runContext, args))
    }

    if (isExternalAborted(runContext)) {
      continue
    }

    if (logOptions.debug && isParallelAborted(runContext)) {
      logOptions.func(
        'debug',
        `[test-variants] parallel aborted, running sequential: tests=${state.tests}`,
      )
    }

    const result = runSequentialTest(runContext, currentArgs)
    if (isPromiseLike(result)) {
      // Test was already run, continue async without this args
      return result.then(() => runCycleAsync(runContext))
    }
  }
}
