import { isPromiseLike, type PromiseOrValue } from '@flemist/async-utils'
import { poolWait } from '@flemist/time-limits'
import type { Obj } from '@flemist/simple-utils'
import type { ArgsWithSeed } from 'src/common/test-variants/types'
import type { TestFuncResult } from './types'
import type { RunContext } from './RunContext'
import { shouldTriggerGC, triggerGC } from './gcManager'
import { logModeChange, logProgress } from './runLogger'
import { handleErrorParallel, handleErrorSequential } from './errorHandlers'

function checkTimeLimit(runContext: RunContext<Obj>): boolean {
  const { options, state } = runContext
  const { limitTime, timeController } = options

  if (limitTime == null) {
    return false
  }

  return timeController.now() - state.startTime >= limitTime
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
  if (!pool) return

  const tests = state.tests
  state.tests++

  void (async () => {
    try {
      if (abortSignal.aborted) return

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
  const { options, variantsIterator } = runContext
  const { onModeChange } = options

  if (!onModeChange || !variantsIterator.modeConfig) {
    return
  }

  const result = onModeChange({
    mode: variantsIterator.modeConfig,
    modeIndex: variantsIterator.modeIndex,
    tests: runContext.state.tests,
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

/**
 * Returns true if iteration should stop (time limit or external abort)
 */
async function runSequentialCycle<Args extends Obj>(
  runContext: RunContext<Args>,
): Promise<boolean> {
  const { variantsIterator, state, options } = runContext
  const { abortSignalExternal } = options

  // Current args for test execution; kept for debug mode replay
  let currentArgs: ArgsWithSeed<Args> | null = null

  while (!abortSignalExternal?.aborted) {
    // In debug mode, replay same args; otherwise get next variant
    if (!state.debugMode) {
      currentArgs = variantsIterator.next()
      if (currentArgs == null) {
        return false
      }
    }

    await handleModeChangeIfNeeded(runContext)

    if (checkTimeLimit(runContext)) {
      state.timeLimitExceeded = true
      return true
    }

    await handlePeriodicTasks(runContext)

    if (abortSignalExternal?.aborted) {
      continue
    }

    // currentArgs is guaranteed non-null: debugMode is only true after test runs,
    // and test only runs after currentArgs is assigned
    const result = runSequentialTest(
      runContext,
      currentArgs as ArgsWithSeed<Args>,
    )
    if (isPromiseLike(result)) {
      await result
    }
  }

  return false
}

/**
 * Returns true if iteration should stop (time limit or external abort)
 */
async function runParallelCycle<Args extends Obj>(
  runContext: RunContext<Args>,
): Promise<boolean> {
  const { variantsIterator, pool, abortSignal, state, options } = runContext
  const { abortSignalExternal, parallel } = options

  if (!pool) {
    return runSequentialCycle(runContext)
  }

  // Current args for test execution; kept for debug mode replay
  let currentArgs: ArgsWithSeed<Args> | null = null

  while (!abortSignalExternal?.aborted && !abortSignal.aborted) {
    // In debug mode, replay same args; otherwise get next variant
    if (!state.debugMode) {
      currentArgs = variantsIterator.next()
      if (currentArgs == null) {
        break
      }
    }

    await handleModeChangeIfNeeded(runContext)

    if (checkTimeLimit(runContext)) {
      state.timeLimitExceeded = true
      break
    }

    await handlePeriodicTasks(runContext)

    if (abortSignalExternal?.aborted || abortSignal.aborted) {
      continue
    }

    if (!pool.hold(1)) {
      await poolWait({ pool, count: 1, hold: true })
    }

    // currentArgs is guaranteed non-null: debugMode is only true after test runs,
    // and test only runs after currentArgs is assigned
    runParallelTest(runContext, currentArgs as ArgsWithSeed<Args>)
  }

  await poolWait({ pool, count: parallel, hold: true })
  void pool.release(parallel)

  return state.timeLimitExceeded
}

export async function runIterationLoop<Args extends Obj>(
  runContext: RunContext<Args>,
): Promise<void> {
  const { options, variantsIterator, pool, state } = runContext
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
    if (checkTimeLimit(runContext)) {
      state.timeLimitExceeded = true
      break
    }

    const shouldStop = pool
      ? await runParallelCycle(runContext)
      : await runSequentialCycle(runContext)

    updateCycleState(runContext)

    if (shouldStop || checkTimeLimit(runContext)) {
      state.timeLimitExceeded = true
      break
    }

    variantsIterator.start()
  }
}
