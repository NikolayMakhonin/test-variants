import type { TestVariantsTestRun } from './testVariantsCreateTestRun'
import { AbortControllerFast } from '@flemist/abort-controller-fast'
import { combineAbortSignals, isPromiseLike } from '@flemist/async-utils'
import { type IPool, Pool, poolWait } from '@flemist/time-limits'
import { garbageCollect } from 'src/common/garbage-collect/garbageCollect'
import type { Obj } from '@flemist/simple-utils'
import type {
  TestVariantsBestError,
  TestVariantsIterator,
  TestVariantsRunOptions,
  TestVariantsRunResult,
} from 'src/common/test-variants/types'
import {
  generateErrorVariantFilePath,
  saveErrorVariantFile,
} from 'src/common/test-variants/saveErrorVariants'
import { deepEqualJsonLike } from '@flemist/simple-utils'
import { fileLock } from '@flemist/simple-utils/node'
import { log } from 'src/common/helpers/log'
import * as path from 'path'
import { timeControllerDefault } from '@flemist/time-controller'
import {
  formatBytes,
  formatDuration,
  formatModeConfig,
  getMemoryUsage,
  logOptionsDefault,
  resolveLogOptions,
} from 'src/common/test-variants/progressLogging'
import { replayErrorVariants } from 'src/common/test-variants/errorVariantReplay'

