import { isPromiseLike, type PromiseOrValue } from '@flemist/async-utils'
import type { Obj } from '@flemist/simple-utils'
import { poolWait } from '@flemist/time-limits'
import type { ArgsWithSeed } from '../types'
import { handleErrorParallel, handleErrorSequential } from './errorHandlers'
import { shouldTriggerGC, triggerGC } from './gcManager'
import type { RunContext } from './RunContext'
import { logModeChange, logProgress } from './runLogger'
import type { TestFuncResult } from './types'

function isTimeLimitExceeded(runContext: RunContext<Obj>): boolean {
  const { options, state } = runContext
  const { limitTime, timeController } = options
  return (
    limitTime != null && timeController.now() - state.startTime >= limitTime
  )
}

function updateIterationState(
  state: RunContext<Obj>['state'],
  result: TestFuncResult,
): void {
  state.debugMode = false
  if (result) {
    state.iterationsAsync += result.iterationsAsync
    state.iterations += result.iterationsSync + result.iterationsAsync
  }
}

function enterDebugMode(runContext: RunContext<Obj>): void {
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

async function callOnModeChange(runContext: RunContext<Obj>): Promise<void> {
  const { options, variantsIterator, state } = runContext
  const { onModeChange } = options
  const { modeConfig } = variantsIterator

  if (!onModeChange || !modeConfig) {
    return
  }

  const result = onModeChange({
    mode: modeConfig,
    modeIndex: variantsIterator.modeIndex,
    tests: state.tests,
  })

  if (isPromiseLike(result)) {
    await result
  }
}

async function handleModeChangeIfNeeded(
  runContext: RunContext<Obj>,
): Promise<void> {
  const { options, variantsIterator, state } = runContext

  if (variantsIterator.modeIndex === state.prevModeIndex) {
    return
  }

  state.modeChanged = true
  state.prevModeIndex = variantsIterator.modeIndex

  logModeChange(
    options.logOptions,
    variantsIterator.modeConfig,
    variantsIterator.modeIndex,
  )
  await callOnModeChange(runContext)
}

async function handlePeriodicTasks(runContext: RunContext<Obj>): Promise<void> {
  const { options, state } = runContext
  const { logOptions, timeController, GC_Interval } = options

  if (!logOptions.progress && !GC_Interval) {
    return
  }

  logProgress(runContext)

  const now = timeController.now()
  if (shouldTriggerGC(runContext, now)) {
    await triggerGC(state, now)
  }
}

function updateCycleState(runContext: RunContext<Obj>): void {
  const { options, variantsIterator, state } = runContext
  const now = options.timeController.now()

  state.prevCycleVariantsCount = variantsIterator.count
  state.prevCycleDuration = now - state.cycleStartTime
  state.cycleStartTime = now
}

function isAborted(runContext: RunContext<Obj>): boolean {
  const { options, abortSignal, pool } = runContext
  return !!(
    options.abortSignalExternal?.aborted ||
    (pool && abortSignal.aborted)
  )
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

async function runCycle<Args extends Obj>(
  runContext: RunContext<Args>,
): Promise<void> {
  const { pool, state, options } = runContext
  const { parallel } = options

  let currentArgs: ArgsWithSeed<Args> | null = null

  while (!isAborted(runContext)) {
    currentArgs = getNextArgs(runContext, currentArgs)
    if (currentArgs == null) {
      break
    }

    await handleModeChangeIfNeeded(runContext)

    if (isTimeLimitExceeded(runContext)) {
      state.timeLimitExceeded = true
      break
    }

    await handlePeriodicTasks(runContext)

    if (isAborted(runContext)) {
      continue
    }

    if (pool) {
      if (!pool.hold(1)) {
        await poolWait({ pool, count: 1, hold: true })
      }
      runParallelTest(runContext, currentArgs)
    } else {
      const result = runSequentialTest(runContext, currentArgs)
      if (isPromiseLike(result)) {
        await result
      }
    }
  }

  if (pool) {
    await poolWait({ pool, count: parallel, hold: true })
    void pool.release(parallel)
  }
}

export async function runIterationLoop<Args extends Obj>(
  runContext: RunContext<Args>,
): Promise<void> {
  const { options, variantsIterator, state } = runContext
  const { logOptions, cycles } = options

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
    if (isTimeLimitExceeded(runContext)) {
      state.timeLimitExceeded = true
      break
    }

    await runCycle(runContext)
    updateCycleState(runContext)

    if (state.timeLimitExceeded || isTimeLimitExceeded(runContext)) {
      state.timeLimitExceeded = true
      break
    }

    variantsIterator.start()
  }
}
