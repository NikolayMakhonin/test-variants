import { isPromiseLike, type PromiseOrValue } from '@flemist/async-utils'
import { poolWait } from '@flemist/time-limits'
import type { Obj } from '@flemist/simple-utils'
import type { ArgsWithSeed } from 'src/common/test-variants/types'
import type { TestFuncResult } from './types'
import type { RunContext } from './RunContext'
import { shouldTriggerGC, triggerGC } from './gcManager'
import { logModeChange, logProgress } from './runLogger'
import { handleSyncError, handleParallelError } from './errorHandlers'

// region Mode change

/** Handle initial mode at iteration start */
function handleInitialMode<Args extends Obj>(
  runContext: RunContext<Args>,
): PromiseOrValue<void> {
  const { options, variantsIterator, state } = runContext
  const { logOptions, onModeChange } = options

  logModeChange(
    logOptions,
    variantsIterator.modeConfig,
    variantsIterator.modeIndex,
  )
  state.prevModeIndex = variantsIterator.modeIndex

  if (onModeChange && variantsIterator.modeConfig) {
    const result = onModeChange({
      mode: variantsIterator.modeConfig,
      modeIndex: variantsIterator.modeIndex,
      tests: state.tests,
    })
    if (isPromiseLike(result)) return result
  }
}

/** Handle mode change if mode index changed */
function handleModeChangeIfNeeded<Args extends Obj>(
  runContext: RunContext<Args>,
): PromiseOrValue<void> {
  const { options, variantsIterator, state } = runContext
  const { logOptions, onModeChange } = options

  if (variantsIterator.modeIndex === state.prevModeIndex) return

  if (logOptions.debug) {
    logOptions.func(
      'debug',
      `[debug] mode switch: modeIndex=${variantsIterator.modeIndex}, index=${variantsIterator.index}`,
    )
  }

  state.modeChanged = true
  state.prevModeIndex = variantsIterator.modeIndex

  if (onModeChange && variantsIterator.modeConfig) {
    const result = onModeChange({
      mode: variantsIterator.modeConfig,
      modeIndex: variantsIterator.modeIndex,
      tests: state.tests,
    })
    if (isPromiseLike(result)) return result
  }
}

// endregion

// region Periodic tasks

type PeriodicTasksResult = { timeLimitExceeded: boolean }

/** Handle periodic tasks: time limit check, progress logging, GC */
function handlePeriodicTasks<Args extends Obj>(
  runContext: RunContext<Args>,
): PromiseOrValue<PeriodicTasksResult> {
  const { options, state } = runContext
  const { logOptions, timeController, limitTime, GC_Interval } = options

  if (!logOptions.progress && !GC_Interval && limitTime == null) {
    return { timeLimitExceeded: false }
  }

  const now = timeController.now()

  if (limitTime != null && now - state.startTime >= limitTime) {
    state.timeLimitExceeded = true
    return { timeLimitExceeded: true }
  }

  logProgress(runContext)

  if (shouldTriggerGC(runContext, now)) {
    return triggerGC(state, now).then(() => ({ timeLimitExceeded: false }))
  }

  return { timeLimitExceeded: false }
}

// endregion

// region Test execution

/** Update state from test result */
function updateStateFromResult(
  runContext: RunContext<any>,
  result: Exclude<TestFuncResult, void>,
): void {
  runContext.state.iterationsAsync += result.iterationsAsync
  runContext.state.iterations += result.iterationsSync + result.iterationsAsync
}

type TestResult = { shouldContinue: boolean }

/** Execute test sequentially; returns whether to continue to next iteration */
function executeSequentialTest<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
): PromiseOrValue<TestResult> {
  const { testRun, testOptions, abortControllerParallel, state } = runContext
  const tests = state.tests
  state.tests++

  try {
    const promiseOrResult = testRun(args, tests, testOptions)

    if (isPromiseLike(promiseOrResult)) {
      return promiseOrResult.then(
        result => {
          if (!result) {
            state.debugMode = true
            abortControllerParallel.abort()
            return { shouldContinue: true }
          }
          state.debugMode = false
          updateStateFromResult(runContext, result)
          return { shouldContinue: false }
        },
        err =>
          handleSyncError(runContext, args, err, tests).then(() => ({
            shouldContinue: false,
          })),
      )
    }

    if (!promiseOrResult) {
      state.debugMode = true
      abortControllerParallel.abort()
      return { shouldContinue: true }
    }
    state.debugMode = false
    updateStateFromResult(runContext, promiseOrResult)
    return { shouldContinue: false }
  } catch (err) {
    return handleSyncError(runContext, args, err, tests).then(() => ({
      shouldContinue: false,
    }))
  }
}

