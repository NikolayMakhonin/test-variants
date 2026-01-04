import { isPromiseLike } from '@flemist/async-utils'
import { poolWait } from '@flemist/time-limits'
import type { Obj } from '@flemist/simple-utils'
import type { ArgsWithSeed } from '../types'
import type { RunContext } from './RunContext'
import { logModeChange, logProgress, type RunLoggerDeps } from './runLogger'
import { shouldTriggerGC, triggerGC, type GCConfig } from './gcManager'
import {
  handleSyncError,
  handleParallelError,
  type ErrorHandlerDeps,
} from './errorHandlers'

/** Run the main iteration loop */
export async function runIterationLoop<Args extends Obj>(
  ctx: RunContext<Args>,
): Promise<void> {
  const {
    config,
    testRun,
    variants,
    testOptions,
    abortControllerParallel,
    abortSignal,
    pool,
    state,
  } = ctx
  const {
    logOpts,
    abortSignalExternal,
    findBestError,
    cycles,
    limitTime,
    timeController,
    onModeChange,
    parallel,
  } = config

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
    store: config.store,
    abortControllerParallel,
    findBestError: !!findBestError,
  }

  // Start iteration
  variants.start()
  if (logOpts.debug) {
    logOpts.func(
      'debug',
      `[debug] start() called: cycleIndex=${variants.cycleIndex}, modeIndex=${variants.modeIndex}, minCompletedCount=${variants.minCompletedCount}, cycles=${cycles}`,
    )
  }

  // Log initial mode
  if (logOpts.modeChange) {
    logModeChange(logOpts, variants.modeConfig, variants.modeIndex)
  }
  state.prevModeIndex = variants.modeIndex
  if (onModeChange && variants.modeConfig) {
    const result = onModeChange({
      mode: variants.modeConfig,
      modeIndex: variants.modeIndex,
      tests: state.iterations,
    })
    if (isPromiseLike(result)) await result
  }

  // Outer loop: cycles
  while (variants.minCompletedCount < cycles && !state.timeLimitExceeded) {
    if (logOpts.debug) {
      logOpts.func(
        'debug',
        `[debug] outer loop: minCompletedCount=${variants.minCompletedCount} < cycles=${cycles}`,
      )
    }

    // Time limit check at cycle start
    if (
      limitTime != null &&
      timeController.now() - state.startTime >= limitTime
    ) {
      state.timeLimitExceeded = true
      break
    }

    let args: ArgsWithSeed<Args> = null!

    // Inner loop: variants within cycle
    while (!abortSignalExternal?.aborted) {
      // Get next variant (or reuse previous in debug mode)
      if (!state.debug) {
        const nextArgs = variants.next()
        if (nextArgs == null) break
        args = nextArgs
      }

      // Mode change detection
      if (variants.modeIndex !== state.prevModeIndex) {
        if (logOpts.debug) {
          logOpts.func(
            'debug',
            `[debug] mode switch: modeIndex=${variants.modeIndex}, index=${variants.index}`,
          )
        }
        state.modeChanged = true
        state.prevModeIndex = variants.modeIndex
        if (onModeChange && variants.modeConfig) {
          const result = onModeChange({
            mode: variants.modeConfig,
            modeIndex: variants.modeIndex,
            tests: state.iterations,
          })
          if (isPromiseLike(result)) await result
        }
      }

      // Periodic tasks: progress logging, time limit, GC
      if (logOpts.progress || gcConfig.GC_Interval || limitTime) {
        const now = timeController.now()

        if (limitTime != null && now - state.startTime >= limitTime) {
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

      if (abortSignalExternal?.aborted) continue

      // Test execution
      if (!pool || abortSignal.aborted) {
        // Sync execution path
        try {
          let promiseOrResult = testRun(args, state.iterations, testOptions)
          if (isPromiseLike(promiseOrResult)) {
            promiseOrResult = await promiseOrResult
          }
          if (!promiseOrResult) {
            state.debug = true
            abortControllerParallel.abort()
            continue
          }
          state.iterationsAsync += promiseOrResult.iterationsAsync
          state.iterations +=
            promiseOrResult.iterationsSync + promiseOrResult.iterationsAsync
        } catch (err) {
          await handleSyncError(errorHandlerDeps, state, args, err)
        }
      } else {
        // Parallel execution path
        if (!pool.hold(1)) {
          await poolWait({ pool, count: 1, hold: true })
        }

        const capturedArgs = args
        const capturedIterations = state.iterations

        void (async () => {
          try {
            if (abortSignal?.aborted) return
            let promiseOrResult = testRun(
              capturedArgs,
              capturedIterations,
              testOptions,
            )
            if (isPromiseLike(promiseOrResult)) {
              promiseOrResult = await promiseOrResult
            }
            if (!promiseOrResult) {
              state.debug = true
              abortControllerParallel.abort()
              return
            }
            state.iterationsAsync += promiseOrResult.iterationsAsync
            state.iterations +=
              promiseOrResult.iterationsSync + promiseOrResult.iterationsAsync
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

    // Cycle end: update metrics
    state.prevCycleVariantsCount = variants.count
    state.prevCycleDuration = timeController.now() - state.cycleStartTime
    state.cycleStartTime = timeController.now()

    // Time limit check at cycle end
    if (
      limitTime != null &&
      timeController.now() - state.startTime >= limitTime
    ) {
      state.timeLimitExceeded = true
      break
    }

    // Restart for next cycle
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

  // Wait for parallel tasks
  if (pool) {
    await poolWait({ pool, count: parallel, hold: true })
    void pool.release(parallel)
  }
}
