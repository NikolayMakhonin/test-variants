import {TestVariantsTestRun} from './testVariantsCreateTestRun'
import {AbortControllerFast, type IAbortSignalFast} from '@flemist/abort-controller-fast'
import {combineAbortSignals, isPromiseLike} from '@flemist/async-utils'
import {type IPool, Pool} from '@flemist/time-limits'
import {garbageCollect} from 'src/garbage-collect/garbageCollect'
import {Obj, type SaveErrorVariantsOptions, type TestVariantsLogOptions} from 'src/test-variants/types'
import {generateErrorVariantFilePath, parseErrorVariantFile, readErrorVariantFiles, saveErrorVariantFile} from 'src/test-variants/saveErrorVariants'
import {TestVariantsIterator, type GetSeedParams, type LimitArgOnError, type ModeConfig} from './testVariantsIterator'
import * as path from 'path'

const logOptionsDefault: Required<TestVariantsLogOptions> = {
  start           : true,
  progressInterval: 5000,
  completed       : true,
  error           : true,
}

const logOptionsDisabled: TestVariantsLogOptions = {
  start           : false,
  progressInterval: false,
  completed       : false,
  error           : false,
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
  parallel?: null | number | boolean,
  /** Number of full passes through all variants; default 1 */
  cycles?: null | number,
  /** Generates seed for reproducible randomized testing; seed is added to args */
  getSeed?: null | ((params: GetSeedParams) => any),
  /** Iteration phases; each phase runs until its limits are reached */
  modes?: null | ModeConfig[],
  findBestError?: null | TestVariantsFindBestErrorOptions,
  /** Save error-causing args to files and replay them before normal iteration */
  saveErrorVariants?: null | SaveErrorVariantsOptions<Args, SavedArgs>,
  /** Tests only first N variants, ignores the rest. If null or not specified, tests all variants */
  limitVariantsCount?: null | number,
  /** Maximum test run duration in milliseconds; when exceeded, iteration stops and current results are returned */
  limitTime?: null | number,
}

