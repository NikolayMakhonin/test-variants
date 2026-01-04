import type { TestVariantsTestOptions, TestVariantsTestRun } from './types'
import { AbortControllerFast } from '@flemist/abort-controller-fast'
import { combineAbortSignals, isPromiseLike } from '@flemist/async-utils'
import { type IPool, Pool, poolWait } from '@flemist/time-limits'
import { garbageCollect } from 'src/common/garbage-collect/garbageCollect'
import type { Obj } from '@flemist/simple-utils'
import type {
  ArgsWithSeed,
  TestVariantsIterator,
  TestVariantsRunOptionsInternal,
  TestVariantsResult,
} from './types'
import { getMemoryUsage } from './helpers/getMemoryUsage'
import { resolveRunConfig } from './helpers/resolveRunConfig'
import { createRunState } from './helpers/createRunState'
import {
  logStart,
  logCompleted,
  logProgress,
  type RunLoggerDeps,
} from './helpers/runLogger'
import { shouldTriggerGC, triggerGC, type GCConfig } from './helpers/gcManager'
import { isTimeLimitExceeded } from './helpers/isTimeLimitExceeded'
import {
  handleSyncError,
  handleParallelError,
  type ErrorHandlerDeps,
} from './helpers/errorHandlers'
import {
  handleModeChange,
  type ModeChangeHandlerDeps,
} from './helpers/handleModeChange'
import { createRunResult } from './helpers/createRunResult'

