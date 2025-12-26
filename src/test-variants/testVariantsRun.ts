import {TestVariantsTestRun} from './testVariantsCreateTestRun'
import {AbortControllerFast, type IAbortSignalFast} from '@flemist/abort-controller-fast'
import {combineAbortSignals, isPromiseLike} from '@flemist/async-utils'
import {type IPool, Pool} from '@flemist/time-limits'
import {garbageCollect} from 'src/garbage-collect/garbageCollect'
import {Obj, type SaveErrorVariantsOptions} from 'src/test-variants/types'
import {generateErrorVariantFilePath, parseErrorVariantFile, readErrorVariantFiles, saveErrorVariantFile} from 'src/test-variants/saveErrorVariants'
import * as path from 'path'

/** Parameters passed to getSeed function for generating test seeds */
export type GetSeedParams = {
  /** Index of current variant/parameter-combination being tested */
  variantIndex: number,
  /** Index of current cycle - full pass through all variants (0..cycles-1) */
  cycleIndex: number,
  /** Index of repeat for current variant within this cycle (0..repeatsPerVariant-1) */
  repeatIndex: number,
  /** Total index across all cycles: cycleIndex × repeatsPerVariant + repeatIndex */
  totalIndex: number,
}

/** Options for finding the earliest failing variant across multiple test runs */
export type TestVariantsFindBestErrorOptions = {
  /** Function to generate seed based on current iteration state */
  getSeed: (params: GetSeedParams) => any,
  /** Number of full passes through all variants */
  cycles: number,
  /** Number of repeat tests per variant within each cycle */
  repeatsPerVariant: number,
}

