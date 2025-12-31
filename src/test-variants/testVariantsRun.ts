import {TestVariantsTestRun} from './testVariantsCreateTestRun'
import {AbortControllerFast, type IAbortSignalFast} from '@flemist/abort-controller-fast'
import {combineAbortSignals, isPromiseLike} from '@flemist/async-utils'
import {type IPool, Pool, poolWait} from '@flemist/time-limits'
import {garbageCollect} from 'src/garbage-collect/garbageCollect'
import {Obj, type SaveErrorVariantsOptions, type TestVariantsLogOptions} from 'src/test-variants/types'
import {generateErrorVariantFilePath, parseErrorVariantFile, readErrorVariantFiles, saveErrorVariantFile} from 'src/test-variants/saveErrorVariants'
import {TestVariantsIterator, type GetSeedParams, type LimitArgOnError, type ModeConfig} from './testVariantsIterator'
import {fileLock} from 'src/test-variants/fs/fileLock'
import {deepEqual} from 'src/helpers/deepEqual'
import {log} from 'src/helpers/log'
import * as path from 'path'
import type {ITimeController} from '@flemist/time-controller'
import {timeControllerDefault} from '@flemist/time-controller'

const logOptionsDefault: Required<TestVariantsLogOptions> = {
  start           : true,
  progressInterval: 5000,
  completed       : true,
  error           : true,
  modeChange      : true,
  debug           : false,
}

const logOptionsDisabled: TestVariantsLogOptions = {
  start           : false,
  progressInterval: false,
  completed       : false,
  error           : false,
  modeChange      : false,
  debug           : false,
}

