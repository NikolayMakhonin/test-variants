import { isPromiseLike, type PromiseOrValue } from '@flemist/async-utils'
import { poolWait } from '@flemist/time-limits'
import type { Obj } from '@flemist/simple-utils'
import type { ArgsWithSeed } from 'src/common/test-variants/types'
import type { TestFuncResult } from './types'
import type { RunContext } from './RunContext'
import { shouldTriggerGC, triggerGC } from './gcManager'
import { logModeChange, logProgress } from './runLogger'
import { handleError } from './errorHandlers'

function checkTimeLimit(runContext: RunContext<Obj>): boolean {
  const { options, state } = runContext
  const { limitTime, timeController } = options

  if (
    limitTime != null &&
    timeController.now() - state.startTime >= limitTime
  ) {
    state.timeLimitExceeded = true
    return true
  }
  return false
}

function handleTestResult(
  runContext: RunContext<Obj>,
  result: TestFuncResult,
): boolean {
  const { abortControllerParallel, state } = runContext

  if (!result) {
    state.debugMode = true
    abortControllerParallel.abort()
    return true
  }

  state.debugMode = false
  state.iterationsAsync += result.iterationsAsync
  state.iterations += result.iterationsSync + result.iterationsAsync
  return false
}

function executeSequentialTest<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
): PromiseOrValue<boolean> {
  const { testRun, testOptions, state } = runContext
  const tests = state.tests
  state.tests++

  try {
    const promiseOrResult = testRun(args, tests, testOptions)

    if (isPromiseLike(promiseOrResult)) {
      return promiseOrResult.then(
        result => handleTestResult(runContext, result),
        err => {
          const errorResult = handleError(runContext, args, err, tests, false)
          return isPromiseLike(errorResult)
            ? errorResult.then(() => false)
            : false
        },
      )
    }

    return handleTestResult(runContext, promiseOrResult)
  } catch (err) {
    const errorResult = handleError(runContext, args, err, tests, false)
    return isPromiseLike(errorResult) ? errorResult.then(() => false) : false
  }
}

function scheduleParallelTest<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
): void {
  const { pool, abortSignal, testRun, testOptions, state } = runContext
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

      handleTestResult(runContext, promiseOrResult)
    } catch (err) {
      handleError(runContext, args, err, capturedTests, true)
    } finally {
      void pool.release(1)
    }
  })()
}

async function callOnModeChange(runContext: RunContext<Obj>): Promise<void> {
  const { options, variantsIterator, state } = runContext
  const { onModeChange } = options

  if (onModeChange && variantsIterator.modeConfig) {
    const result = onModeChange({
      mode: variantsIterator.modeConfig,
      modeIndex: variantsIterator.modeIndex,
      tests: state.tests,
    })
    if (isPromiseLike(result)) {
      await result
    }
  }
}

async function handleModeChange(runContext: RunContext<Obj>): Promise<void> {
  const { variantsIterator, state } = runContext

  if (variantsIterator.modeIndex === state.prevModeIndex) {
    return
  }

  state.modeChanged = true
  state.prevModeIndex = variantsIterator.modeIndex
  await callOnModeChange(runContext)
}

async function handlePeriodicTasks(
  runContext: RunContext<Obj>,
): Promise<boolean> {
  const { options, state } = runContext
  const { logOptions, timeController, GC_Interval } = options

  if (checkTimeLimit(runContext)) {
    return true
  }

  if (!logOptions.progress && !GC_Interval) {
    return false
  }

  logProgress(runContext)

  const now = timeController.now()
  if (shouldTriggerGC(runContext, now)) {
    await triggerGC(state, now)
  }

  return false
}

export async function runIterationLoop<Args extends Obj>(
  runContext: RunContext<Args>,
): Promise<void> {
  const { options, variantsIterator, abortSignal, pool, state } = runContext
  const { logOptions, abortSignalExternal, cycles, timeController, parallel } =
    options

  variantsIterator.start()

  logModeChange(
    logOptions,
    variantsIterator.modeConfig,
    variantsIterator.modeIndex,
  )
  state.prevModeIndex = variantsIterator.modeIndex
  await callOnModeChange(runContext)

  while (
    variantsIterator.minCompletedCount < cycles &&
    !state.timeLimitExceeded
  ) {
    if (checkTimeLimit(runContext)) break

    let args: ArgsWithSeed<Args> | null = null

    while (!abortSignalExternal?.aborted) {
      if (!state.debugMode) {
        args = variantsIterator.next()
        if (args == null) break
      }

      await handleModeChange(runContext)

      if (await handlePeriodicTasks(runContext)) break

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

    state.prevCycleVariantsCount = variantsIterator.count
    state.prevCycleDuration = timeController.now() - state.cycleStartTime
    state.cycleStartTime = timeController.now()

    if (checkTimeLimit(runContext)) break

    variantsIterator.start()
  }

  if (pool) {
    await poolWait({ pool, count: parallel, hold: true })
    void pool.release(parallel)
  }
}
