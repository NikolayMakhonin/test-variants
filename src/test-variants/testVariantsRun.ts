import {TestVariantsTestRun} from './testVariantsCreateTestRun'
import {AbortControllerFast, type IAbortSignalFast} from '@flemist/abort-controller-fast'
import {combineAbortSignals, isPromiseLike} from '@flemist/async-utils'
import {type IPool, Pool} from '@flemist/time-limits'
import {garbageCollect} from 'src/garbage-collect/garbageCollect'
import {Obj} from 'src/test-variants/types'

export type TestVariantsFindBestErrorOptions = {
  groupSize?: null | number
  seeds: Iterable<any>
}

export type TestVariantsRunOptions = {
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
}

export type TestVariantsBestError<Args extends Obj> = {
  index: number,
  args: Args,
  error: any,
}

export type TestVariantsRunResult<Arg extends Obj> = {
  iterations: number
  bestError: null | TestVariantsBestError<Arg>
}

export async function testVariantsRun<Args extends Obj>(
  testRun: TestVariantsTestRun<Args>,
  variants: Iterable<Args>,
  options: TestVariantsRunOptions = {},
): Promise<TestVariantsRunResult<Args>> {
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

  const seedsIterator = findBestError?.seeds[Symbol.iterator]() ?? null
  let seedResult: any = seedsIterator?.next()
  let bestError: TestVariantsBestError<Args> | null = null

  let index = -1
  let args: Args = {} as any
  let variantsIterator = variants[Symbol.iterator]()

  function nextVariant() {
    while (true) {
      index++
      if (seedResult && seedResult.done) {
        return false
      }

      if (bestError == null || index < bestError.index) {
        const result = variantsIterator.next()
        if (!result.done) {
          args = result.value
          return true
        }
      }

      if (!seedsIterator) {
        return false
      }

      seedResult = seedsIterator.next()
      if (seedResult.done) {
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
      const _args = !pool
        ? args
        : {...args, seed: seedResult?.value}

      const now = (logInterval || GC_Interval) && Date.now()

      if (logInterval && now - prevLogTime >= logInterval) {
        // the log is required to prevent the karma browserNoActivityTimeout
        console.log(_index)
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
            _index,
            _args,
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
            bestError = {
              index: _index,
              args : _args,
              error: err,
            }
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
              _index,
              _args,
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
              bestError = {
                index: _index,
                args : _args,
                error: err,
              }
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
