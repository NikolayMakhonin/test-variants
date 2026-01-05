import { isPromiseLike, type PromiseOrValue } from '@flemist/async-utils'
import { poolWait } from '@flemist/time-limits'
import type { Obj, RequiredNonNullable } from '@flemist/simple-utils'
import type {
  ArgsWithSeed,
  TestVariantsLogOptions,
} from 'src/common/test-variants/types'
import type { TestFuncResult } from './types'
import type { RunContext } from './RunContext'
import { shouldTriggerGC, triggerGC } from './gcManager'
import { logModeChange, logProgress } from './runLogger'
import { handleSyncError, handleParallelError } from './errorHandlers'

function logDebug(
  logOptions: RequiredNonNullable<TestVariantsLogOptions>,
  message: string,
): void {
  if (logOptions.debug) {
    logOptions.func('debug', `[debug] ${message}`)
  }
}

function callOnModeChange(runContext: RunContext<Obj>): PromiseOrValue<void> {
  const { options, variantsIterator, state } = runContext
  const { onModeChange } = options

  if (onModeChange && variantsIterator.modeConfig) {
    const result = onModeChange({
      mode: variantsIterator.modeConfig,
      modeIndex: variantsIterator.modeIndex,
      tests: state.tests,
    })
    if (isPromiseLike(result)) {
      return result
    }
  }
}

function handleInitialMode(runContext: RunContext<Obj>): PromiseOrValue<void> {
  const { options, variantsIterator, state } = runContext

  logModeChange(
    options.logOptions,
    variantsIterator.modeConfig,
    variantsIterator.modeIndex,
  )
  state.prevModeIndex = variantsIterator.modeIndex

  return callOnModeChange(runContext)
}

function handleModeChangeIfNeeded(
  runContext: RunContext<Obj>,
): PromiseOrValue<void> {
  const { options, variantsIterator, state } = runContext

  if (variantsIterator.modeIndex === state.prevModeIndex) {
    return
  }

  logDebug(
    options.logOptions,
    `mode switch: modeIndex=${variantsIterator.modeIndex}, index=${variantsIterator.index}`,
  )

  state.modeChanged = true
  state.prevModeIndex = variantsIterator.modeIndex

  return callOnModeChange(runContext)
}

function checkTimeLimit(runContext: RunContext<Obj>): boolean {
  const { options, state } = runContext
  const { limitTime, timeController } = options

  if (limitTime == null) {
    return false
  }
  if (timeController.now() - state.startTime < limitTime) {
    return false
  }

  state.timeLimitExceeded = true
  return true
}

function handlePeriodicTasks(
  runContext: RunContext<Obj>,
): PromiseOrValue<boolean> {
  const { options, state } = runContext
  const { logOptions, timeController, GC_Interval } = options

  if (!logOptions.progress && !GC_Interval) {
    return checkTimeLimit(runContext)
  }

  if (checkTimeLimit(runContext)) {
    return true
  }

  logProgress(runContext)

  const now = timeController.now()
  if (shouldTriggerGC(runContext, now)) {
    return triggerGC(state, now).then(() => false)
  }

  return false
}

function updateStateFromResult(
  runContext: RunContext<Obj>,
  result: Exclude<TestFuncResult, void>,
): void {
  runContext.state.iterationsAsync += result.iterationsAsync
  runContext.state.iterations += result.iterationsSync + result.iterationsAsync
}

function executeSequentialTest<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
): PromiseOrValue<boolean> {
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
            return true
          }
          state.debugMode = false
          updateStateFromResult(runContext, result)
          return false
        },
        err => handleSyncError(runContext, args, err, tests).then(() => false),
      )
    }

    if (!promiseOrResult) {
      state.debugMode = true
      abortControllerParallel.abort()
      return true
    }
    state.debugMode = false
    updateStateFromResult(runContext, promiseOrResult)
    return false
  } catch (err) {
    return handleSyncError(runContext, args, err, tests).then(() => false)
  }
}

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

  const capturedTests = state.tests
  state.tests++

  void (async () => {
    try {
      if (abortSignal.aborted) return

      let promiseOrResult = testRun(args, capturedTests, testOptions)
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
      handleParallelError(runContext, args, err, capturedTests)
    } finally {
      void pool.release(1)
    }
  })()
}

export async function runIterationLoop<Args extends Obj>(
  runContext: RunContext<Args>,
): Promise<void> {
  const { options, variantsIterator, abortSignal, pool, state } = runContext
  const { logOptions, abortSignalExternal, cycles, timeController, parallel } =
    options

  variantsIterator.start()
  logDebug(
    logOptions,
    `start(): cycleIndex=${variantsIterator.cycleIndex}, modeIndex=${variantsIterator.modeIndex}, minCompletedCount=${variantsIterator.minCompletedCount}, cycles=${cycles}`,
  )

  const initialModeResult = handleInitialMode(runContext)
  if (isPromiseLike(initialModeResult)) await initialModeResult

  while (
    variantsIterator.minCompletedCount < cycles &&
    !state.timeLimitExceeded
  ) {
    logDebug(
      logOptions,
      `outer loop: minCompletedCount=${variantsIterator.minCompletedCount} < cycles=${cycles}`,
    )

    if (checkTimeLimit(runContext)) break

    let args: ArgsWithSeed<Args> | null = null

    while (!abortSignalExternal?.aborted) {
      if (!state.debugMode) {
        args = variantsIterator.next()
        if (args == null) break
      }

      const modeChangeResult = handleModeChangeIfNeeded(runContext)
      if (isPromiseLike(modeChangeResult)) await modeChangeResult

      const timeLimitExceeded = handlePeriodicTasks(runContext)
      if (isPromiseLike(timeLimitExceeded)) {
        if (await timeLimitExceeded) break
      } else if (timeLimitExceeded) {
        break
      }

      if (abortSignalExternal?.aborted) continue

      if (!pool || abortSignal.aborted) {
        const shouldContinue = executeSequentialTest(runContext, args!)
        if (isPromiseLike(shouldContinue)) {
          if (await shouldContinue) continue
        } else if (shouldContinue) {
          continue
        }
      } else {
        if (!pool.hold(1)) {
          await poolWait({ pool, count: 1, hold: true })
        }
        scheduleParallelTest(runContext, args!)
      }
    }

    logDebug(
      logOptions,
      `inner loop exited: modeIndex=${variantsIterator.modeIndex}, index=${variantsIterator.index}, count=${variantsIterator.count}, iterations=${state.iterations}`,
    )

    state.prevCycleVariantsCount = variantsIterator.count
    state.prevCycleDuration = timeController.now() - state.cycleStartTime
    state.cycleStartTime = timeController.now()

    if (checkTimeLimit(runContext)) break

    logDebug(
      logOptions,
      `calling start() again: cycleIndex=${variantsIterator.cycleIndex}, minCompletedCount=${variantsIterator.minCompletedCount}`,
    )
    variantsIterator.start()
    logDebug(
      logOptions,
      `after start(): cycleIndex=${variantsIterator.cycleIndex}, modeIndex=${variantsIterator.modeIndex}, minCompletedCount=${variantsIterator.minCompletedCount}`,
    )
  }

  if (pool) {
    await poolWait({ pool, count: parallel, hold: true })
    void pool.release(parallel)
  }
}