export async function testVariantsRun<Args extends Obj, SavedArgs = Args>(
  testRun: TestVariantsTestRun<Args>,
  variants: TestVariantsIterator<Args>,
  options?: null | TestVariantsRunOptionsInternal<Args, SavedArgs>,
): Promise<TestVariantsResult<Args>> {
  // Resolve configuration
  const config = resolveRunConfig(options)
  const {
    store,
    logOpts,
    abortSignalExternal,
    findBestError,
    cycles,
    dontThrowIfError,
    limitTime,
    timeController,
    onModeChange,
    parallel,
    limitTests,
  } = config

  // Setup abort signals
  const abortControllerParallel = new AbortControllerFast()
  const abortSignal = combineAbortSignals(
    abortSignalExternal,
    abortControllerParallel.signal,
  )

  const testOptions: TestVariantsTestOptions = {
    abortSignal,
    timeController,
  }

  // Apply initial limits
  if (limitTests != null) {
    variants.addLimit({ index: limitTests })
  }

  // Replay phase: run previously saved error variants before normal iteration
  if (store) {
    await store.replay({
      testRun,
      variants,
      testOptions,
      findBestErrorEnabled: !!findBestError,
    })
  }

  // Initialize state
  const startMemory = getMemoryUsage()
  const state = createRunState(timeController, startMemory)

  // Setup dependencies for helpers
  const gcConfig: GCConfig = {
    GC_Iterations: config.GC_Iterations,
    GC_IterationsAsync: config.GC_IterationsAsync,
    GC_Interval: config.GC_Interval,
  }

  const loggerDeps: RunLoggerDeps = {
    logOpts,
    timeController,
    findBestError: !!findBestError,
  }

  const errorHandlerDeps: ErrorHandlerDeps<Args> = {
    variants,
    store,
    abortControllerParallel,
    findBestError: !!findBestError,
  }

  const modeChangeDeps: ModeChangeHandlerDeps<Args> = {
    logOpts,
    onModeChange,
    variants,
  }

  const pool: IPool | null = parallel <= 1 ? null : new Pool(parallel)

  // Log start
  logStart(logOpts, startMemory)

  // Start iteration
  variants.start()
  if (logOpts.debug) {
    logOpts.func(
      'debug',
      `[debug] start() called: cycleIndex=${variants.cycleIndex}, modeIndex=${variants.modeIndex}, minCompletedCount=${variants.minCompletedCount}, cycles=${cycles}`,
    )
  }

  // Handle initial mode
  await handleModeChange(modeChangeDeps, state, true)

  // Main iteration loop
  while (variants.minCompletedCount < cycles && !state.timeLimitExceeded) {
    if (logOpts.debug) {
      logOpts.func(
        'debug',
        `[debug] outer loop: minCompletedCount=${variants.minCompletedCount} < cycles=${cycles}`,
      )
    }

    // Check time limit at start of each round
    if (isTimeLimitExceeded(timeController, state.startTime, limitTime)) {
      state.timeLimitExceeded = true
      break
    }

    let args: ArgsWithSeed<Args> = null!

    // Inner iteration loop
    while (!abortSignalExternal?.aborted) {
      // Debug mode: repeats failing variant for step-by-step JS debugging.
      // When testRun returns void (from onError debug mode), debug flag is set to true.
      // Next iteration skips variants.next() and reruns the same args,
      // allowing developer to set breakpoints and debug the failing case.
      if (!state.debug) {
        const nextArgs = variants.next()
        if (nextArgs == null) {
          break
        }
        args = nextArgs
      }

      // Handle mode change
      await handleModeChange(modeChangeDeps, state, false)

      // Progress logging, time limit check, and GC
      if (logOpts.progress || gcConfig.GC_Interval || limitTime) {
        const now = timeController.now()

        if (isTimeLimitExceeded(timeController, state.startTime, limitTime)) {
          state.timeLimitExceeded = true
          break
        }

        if (logOpts.progress && now - state.prevLogTime >= logOpts.progress) {
          logProgress(loggerDeps, state, variants)
        }

        if (shouldTriggerGC(gcConfig, state, now)) {
          await triggerGC(state, now)
        }
      }

      if (abortSignalExternal?.aborted) {
        continue
      }

      // Execute test - sync or parallel path
      if (!pool || abortSignal.aborted) {
        // Sync execution
        try {
          // Pass current iterations count (tests run before this one)
          let promiseOrIterations = testRun(args, state.iterations, testOptions)
          if (isPromiseLike(promiseOrIterations)) {
            promiseOrIterations = await promiseOrIterations
          }
          if (!promiseOrIterations) {
            state.debug = true
            abortControllerParallel.abort()
            continue
          }
          const {
            iterationsAsync: _iterationsAsync,
            iterationsSync: _iterationsSync,
          } = promiseOrIterations
          state.iterationsAsync += _iterationsAsync
          state.iterations += _iterationsSync + _iterationsAsync
        } catch (err) {
          await handleSyncError(errorHandlerDeps, state, args, err)
        }
      } else {
        // Parallel execution
        if (!pool.hold(1)) {
          await poolWait({ pool, count: 1, hold: true })
        }

        // Capture args and iterations count (iterator moves in parallel mode)
        const capturedArgs = args
        const capturedIterations = state.iterations

        void (async () => {
          try {
            if (abortSignal?.aborted) {
              return
            }
            let promiseOrIterations = testRun(
              capturedArgs,
              capturedIterations,
              testOptions,
            )
            if (isPromiseLike(promiseOrIterations)) {
              promiseOrIterations = await promiseOrIterations
            }
            if (!promiseOrIterations) {
              state.debug = true
              abortControllerParallel.abort()
              return
            }
            const {
              iterationsAsync: _iterationsAsync,
              iterationsSync: _iterationsSync,
            } = promiseOrIterations
            state.iterationsAsync += _iterationsAsync
            state.iterations += _iterationsSync + _iterationsAsync
          } catch (err) {
            handleParallelError(errorHandlerDeps, state, capturedArgs, err)
          } finally {
            void pool.release(1)
          }
        })()
      }
    }

    if (logOpts.debug) {
      logOpts.func(
        'debug',
        `[debug] inner loop exited: modeIndex=${variants.modeIndex}, index=${variants.index}, count=${variants.count}, iterations=${state.iterations}`,
      )
    }

    // Track cycle metrics for logging
    state.prevCycleVariantsCount = variants.count
    state.prevCycleDuration = timeController.now() - state.cycleStartTime
    state.cycleStartTime = timeController.now()

    // Check time limit at end of each round
    if (isTimeLimitExceeded(timeController, state.startTime, limitTime)) {
      state.timeLimitExceeded = true
      break
    }

    if (logOpts.debug) {
      logOpts.func(
        'debug',
        `[debug] calling start() again: cycleIndex=${variants.cycleIndex}, minCompletedCount before start=${variants.minCompletedCount}`,
      )
    }
    variants.start()
    if (logOpts.debug) {
      logOpts.func(
        'debug',
        `[debug] after start(): cycleIndex=${variants.cycleIndex}, modeIndex=${variants.modeIndex}, minCompletedCount=${variants.minCompletedCount}`,
      )
    }
  }

  // Wait for all parallel tasks to complete
  if (pool) {
    await poolWait({ pool, count: parallel, hold: true })
    void pool.release(parallel)
  }

  // Only throw if abort has a real error reason (not flow control abort for findBestError)
  // Flow control abort uses null reason; real errors use Error instances
  if (abortSignal?.aborted && abortSignal.reason != null) {
    throw abortSignal.reason
  }

  // Completion
  logCompleted(logOpts, timeController, state)
  await garbageCollect(1)

  return createRunResult(state, variants, findBestError, dontThrowIfError)
}