export type TestVariantsRunOptions<Args extends Obj = Obj, SavedArgs = Args> = {
  /** Wait for garbage collection after iterations */
  GC_Iterations?: null | number,
  /** Same as GC_Iterations but only for async test variants, required for 10000 and more of Promise rejections */
  GC_IterationsAsync?: null | number,
  /** Wait for garbage collection after time interval, required to prevent the karma browserDisconnectTimeout */
  GC_Interval?: null | number,
  /** console log current iterations, required to prevent the karma browserNoActivityTimeout */
  logInterval?: null | number,
  /** console log iterations on test completed */
  logCompleted?: null | boolean,
  abortSignal?: null | IAbortSignalFast,
  parallel?: null | number | boolean,
  findBestError?: null | TestVariantsFindBestErrorOptions,
  /** Save error-causing args to files and replay them before normal iteration */
  saveErrorVariants?: null | SaveErrorVariantsOptions<Args, SavedArgs>,
  /** Tests only first N variants, ignores the rest. If null or not specified, tests all variants */
  limitVariantsCount?: null | number,
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
  variants: Iterable<Args>,
  options: TestVariantsRunOptions<Args, SavedArgs> = {},
): Promise<TestVariantsRunResult<Args>> {
  const saveErrorVariants = options.saveErrorVariants
  const retriesPerVariant = saveErrorVariants?.retriesPerVariant ?? 1
  const sessionDate = new Date()
  const errorVariantFilePath = saveErrorVariants
    ? path.resolve(
      saveErrorVariants.dir,
      saveErrorVariants.getFilePath?.({sessionDate}) ?? generateErrorVariantFilePath({sessionDate}),
    )
    : null

  // Replay phase: run previously saved error variants before normal iteration
  if (saveErrorVariants) {
    const files = await readErrorVariantFiles(saveErrorVariants.dir)
    for (const filePath of files) {
      const args = await parseErrorVariantFile<Args, SavedArgs>(filePath, saveErrorVariants.jsonToArgs)
      for (let retry = 0; retry < retriesPerVariant; retry++) {
        const promiseOrResult = testRun(args, -1, null as any)
        if (isPromiseLike(promiseOrResult)) {
          await promiseOrResult
        }
      }
    }
  }

  const GC_Iterations = options.GC_Iterations ?? 1000000
  const GC_IterationsAsync = options.GC_IterationsAsync ?? 10000
  const GC_Interval = options.GC_Interval ?? 1000
  const logInterval = options.logInterval ?? 5000
  const logCompleted = options.logCompleted ?? true
  const abortSignalExternal = options.abortSignal
  const findBestError = options.findBestError

  const parallel = options.parallel === true
    ? 2 ** 31
    : !options.parallel || options.parallel <= 0
      ? 1
      : options.parallel

  const limitVariantsCount = options.limitVariantsCount ?? null
  let cycleIndex = 0
  let repeatIndex = 0
  let seed: any = void 0
  let bestError: TestVariantsBestError<Args> | null = null

  let index = -1
  let args: Args = {} as any
  let variantsIterator = variants[Symbol.iterator]()
  
  function getLimitVariantsCount() {
    if (limitVariantsCount != null && bestError != null) {
      return Math.min(limitVariantsCount, bestError.index)
    }
    if (limitVariantsCount != null) {
      return limitVariantsCount
    }
    if (bestError != null) {
      return bestError.index
    }
    return null
  }

  function nextVariant() {
    while (true) {
      // Try next repeat for current variant
      if (findBestError && index >= 0 && (bestError == null || index < bestError.index)) {
        repeatIndex++
        if (repeatIndex < findBestError.repeatsPerVariant) {
          seed = findBestError.getSeed({
            variantIndex: index,
            cycleIndex,
            repeatIndex,
            totalIndex  : cycleIndex * findBestError.repeatsPerVariant + repeatIndex,
          })
          return true
        }
      }
      repeatIndex = 0

      index++
      if (findBestError && cycleIndex >= findBestError.cycles) {
        return false
      }

      const _limitVariantsCount = getLimitVariantsCount()
      if (
        _limitVariantsCount == null || index < _limitVariantsCount
      ) {
        const result = variantsIterator.next()
        if (!result.done) {
          args = result.value
          if (findBestError) {
            seed = findBestError.getSeed({
              variantIndex: index,
              cycleIndex,
              repeatIndex,
              totalIndex  : cycleIndex * findBestError.repeatsPerVariant + repeatIndex,
            })
          }
          return true
        }
      }

      if (!findBestError) {
        return false
      }

      cycleIndex++
      if (cycleIndex >= findBestError.cycles) {
        return false
      }

      index = -1
      variantsIterator = variants[Symbol.iterator]()
    }
  }

  const abortControllerParallel = new AbortControllerFast()
  const abortSignalParallel = combineAbortSignals(abortSignalExternal, abortControllerParallel.signal)
  const abortSignalAll = abortSignalParallel

  let debug = false
  let iterations = 0
  let iterationsAsync = 0
  let prevLogTime = Date.now()
  let prevGC_Time = prevLogTime
  let prevGC_Iterations = iterations
  let prevGC_IterationsAsync = iterationsAsync

  const pool: IPool = parallel <= 1
    ? null
    : new Pool(parallel)

  function onCompleted() {
    if (logCompleted) {
      console.log(`[test-variants] variants: ${index}, iterations: ${iterations}, async: ${iterationsAsync}`)
    }
  }

  async function next(): Promise<number> {
    while (!abortSignalExternal?.aborted && (debug || nextVariant())) {
      const _index = index
      const _args = {...args, seed}

      const now = (logInterval || GC_Interval) && Date.now()

      if (logInterval && now - prevLogTime >= logInterval) {
        // the log is required to prevent the karma browserNoActivityTimeout
        let log = ''
        if (findBestError) {
          log += `cycle: ${cycleIndex}, variant: ${index}`
          const _limitVariantsCount = getLimitVariantsCount()
          if (_limitVariantsCount != null) {
            log += `/${_limitVariantsCount}`
          }
        }
        else {
          log += `variant: ${index}`
        }
        log += `, total: ${iterations}`
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
            bestError = {
              error: err,
              args : _args,
              index: _index,
            }
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
              bestError = {
                error: err,
                args : _args,
                index: _index,
              }
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

    if (pool) {
      await pool.holdWait(parallel)
      void pool.release(parallel)
    }

    if (abortSignalAll?.aborted) {
      throw abortSignalAll.reason
    }

    onCompleted()
    await garbageCollect(1)

    return iterations
  }

  const result = await next()

  return {
    iterations: result,
    bestError,
  }
}