function formatDuration(ms: number): string {
  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  const minutes = seconds / 60
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`
  }
  const hours = minutes / 60
  return `${hours.toFixed(1)}h`
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) {
    return gb >= 10 ? `${Math.round(gb)}GB` : `${gb.toFixed(1)}GB`
  }
  const mb = bytes / (1024 * 1024)
  if (mb >= 10) {
    return `${Math.round(mb)}MB`
  }
  return `${mb.toFixed(1)}MB`
}

function getMemoryUsage(): number | null {
  // Node.js
  if (typeof process !== 'undefined' && process.memoryUsage) {
    try {
      return process.memoryUsage().heapUsed
    }
    catch {
      // ignore
    }
  }
  // Browser (Chrome only, non-standard)
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    try {
      return (performance as any).memory.usedJSHeapSize
    }
    catch {
      // ignore
    }
  }
  return null
}

function formatModeConfig(modeConfig: ModeConfig | null, modeIndex: number): string {
  if (!modeConfig) {
    return `mode[${modeIndex}]: null`
  }
  let result = `mode[${modeIndex}]: ${modeConfig.mode}`
  if (modeConfig.mode === 'forward' || modeConfig.mode === 'backward') {
    if (modeConfig.cycles != null) {
      result += `, cycles=${modeConfig.cycles}`
    }
    if (modeConfig.attemptsPerVariant != null) {
      result += `, attempts=${modeConfig.attemptsPerVariant}`
    }
  }
  if (modeConfig.limitTime != null) {
    result += `, limitTime=${modeConfig.limitTime}ms`
  }
  if (modeConfig.limitTests != null) {
    result += `, limitTests=${modeConfig.limitTests}`
  }
  return result
}

/** Options for finding the earliest failing variant across multiple test runs */
export type TestVariantsFindBestErrorOptions = {
  /** Custom equality for comparing arg values when finding indexes */
  equals?: null | ((a: any, b: any) => boolean),
  /** Limit per-arg indexes on error; boolean enables/disables, function for custom per-arg logic */
  limitArgOnError?: null | boolean | LimitArgOnError,
  /** When true, error variant is included in iteration (for debugging); default false excludes it */
  includeErrorVariant?: null | boolean,
  /** Return found error instead of throwing after all cycles complete */
  dontThrowIfError?: null | boolean,
}

export type TestVariantsRunOptions<Args extends Obj = Obj, SavedArgs = Args> = {
  /** Wait for garbage collection after iterations */
  GC_Iterations?: null | number,
  /** Same as GC_Iterations but only for async test variants, required for 10000 and more of Promise rejections */
  GC_IterationsAsync?: null | number,
  /** Wait for garbage collection after time interval, required to prevent the karma browserDisconnectTimeout */
  GC_Interval?: null | number,
  /** Logging options; null/true uses defaults; false disables all; object for fine-grained control */
  log?: null | boolean | TestVariantsLogOptions,
  abortSignal?: null | IAbortSignalFast,
  /** true - all in parallel; number - max parallel; false/0/undefined - sequential */
  parallel?: null | number | boolean,
  /** Number of full passes through all variants; default 1 */
  cycles?: null | number,
  /** Generates seed for reproducible randomized testing; seed is added to args */
  getSeed?: null | ((params: GetSeedParams) => any),
  /** Iteration modes (variant traversal methods); each mode runs until its limits are reached */
  iterationModes?: null | ModeConfig[],
  findBestError?: null | TestVariantsFindBestErrorOptions,
  /** Save error-causing args to files and replay them before normal iteration */
  saveErrorVariants?: null | SaveErrorVariantsOptions<Args, SavedArgs>,
  /** Tests only first N variants, ignores the rest. If null or not specified, tests all variants */
  limitTests?: null | number,
  /** Maximum test run duration in milliseconds; when exceeded, iteration stops and current results are returned */
  limitTime?: null | number,
  /** Time controller for testable time-dependent operations; null uses timeControllerDefault */
  timeController?: null | ITimeController,
}

export type TestVariantsBestError<Args extends Obj> = {
  error: any,
  args: Args,
  /** Number of tests run before the error (including attemptsPerVariant) */
  tests: number,
}

export type TestVariantsRunResult<Arg extends Obj> = {
  iterations: number
  bestError: null | TestVariantsBestError<Arg>
}

export async function testVariantsRun<Args extends Obj, SavedArgs = Args>(
  testRun: TestVariantsTestRun<Args>,
  variants: TestVariantsIterator<Args>,
  options: TestVariantsRunOptions<Args, SavedArgs> = {},
): Promise<TestVariantsRunResult<Args>> {
  const saveErrorVariants = options.saveErrorVariants
  const attemptsPerVariant = saveErrorVariants?.attemptsPerVariant ?? 1
  const useToFindBestError = saveErrorVariants?.useToFindBestError
  const sessionDate = new Date()
  const errorVariantFilePath = saveErrorVariants
    ? path.resolve(
      saveErrorVariants.dir,
      saveErrorVariants.getFilePath?.({sessionDate}) ?? generateErrorVariantFilePath({sessionDate}),
    )
    : null

  const GC_Iterations = options.GC_Iterations ?? 1000000
  const GC_IterationsAsync = options.GC_IterationsAsync ?? 10000
  const GC_Interval = options.GC_Interval ?? 1000

  const logRaw = options.log
  const logOpts = logRaw === false
    ? logOptionsDisabled
    : logRaw === true
      ? logOptionsDefault
      : logRaw && typeof logRaw === 'object'
        ? logRaw
        : logOptionsDefault
  const logStart = logOpts.start ?? logOptionsDefault.start
  const logInterval = logOpts.progressInterval ?? logOptionsDefault.progressInterval
  const logCompleted = logOpts.completed ?? logOptionsDefault.completed
  const logModeChange = logOpts.modeChange ?? logOptionsDefault.modeChange
  const logDebug = logOpts.debug ?? logOptionsDefault.debug

  const abortSignalExternal = options.abortSignal
  const findBestError = options.findBestError
  const cycles = options.cycles ?? 1
  const dontThrowIfError = findBestError?.dontThrowIfError
  const limitTime = options.limitTime
  const timeController = options.timeController ?? timeControllerDefault

  const parallel = options.parallel === true
    ? 2 ** 31
    : !options.parallel || options.parallel <= 0
      ? 1
      : options.parallel

  // Apply initial limits
  if (options.limitTests != null) {
    variants.addLimit({index: options.limitTests})
  }

  // Replay phase: run previously saved error variants before normal iteration
  if (saveErrorVariants) {
    const files = await readErrorVariantFiles(saveErrorVariants.dir)
    for (const filePath of files) {
      const args = await parseErrorVariantFile<Args, SavedArgs>(filePath, saveErrorVariants.jsonToArgs)
      for (let retry = 0; retry < attemptsPerVariant; retry++) {
        try {
          // During replay, no regular tests have run yet, so tests count is 0
          const promiseOrResult = testRun(args, 0, null as any)
          if (isPromiseLike(promiseOrResult)) {
            await promiseOrResult
          }
        }
        catch (error) {
          if (useToFindBestError && findBestError) {
            // Store as pending limit for findBestError cycle
            variants.addLimit({args, error})
            break // Exit retry loop, continue to next file
          }
          else {
            throw error
          }
        }
      }
      // If no error occurred during replays, the saved variant is no longer reproducible
      // (templates may have changed) - silently skip
    }
  }

  let prevCycleVariantsCount: null | number = null
  let prevCycleDuration: null | number = null
  const startTime = timeController.now()
  let cycleStartTime = startTime

  const abortControllerParallel = new AbortControllerFast()
  const abortSignalParallel = combineAbortSignals(abortSignalExternal, abortControllerParallel.signal)
  const abortSignalAll = abortSignalParallel

  const startMemory = getMemoryUsage()
  if (logStart && startMemory != null) {
    log(`[test-variants] start, memory: ${formatBytes(startMemory)}`)
  }

  let debug = false
  let iterations = 0
  let iterationsAsync = 0
  let prevLogTime = timeController.now()
  let prevLogMemory = startMemory
  let prevGC_Time = prevLogTime
  let prevGC_Iterations = iterations
  let prevGC_IterationsAsync = iterationsAsync
  let prevModeIndex = -1

  const pool: IPool = parallel <= 1
    ? null
    : new Pool(parallel)

  // Track last saved error args to prevent duplicate writes
  let lastSavedLimitArgs: Args | null = null

  // Save current limit args to file if changed since last save
  async function saveCurrentLimit(): Promise<void> {
    if (!errorVariantFilePath || !variants.limit) {
      return
    }
    const currentArgs = variants.limit.args
    if (deepEqual(currentArgs, lastSavedLimitArgs)) {
      return
    }
    lastSavedLimitArgs = {...currentArgs}
    await fileLock({
      filePath: errorVariantFilePath,
      func    : () => saveErrorVariantFile(currentArgs, errorVariantFilePath, saveErrorVariants.argsToJson),
    })
  }

  function onCompleted() {
    if (logCompleted) {
      let logMsg = `[test-variants] variants: ${variants.index}, iterations: ${iterations}, async: ${iterationsAsync}`
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
    log(`[debug] start() called: cycleIndex=${variants.cycleIndex}, modeIndex=${variants.modeIndex}, minCompletedCount=${variants.minCompletedCount}, cycles=${cycles}`)
  }
  while (variants.minCompletedCount < cycles && !timeLimitExceeded) {
    if (logDebug) {
      log(`[debug] outer loop: minCompletedCount=${variants.minCompletedCount} < cycles=${cycles}`)
    }
    // Check time limit at start of each round
    if (limitTime && timeController.now() - startTime >= limitTime) {
      timeLimitExceeded = true
      break
    }

    let args: Args | null
    while (!abortSignalExternal?.aborted && (debug || (args = variants.next()) != null)) {
      const _index = variants.index
      const _args = args

      if (logDebug && variants.modeIndex !== prevModeIndex) {
        log(`[debug] mode switch: modeIndex=${variants.modeIndex}, index=${variants.index}`)
      }
      if (logModeChange && variants.modeIndex !== prevModeIndex) {
        prevModeIndex = variants.modeIndex
        log(`[test-variants] ${formatModeConfig(variants.modeConfig, variants.modeIndex)}`)
      }

      const now = (logInterval || GC_Interval || limitTime) && timeController.now()

      if (limitTime && now - startTime >= limitTime) {
        timeLimitExceeded = true
        break
      }

      if (logInterval && now - prevLogTime >= logInterval) {
        // the log is required to prevent the karma browserNoActivityTimeout
        let logMsg = ''
        const cycleElapsed = now - cycleStartTime
        const totalElapsed = now - startTime
        if (findBestError) {
          logMsg += `cycle: ${variants.cycleIndex}, variant: ${variants.index}`
          let max = variants.count
          if (max != null) {
            if (prevCycleVariantsCount != null && prevCycleVariantsCount < max) {
              max = prevCycleVariantsCount
            }
          }
          if (max != null && variants.index > 0) {
            let estimatedCycleTime: number
            if (
              prevCycleDuration != null && prevCycleVariantsCount != null
              && variants.index < prevCycleVariantsCount && cycleElapsed < prevCycleDuration
            ) {
              const adjustedDuration = prevCycleDuration - cycleElapsed
              const adjustedCount = prevCycleVariantsCount - variants.index
              const speedForRemaining = adjustedDuration / adjustedCount
              const remainingTime = (max - variants.index) * speedForRemaining
              estimatedCycleTime = cycleElapsed + remainingTime
            }
            else {
              estimatedCycleTime = cycleElapsed * max / variants.index
            }
            logMsg += `/${max} (${formatDuration(cycleElapsed)}/${formatDuration(estimatedCycleTime)})`
          }
          else {
            logMsg += ` (${formatDuration(cycleElapsed)})`
          }
        }
        else {
          logMsg += `variant: ${variants.index} (${formatDuration(cycleElapsed)})`
        }
        logMsg += `, total: ${iterations} (${formatDuration(totalElapsed)})`
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
        GC_Iterations && iterations - prevGC_Iterations >= GC_Iterations
        || GC_IterationsAsync && iterationsAsync - prevGC_IterationsAsync >= GC_IterationsAsync
        || GC_Interval && now - prevGC_Time >= GC_Interval
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
          const {iterationsAsync: _iterationsAsync, iterationsSync: _iterationsSync} = promiseOrIterations
          iterationsAsync += _iterationsAsync
          iterations += _iterationsSync + _iterationsAsync
        }
        catch (err) {
          if (findBestError) {
            // Pass captured _args explicitly - state.args may differ in parallel mode
            variants.addLimit({args: _args, error: err})
            await saveCurrentLimit()
            debug = false
          }
          else {
            // Save error variant even without findBestError
            if (errorVariantFilePath) {
              await fileLock({
                filePath: errorVariantFilePath,
                func    : () => saveErrorVariantFile(_args, errorVariantFilePath, saveErrorVariants?.argsToJson),
              })
            }
            throw err
          }
        }
      }
      else {
        if (!pool.hold(1)) {
          await poolWait({
            pool,
            count: 1,
            hold : true,
          })
        }
        // Capture current iterations count for this test (tests run before this one)
        const _tests = iterations
        // eslint-disable-next-line @typescript-eslint/no-loop-func
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
            const {iterationsAsync: _iterationsAsync, iterationsSync: _iterationsSync} = promiseOrIterations
            iterationsAsync += _iterationsAsync
            iterations += _iterationsSync + _iterationsAsync
          }
          catch (err) {
            if (findBestError) {
              // Pass captured _args explicitly - iterator has moved in parallel mode
              variants.addLimit({args: _args, error: err})
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
                  func    : () => saveErrorVariantFile(_args, errorVariantFilePath, saveErrorVariants?.argsToJson),
                })
              }
              abortControllerParallel.abort(err)
            }
          }
          finally {
            void pool.release(1)
          }
        })()
      }
    }

    if (logDebug) {
      log(`[debug] inner loop exited: modeIndex=${variants.modeIndex}, index=${variants.index}, count=${variants.count}, iterations=${iterations}`)
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
      log(`[debug] calling start() again: cycleIndex=${variants.cycleIndex}, minCompletedCount before start=${variants.minCompletedCount}`)
    }
    variants.start()
    if (logDebug) {
      log(`[debug] after start(): cycleIndex=${variants.cycleIndex}, modeIndex=${variants.modeIndex}, minCompletedCount=${variants.minCompletedCount}`)
    }
  }

  if (pool) {
    await poolWait({
      pool,
      count: parallel,
      hold : true,
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
      args : variants.limit.args,
      tests: includeErrorVariant ? (variants.count ?? 1) - 1 : (variants.count ?? 0),
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
