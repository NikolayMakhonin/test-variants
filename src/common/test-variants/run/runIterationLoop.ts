import { isPromiseLike, type PromiseOrValue } from '@flemist/async-utils'
import type { Obj } from '@flemist/simple-utils'
import { poolWait } from '@flemist/time-limits'
import type { ArgsWithSeed } from '../types'
import { handleErrorParallel, handleErrorSequential } from './errorHandlers'
import { shouldTriggerGC, triggerGC } from './gcManager'
import type { RunContext } from './RunContext'
import { logModeChange, logProgress } from './runLogger'
import type { TestFuncResult } from './types'

function isGlobalTimeLimitExceeded(runContext: RunContext<any>): boolean {
  const { options, state } = runContext
  const { limitTime, timeController } = options
  return (
    limitTime != null && timeController.now() - state.startTime >= limitTime
  )
}

function isGlobalTestsLimitExceeded(runContext: RunContext<any>): boolean {
  const { options, state } = runContext
  const { limitTests } = options
  return limitTests != null && state.tests >= limitTests
}

function isGlobalLimitExceeded(runContext: RunContext<any>): boolean {
  return (
    isGlobalTimeLimitExceeded(runContext) ||
    isGlobalTestsLimitExceeded(runContext)
  )
}

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
  runContext.abortControllerParallel.abort()
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
    return handleErrorSequential(runContext, args, err, tests)
  }
}

function runParallelTest<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
): void {
  const { pool, abortSignal, testRun, testOptions, state } = runContext
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

      let promiseOrResult = testRun(args, tests, testOptions)
      if (isPromiseLike(promiseOrResult)) {
        promiseOrResult = await promiseOrResult
      }

      if (!promiseOrResult) {
        enterDebugMode(runContext)
        return
      }
      updateIterationState(state, promiseOrResult)
    } catch (err) {
      handleErrorParallel(runContext, args, err, tests)
    } finally {
      void pool.release(1)
    }
  })()
}

function callOnModeChange(runContext: RunContext<any>): PromiseOrValue<void> {
  const { options, variantsIterator, state } = runContext
  const { onModeChange } = options
  const { modeConfig } = variantsIterator

  if (!onModeChange || !modeConfig) {
    return
  }

  return onModeChange({
    mode: modeConfig,
    modeIndex: variantsIterator.modeIndex,
    tests: state.tests,
  })
}

function handleModeChangeIfNeeded(
  runContext: RunContext<any>,
): PromiseOrValue<void> {
  const { options, variantsIterator, state } = runContext
  const { logOptions } = options

  if (variantsIterator.modeIndex === state.prevModeIndex) {
    return
  }

  if (logOptions.debug) {
    logOptions.func(
      'debug',
      `[test-variants] mode switch: modeIndex=${variantsIterator.modeIndex}, index=${variantsIterator.index}`,
    )
  }

  state.modeChanged = true
  state.prevModeIndex = variantsIterator.modeIndex

  logModeChange(
    logOptions,
    variantsIterator.modeConfig,
    variantsIterator.modeIndex,
  )
  return callOnModeChange(runContext)
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

function updateCycleState(runContext: RunContext<any>): void {
  const { options, variantsIterator, state } = runContext
  const now = options.timeController.now()

  state.prevCycleVariantsCount = variantsIterator.index + 1
  state.prevCycleDuration = now - state.cycleStartTime
  state.cycleStartTime = now
}

/** Check if external abort was requested (user cancellation) */
function isExternalAborted(runContext: RunContext<any>): boolean {
  return !!runContext.options.abortSignalExternal?.aborted
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
    // Use pending args for first iteration if provided, then fetch new ones
    if (currentArgs == null) {
      currentArgs = getNextArgs(runContext, currentArgs)
      if (currentArgs == null) {
        break
      }
    }

    const modeChangeResult = handleModeChangeIfNeeded(runContext)
    if (isPromiseLike(modeChangeResult)) {
      await modeChangeResult
    }

    if (isGlobalLimitExceeded(runContext)) {
      state.globalLimitExceeded = true
      break
    }

    const periodicResult = handlePeriodicTasks(runContext)
    if (isPromiseLike(periodicResult)) {
      await periodicResult
    }

    if (isExternalAborted(runContext)) {
      currentArgs = null
      continue
    }

    // When parallel is aborted (error in findBestError mode), fall back to sequential
    // This matches previous version behavior: if (!pool || abortSignal.aborted) -> sequential
    if (pool && !isParallelAborted(runContext)) {
      if (!pool.hold(1)) {
        await poolWait({ pool, count: 1, hold: true })
      }
      runParallelTest(runContext, currentArgs)
    } else {
      if (logOptions.debug && pool && isParallelAborted(runContext)) {
        logOptions.func(
          'debug',
          `[test-variants] parallel aborted, running sequential: variant=${runContext.variantsIterator.index}`,
        )
      }
      const result = runSequentialTest(runContext, currentArgs)
      if (isPromiseLike(result)) {
        await result
      }
    }

    // Clear for next iteration to fetch new args
    currentArgs = null
  }

  if (pool) {
    await poolWait({ pool, count: parallel, hold: true })
    void pool.release(parallel)
  }
}

/**
 * Runs cycle in sync mode when possible.
 * Only uses async when: test returns Promise, mode change callback is async, or GC triggers.
 */