export type TestVariantsBestError<Args extends Obj> = {
  error: any,
  args: Args,
  index: number,
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
  const retriesPerVariant = saveErrorVariants?.retriesPerVariant ?? 1
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

  const log = options.log
  const logOpts = log === false
    ? logOptionsDisabled
    : log === true
      ? logOptionsDefault
      : log && typeof log === 'object'
        ? log
        : logOptionsDefault
  const logStart = logOpts.start ?? logOptionsDefault.start
  const logInterval = logOpts.progressInterval ?? logOptionsDefault.progressInterval
  const logCompleted = logOpts.completed ?? logOptionsDefault.completed

  const abortSignalExternal = options.abortSignal
  const findBestError = options.findBestError
  const cycles = options.cycles ?? 1
  const dontThrowIfError = findBestError?.dontThrowIfError
  const limitTime = options.limitTime

  const parallel = options.parallel === true
    ? 2 ** 31
    : !options.parallel || options.parallel <= 0
      ? 1
      : options.parallel

  // Apply initial limits
  if (options.limitVariantsCount != null) {
    variants.addLimit({index: options.limitVariantsCount})
  }

  // Replay phase: run previously saved error variants before normal iteration
  if (saveErrorVariants) {
    const files = await readErrorVariantFiles(saveErrorVariants.dir)
    for (const filePath of files) {
      const args = await parseErrorVariantFile<Args, SavedArgs>(filePath, saveErrorVariants.jsonToArgs)
      for (let retry = 0; retry < retriesPerVariant; retry++) {
        try {
          const promiseOrResult = testRun(args, -1, null as any)
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
  const startTime = Date.now()
  let cycleStartTime = startTime

  const abortControllerParallel = new AbortControllerFast()
  const abortSignalParallel = combineAbortSignals(abortSignalExternal, abortControllerParallel.signal)
  const abortSignalAll = abortSignalParallel

  const startMemory = getMemoryUsage()
  if (logStart && startMemory != null) {
    console.log(`[test-variants] start, memory: ${formatBytes(startMemory)}`)
  }

  let debug = false
  let iterations = 0
  let iterationsAsync = 0
  let prevLogTime = Date.now()
  let prevLogMemory = startMemory
  let prevGC_Time = prevLogTime
  let prevGC_Iterations = iterations
  let prevGC_IterationsAsync = iterationsAsync

  const pool: IPool = parallel <= 1
    ? null
    : new Pool(parallel)

  function onCompleted() {
    if (logCompleted) {
      let log = `[test-variants] variants: ${variants.index}, iterations: ${iterations}, async: ${iterationsAsync}`
      if (startMemory != null) {
        const memory = getMemoryUsage()
        if (memory != null) {
          const diff = memory - startMemory
          log += `, memory: ${formatBytes(memory)} (${diff >= 0 ? '+' : ''}${formatBytes(diff)})`
        }
      }
      console.log(log)
    }
  }

  // Main iteration using iterator
  let timeLimitExceeded = false
  variants.start()
  while (variants.cycleIndex < cycles && !timeLimitExceeded) {
    let args: Args | null
    while (!abortSignalExternal?.aborted && (debug || (args = variants.next()) != null)) {
      const _index = variants.index
      const _args = args

      const now = (logInterval || GC_Interval || limitTime) && Date.now()

      if (limitTime && now - startTime >= limitTime) {
        timeLimitExceeded = true
        break
      }

      if (logInterval && now - prevLogTime >= logInterval) {
        // the log is required to prevent the karma browserNoActivityTimeout
        let log = ''
        const cycleElapsed = now - cycleStartTime
        const totalElapsed = now - startTime
        if (findBestError) {
          log += `cycle: ${variants.cycleIndex}, variant: ${variants.index}`
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
            log += `/${max} (${formatDuration(cycleElapsed)}/${formatDuration(estimatedCycleTime)})`
          }
          else {
            log += ` (${formatDuration(cycleElapsed)})`
          }
        }
        else {
          log += `variant: ${variants.index} (${formatDuration(cycleElapsed)})`
        }
        log += `, total: ${iterations} (${formatDuration(totalElapsed)})`
        if (prevLogMemory != null) {
          const memory = getMemoryUsage()
          if (memory != null) {
            const diff = memory - prevLogMemory
            log += `, memory: ${formatBytes(memory)} (${diff >= 0 ? '+' : ''}${formatBytes(diff)})`
            prevLogMemory = memory
          }
        }
        console.log(log)
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
          let promiseOrIterations = testRun(
            _args,
            _index,
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
          if (errorVariantFilePath) {
            await saveErrorVariantFile(_args, errorVariantFilePath, saveErrorVariants.argsToJson)
          }
          if (findBestError) {
            variants.addLimit({error: err})
            debug = false
          }
          else {
            throw err
          }
        }
      }
      else {
        if (!pool.hold(1)) {
          await pool.holdWait(1)
        }
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        void (async () => {
          try {
            if (abortSignalParallel?.aborted) {
              return
            }
            let promiseOrIterations = testRun(
              _args,
              _index,
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
            if (errorVariantFilePath) {
              await saveErrorVariantFile(_args, errorVariantFilePath, saveErrorVariants.argsToJson)
            }
            if (findBestError) {
              variants.addLimit({error: err})
              debug = false
            }
            else {
              throw err
            }
          }
          finally {
            void pool.release(1)
          }
        })()
      }
    }

    // Track cycle metrics for logging
    prevCycleVariantsCount = variants.count
    prevCycleDuration = Date.now() - cycleStartTime
    cycleStartTime = Date.now()
    variants.start()
  }

  if (pool) {
    await pool.holdWait(parallel)
    void pool.release(parallel)
  }

  if (abortSignalAll?.aborted) {
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
      index: includeErrorVariant ? (variants.count ?? 1) - 1 : (variants.count ?? 0),
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