/** Schedule test for parallel execution */
function scheduleParallelTest<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
): void {
  const {
    pool,
    abortSignal,
    testRun,
    testOptions,
    abortControllerParallel,
    state,
  } = runContext
  if (!pool) return

  const capturedArgs = args
  const capturedTests = state.tests
  state.tests++

  void (async () => {
    try {
      if (abortSignal?.aborted) return

      let promiseOrResult = testRun(capturedArgs, capturedTests, testOptions)
      if (isPromiseLike(promiseOrResult)) {
        promiseOrResult = await promiseOrResult
      }

      if (!promiseOrResult) {
        state.debugMode = true
        abortControllerParallel.abort()
        return
      }

      state.debugMode = false
      updateStateFromResult(runContext, promiseOrResult)
    } catch (err) {
      handleParallelError(runContext, capturedArgs, err, capturedTests)
    } finally {
      void pool.release(1)
    }
  })()
}

// endregion

// region Main loop

/** Run the main iteration loop */
export async function runIterationLoop<Args extends Obj>(
  runContext: RunContext<Args>,
): Promise<void> {
  const { options, variantsIterator, abortSignal, pool, state } = runContext
  const {
    logOptions,
    abortSignalExternal,
    cycles,
    limitTime,
    timeController,
    parallel,
  } = options

  variantsIterator.start()
  if (logOptions.debug) {
    logOptions.func(
      'debug',
      `[debug] start(): cycleIndex=${variantsIterator.cycleIndex}, modeIndex=${variantsIterator.modeIndex}, minCompletedCount=${variantsIterator.minCompletedCount}, cycles=${cycles}`,
    )
  }

  const initialModeResult = handleInitialMode(runContext)
  if (isPromiseLike(initialModeResult)) await initialModeResult

  while (
    variantsIterator.minCompletedCount < cycles &&
    !state.timeLimitExceeded
  ) {
    if (logOptions.debug) {
      logOptions.func(
        'debug',
        `[debug] outer loop: minCompletedCount=${variantsIterator.minCompletedCount} < cycles=${cycles}`,
      )
    }

    if (
      limitTime != null &&
      timeController.now() - state.startTime >= limitTime
    ) {
      state.timeLimitExceeded = true
      break
    }

    let args: ArgsWithSeed<Args> = null!

    while (!abortSignalExternal?.aborted) {
      if (!state.debugMode) {
        const nextArgs = variantsIterator.next()
        if (nextArgs == null) break
        args = nextArgs
      }

      const modeChangeResult = handleModeChangeIfNeeded(runContext)
      if (isPromiseLike(modeChangeResult)) await modeChangeResult

      const periodicResult = handlePeriodicTasks(runContext)
      if (isPromiseLike(periodicResult)) {
        if ((await periodicResult).timeLimitExceeded) break
      } else if (periodicResult.timeLimitExceeded) {
        break
      }

      if (abortSignalExternal?.aborted) continue

      if (!pool || abortSignal.aborted) {
        const testResult = executeSequentialTest(runContext, args)
        if (isPromiseLike(testResult)) {
          if ((await testResult).shouldContinue) continue
        } else if (testResult.shouldContinue) {
          continue
        }
      } else {
        if (!pool.hold(1)) {
          await poolWait({ pool, count: 1, hold: true })
        }
        scheduleParallelTest(runContext, args)
      }
    }

    if (logOptions.debug) {
      logOptions.func(
        'debug',
        `[debug] inner loop exited: modeIndex=${variantsIterator.modeIndex}, index=${variantsIterator.index}, count=${variantsIterator.count}, iterations=${state.iterations}`,
      )
    }

    state.prevCycleVariantsCount = variantsIterator.count
    state.prevCycleDuration = timeController.now() - state.cycleStartTime
    state.cycleStartTime = timeController.now()

    if (
      limitTime != null &&
      timeController.now() - state.startTime >= limitTime
    ) {
      state.timeLimitExceeded = true
      break
    }

    if (logOptions.debug) {
      logOptions.func(
        'debug',
        `[debug] calling start() again: cycleIndex=${variantsIterator.cycleIndex}, minCompletedCount=${variantsIterator.minCompletedCount}`,
      )
    }
    variantsIterator.start()
    if (logOptions.debug) {
      logOptions.func(
        'debug',
        `[debug] after start(): cycleIndex=${variantsIterator.cycleIndex}, modeIndex=${variantsIterator.modeIndex}, minCompletedCount=${variantsIterator.minCompletedCount}`,
      )
    }
  }

  if (pool) {
    await poolWait({ pool, count: parallel, hold: true })
    void pool.release(parallel)
  }
}

// endregion