function runCycle<Args extends Obj>(
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

    const modeChangeResult = handleModeChangeIfNeeded(runContext)
    if (isPromiseLike(modeChangeResult)) {
      // Switch to async mode, pass current args to continue from this point
      const args = currentArgs
      return modeChangeResult.then(() => runCycleAsync(runContext, args))
    }

    if (isGlobalLimitExceeded(runContext)) {
      state.globalLimitExceeded = true
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
        `[test-variants] parallel aborted, running sequential: variant=${runContext.variantsIterator.index}`,
      )
    }

    const result = runSequentialTest(runContext, currentArgs)
    if (isPromiseLike(result)) {
      // Test was already run, continue async without this args
      return result.then(() => runCycleAsync(runContext))
    }
  }
}

async function runIterationLoopAsync<Args extends Obj>(
  runContext: RunContext<Args>,
): Promise<void> {
  const { options, variantsIterator, state } = runContext
  const { logOptions, cycles } = options

  while (
    (variantsIterator.minCompletedCount ?? Infinity) < cycles &&
    !state.globalLimitExceeded
  ) {
    if (logOptions.debug) {
      logOptions.func(
        'debug',
        `[test-variants] outer loop: minCompletedCount=${variantsIterator.minCompletedCount} < cycles=${cycles}`,
      )
    }

    if (isGlobalLimitExceeded(runContext)) {
      state.globalLimitExceeded = true
      break
    }

    const cycleResult = runCycle(runContext)
    if (isPromiseLike(cycleResult)) {
      await cycleResult
    }
    updateCycleState(runContext)

    if (logOptions.debug) {
      logOptions.func(
        'debug',
        `[test-variants] cycle ended: modeIndex=${variantsIterator.modeIndex}, index=${variantsIterator.index}, tests=${state.tests}`,
      )
    }

    if (state.globalLimitExceeded || isGlobalLimitExceeded(runContext)) {
      state.globalLimitExceeded = true
      break
    }

    if (logOptions.debug) {
      logOptions.func(
        'debug',
        `[test-variants] calling start(): cycleIndex=${variantsIterator.cycleIndex}, minCompletedCount before start=${variantsIterator.minCompletedCount}`,
      )
    }
    variantsIterator.start()
    if (logOptions.debug) {
      logOptions.func(
        'debug',
        `[test-variants] after start(): cycleIndex=${variantsIterator.cycleIndex}, modeIndex=${variantsIterator.modeIndex}, minCompletedCount=${variantsIterator.minCompletedCount}`,
      )
    }
  }
}

/**
 * Main iteration loop with sync mode optimization.
 * Runs synchronously when all tests are sync and no async operations are triggered.
 */
export function runIterationLoop<Args extends Obj>(
  runContext: RunContext<Args>,
): PromiseOrValue<void> {
  const { options, variantsIterator, state } = runContext
  const { logOptions, cycles } = options

  variantsIterator.start()

  if (logOptions.debug) {
    logOptions.func(
      'debug',
      `[test-variants] start: cycleIndex=${variantsIterator.cycleIndex}, modeIndex=${variantsIterator.modeIndex}, minCompletedCount=${variantsIterator.minCompletedCount}, cycles=${cycles}`,
    )
  }

  logModeChange(
    logOptions,
    variantsIterator.modeConfig,
    variantsIterator.modeIndex,
  )
  state.prevModeIndex = variantsIterator.modeIndex

  const modeChangeResult = callOnModeChange(runContext)
  if (isPromiseLike(modeChangeResult)) {
    return modeChangeResult.then(() => runIterationLoopAsync(runContext))
  }

  while (
    (variantsIterator.minCompletedCount ?? Infinity) < cycles &&
    !state.globalLimitExceeded
  ) {
    if (logOptions.debug) {
      logOptions.func(
        'debug',
        `[test-variants] outer loop: minCompletedCount=${variantsIterator.minCompletedCount} < cycles=${cycles}`,
      )
    }

    if (isGlobalLimitExceeded(runContext)) {
      state.globalLimitExceeded = true
      break
    }

    const cycleResult = runCycle(runContext)
    if (isPromiseLike(cycleResult)) {
      // Switch to async mode for remainder
      return cycleResult.then(() => {
        updateCycleState(runContext)
        return runIterationLoopAsync(runContext)
      })
    }
    updateCycleState(runContext)

    if (logOptions.debug) {
      logOptions.func(
        'debug',
        `[test-variants] cycle ended: modeIndex=${variantsIterator.modeIndex}, index=${variantsIterator.index}, tests=${state.tests}`,
      )
    }

    if (state.globalLimitExceeded || isGlobalLimitExceeded(runContext)) {
      state.globalLimitExceeded = true
      break
    }

    if (logOptions.debug) {
      logOptions.func(
        'debug',
        `[test-variants] calling start(): cycleIndex=${variantsIterator.cycleIndex}, minCompletedCount before start=${variantsIterator.minCompletedCount}`,
      )
    }
    variantsIterator.start()
    if (logOptions.debug) {
      logOptions.func(
        'debug',
        `[test-variants] after start(): cycleIndex=${variantsIterator.cycleIndex}, modeIndex=${variantsIterator.modeIndex}, minCompletedCount=${variantsIterator.minCompletedCount}`,
      )
    }
  }
}