export async function testVariantsRun<Args extends Obj, SavedArgs = Args>(
  testRun: TestVariantsTestRun<Args>,
  variants: TestVariantsIterator<Args>,
  options: TestVariantsRunOptions<Args, SavedArgs> = {},
): Promise<TestVariantsRunResult<Args>> {
  const saveErrorVariants = options.saveErrorVariants
  const sessionDate = new Date()
  const errorVariantFilePath = saveErrorVariants
    ? path.resolve(
        saveErrorVariants.dir,
        saveErrorVariants.getFilePath?.({ sessionDate }) ??
          generateErrorVariantFilePath({ sessionDate }),
      )
    : null

  const GC_Iterations = options.GC_Iterations ?? 1000000
  const GC_IterationsAsync = options.GC_IterationsAsync ?? 10000
  const GC_Interval = options.GC_Interval ?? 1000

  const logOpts = resolveLogOptions(options.log)
  const logStart = logOpts.start ?? logOptionsDefault.start
  const logInterval =
    logOpts.progressInterval ?? logOptionsDefault.progressInterval
  const logCompleted = logOpts.completed ?? logOptionsDefault.completed
  const logModeChange = logOpts.modeChange ?? logOptionsDefault.modeChange
  const logDebug = logOpts.debug ?? logOptionsDefault.debug

  const abortSignalExternal = options.abortSignal
  const findBestError = options.findBestError
  const cycles = options.cycles ?? 1
  const dontThrowIfError = findBestError?.dontThrowIfError
  const limitTime = options.limitTime
  const timeController = options.timeController ?? timeControllerDefault

  const parallel =
    options.parallel === true
      ? 2 ** 31
      : !options.parallel || options.parallel <= 0
        ? 1
        : options.parallel

  // Apply initial limits
  if (options.limitTests != null) {
    variants.addLimit({ index: options.limitTests })
  }

  // Replay phase: run previously saved error variants before normal iteration
  if (saveErrorVariants) {
    await replayErrorVariants({
      testRun,
      variants,
      saveErrorVariants,
      useToFindBestError: saveErrorVariants.useToFindBestError,
      findBestErrorEnabled: !!findBestError,
    })
  }

  let prevCycleVariantsCount: null | number = null
  let prevCycleDuration: null | number = null
  const startTime = timeController.now()
  let cycleStartTime = startTime

  const abortControllerParallel = new AbortControllerFast()
  const abortSignalParallel = combineAbortSignals(
    abortSignalExternal,
    abortControllerParallel.signal,
  )
  const abortSignalAll = abortSignalParallel

  const startMemory = getMemoryUsage()
  if (logStart && startMemory != null) {
    log(`[test-variants] start, memory: ${formatBytes(startMemory)}`)
  }

  // Debug mode: repeats failing variant for step-by-step JS debugging.
  // When testRun returns void (from onError debug mode), this flag is set to true.
  // Next iteration skips variants.next() and reruns the same args,
  // allowing developer to set breakpoints and debug the failing case.
  // Triggered by debugger statement in onError when developer resumes after >50ms pause.
  // DO NOT REMOVE - essential for debugging failing test variants.
  let debug = false
  let iterations = 0
  let iterationsAsync = 0
  let prevLogTime = timeController.now()
  let prevLogMemory = startMemory
  let prevGC_Time = prevLogTime
  let prevGC_Iterations = iterations
  let prevGC_IterationsAsync = iterationsAsync
  let prevModeIndex = -1
  let modeChanged = false

  const pool: IPool = parallel <= 1 ? null : new Pool(parallel)

  // Track last saved error args to prevent duplicate writes
  let lastSavedLimitArgs: Args | null = null

  // Save current limit args to file if changed since last save
  async function saveCurrentLimit(): Promise<void> {
    if (!errorVariantFilePath || !variants.limit) {
      return
    }
    const currentArgs = variants.limit.args
    if (deepEqualJsonLike(currentArgs, lastSavedLimitArgs)) {
      return
    }
    lastSavedLimitArgs = { ...currentArgs }
    await fileLock({
      filePath: errorVariantFilePath,
      func: () =>
        saveErrorVariantFile(
          currentArgs,
          errorVariantFilePath,
          saveErrorVariants.argsToJson,
        ),
    })
  }

  function onCompleted() {
    if (logCompleted) {
      const totalElapsed = timeController.now() - startTime
      let logMsg = `[test-variants] end, tests: ${iterations} (${formatDuration(totalElapsed)}), async: ${iterationsAsync}`
      if (startMemory != null) {
        const memory = getMemoryUsage()
        if (memory != null) {
          const diff = memory - startMemory
          logMsg += `, memory: ${formatBytes(memory)} (${diff >= 0 ? '+' : ''}${formatBytes(diff)})`
        }
      }
      log(logMsg)
    }
  }

  // Main iteration using iterator
  let timeLimitExceeded = false
  variants.start()
  if (logDebug) {
    log(
      `[debug] start() called: cycleIndex=${variants.cycleIndex}, modeIndex=${variants.modeIndex}, minCompletedCount=${variants.minCompletedCount}, cycles=${cycles}`,
    )
  }
  // Always show current mode at start
  if (logModeChange) {
    prevModeIndex = variants.modeIndex
    log(
      `[test-variants] ${formatModeConfig(variants.modeConfig, variants.modeIndex)}`,
    )
  }
  while (variants.minCompletedCount < cycles && !timeLimitExceeded) {
    if (logDebug) {
      log(
        `[debug] outer loop: minCompletedCount=${variants.minCompletedCount} < cycles=${cycles}`,
      )
    }
    // Check time limit at start of each round
    if (limitTime && timeController.now() - startTime >= limitTime) {
      timeLimitExceeded = true
      break
    }

    let args: Args | null
    while (
      !abortSignalExternal?.aborted &&
      (debug || (args = variants.next()) != null)
    ) {
      const _args = args

      if (variants.modeIndex !== prevModeIndex) {
        if (logDebug) {
          log(
            `[debug] mode switch: modeIndex=${variants.modeIndex}, index=${variants.index}`,
          )
        }
        modeChanged = true
        prevModeIndex = variants.modeIndex
      }

      const now =
        (logInterval || GC_Interval || limitTime) && timeController.now()

      if (limitTime && now - startTime >= limitTime) {
        timeLimitExceeded = true
        break
      }

      if (logInterval && now - prevLogTime >= logInterval) {
        // the log is required to prevent the karma browserNoActivityTimeout
        // Log mode change together with progress when mode changed
        if (logModeChange && modeChanged) {
          log(
            `[test-variants] ${formatModeConfig(variants.modeConfig, variants.modeIndex)}`,
          )
          modeChanged = false
        }
        let logMsg = '[test-variants] '
        const cycleElapsed = now - cycleStartTime
        const totalElapsed = now - startTime
        if (findBestError) {
          logMsg += `cycle: ${variants.cycleIndex}, variant: ${variants.index}`
          let max = variants.count
          if (max != null) {
            if (
              prevCycleVariantsCount != null &&
              prevCycleVariantsCount < max
            ) {
              max = prevCycleVariantsCount
            }
          }
          if (max != null && variants.index > 0) {
            let estimatedCycleTime: number
            if (
              prevCycleDuration != null &&
              prevCycleVariantsCount != null &&
              variants.index < prevCycleVariantsCount &&
              cycleElapsed < prevCycleDuration
            ) {
              const adjustedDuration = prevCycleDuration - cycleElapsed
              const adjustedCount = prevCycleVariantsCount - variants.index
              const speedForRemaining = adjustedDuration / adjustedCount
              const remainingTime = (max - variants.index) * speedForRemaining
              estimatedCycleTime = cycleElapsed + remainingTime
            } else {
              estimatedCycleTime = (cycleElapsed * max) / variants.index
            }
            logMsg += `/${max} (${formatDuration(cycleElapsed)}/${formatDuration(estimatedCycleTime)})`
          } else {
            logMsg += ` (${formatDuration(cycleElapsed)})`
          }
        } else {
          logMsg += `variant: ${variants.index} (${formatDuration(cycleElapsed)})`
        }
        logMsg += `, tests: ${iterations} (${formatDuration(totalElapsed)}), async: ${iterationsAsync}`
        if (prevLogMemory != null) {
          const memory = getMemoryUsage()
          if (memory != null) {
            const diff = memory - prevLogMemory
            logMsg += `, memory: ${formatBytes(memory)} (${diff >= 0 ? '+' : ''}${formatBytes(diff)})`
            prevLogMemory = memory
          }
        }
        log(logMsg)
        prevLogTime = now
      }

      if (
        (GC_Iterations && iterations - prevGC_Iterations >= GC_Iterations) ||
        (GC_IterationsAsync &&
          iterationsAsync - prevGC_IterationsAsync >= GC_IterationsAsync) ||
        (GC_Interval && now - prevGC_Time >= GC_Interval)
      ) {
        prevGC_Iterations = iterations
        prevGC_IterationsAsync = iterationsAsync
        prevGC_Time = now
        await garbageCollect(1)
      }

      if (abortSignalExternal?.aborted) {
        continue
      }

      if (!pool || abortSignalParallel.aborted) {
        try {
          // Pass current iterations count (tests run before this one)
          let promiseOrIterations = testRun(
            _args,
            iterations,
            abortSignalParallel,
          )
          if (isPromiseLike(promiseOrIterations)) {
            promiseOrIterations = await promiseOrIterations
          }
          if (!promiseOrIterations) {
            debug = true
            abortControllerParallel.abort()
            continue
          }
          const {
            iterationsAsync: _iterationsAsync,
            iterationsSync: _iterationsSync,
          } = promiseOrIterations
          iterationsAsync += _iterationsAsync
          iterations += _iterationsSync + _iterationsAsync
        } catch (err) {
          if (findBestError) {
            // Pass captured _args explicitly - state.args may differ in parallel mode
            variants.addLimit({ args: _args, error: err })
            await saveCurrentLimit()
            debug = false
          } else {
            // Save error variant even without findBestError
            if (errorVariantFilePath) {
              await fileLock({
                filePath: errorVariantFilePath,
                func: () =>
                  saveErrorVariantFile(
                    _args,
                    errorVariantFilePath,
                    saveErrorVariants?.argsToJson,
                  ),
              })
            }
            throw err
          }
        }
      } else {
        if (!pool.hold(1)) {
          await poolWait({
            pool,
            count: 1,
            hold: true,
          })
        }
        // Capture current iterations count for this test (tests run before this one)
        const _tests = iterations

        void (async () => {
          try {
            if (abortSignalParallel?.aborted) {
              return
            }
            let promiseOrIterations = testRun(
              _args,
              _tests,
              abortSignalParallel,
            )
            if (isPromiseLike(promiseOrIterations)) {
              promiseOrIterations = await promiseOrIterations
            }
            if (!promiseOrIterations) {
              debug = true
              abortControllerParallel.abort()
              return
            }
            const {
              iterationsAsync: _iterationsAsync,
              iterationsSync: _iterationsSync,
            } = promiseOrIterations
            iterationsAsync += _iterationsAsync
            iterations += _iterationsSync + _iterationsAsync
          } catch (err) {
            if (findBestError) {
              // Pass captured _args explicitly - iterator has moved in parallel mode
              variants.addLimit({ args: _args, error: err })
              void saveCurrentLimit()
              debug = false
              // Abort current cycle after first error - next cycle will use new limits
              // This prevents in-flight parallel tests from continuing to error and spam logs
              // Use explicit null reason to distinguish from real errors
              if (!abortControllerParallel.signal.aborted) {
                abortControllerParallel.abort(null)
              }
            }
            // Store error and abort to throw after pool drains
            else if (!abortControllerParallel.signal.aborted) {
              // Save error variant even without findBestError
              if (errorVariantFilePath) {
                void fileLock({
                  filePath: errorVariantFilePath,
                  func: () =>
                    saveErrorVariantFile(
                      _args,
                      errorVariantFilePath,
                      saveErrorVariants?.argsToJson,
                    ),
                })
              }
              abortControllerParallel.abort(err)
            }
          } finally {
            void pool.release(1)
          }
        })()
      }
    }

    if (logDebug) {
      log(
        `[debug] inner loop exited: modeIndex=${variants.modeIndex}, index=${variants.index}, count=${variants.count}, iterations=${iterations}`,
      )
    }

    // Track cycle metrics for logging
    prevCycleVariantsCount = variants.count
    prevCycleDuration = timeController.now() - cycleStartTime
    cycleStartTime = timeController.now()

    // Check time limit at end of each round
    if (limitTime && timeController.now() - startTime >= limitTime) {
      timeLimitExceeded = true
      break
    }

    if (logDebug) {
      log(
        `[debug] calling start() again: cycleIndex=${variants.cycleIndex}, minCompletedCount before start=${variants.minCompletedCount}`,
      )
    }
    variants.start()
    if (logDebug) {
      log(
        `[debug] after start(): cycleIndex=${variants.cycleIndex}, modeIndex=${variants.modeIndex}, minCompletedCount=${variants.minCompletedCount}`,
      )
    }
  }

  if (pool) {
    await poolWait({
      pool,
      count: parallel,
      hold: true,
    })
    void pool.release(parallel)
  }

  // Only throw if abort has a real error reason (not flow control abort for findBestError)
  // Flow control abort uses null reason; real errors use Error instances
  if (abortSignalAll?.aborted && abortSignalAll.reason != null) {
    throw abortSignalAll.reason
  }

  onCompleted()
  await garbageCollect(1)

  // Construct bestError from iterator state
  // When includeErrorVariant is true, count is error_index + 1, so compute actual error index
  const includeErrorVariant = findBestError?.includeErrorVariant
  const bestError: TestVariantsBestError<Args> | null = variants.limit
    ? {
        error: variants.limit.error,
        args: variants.limit.args,
        tests: includeErrorVariant
          ? (variants.count ?? 1) - 1
          : (variants.count ?? 0),
      }
    : null

  if (bestError && !dontThrowIfError) {
    throw bestError.error
  }

  return {
    iterations,
    bestError,
  }
}
