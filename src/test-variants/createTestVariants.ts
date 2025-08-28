/* eslint-disable @typescript-eslint/no-shadow */

// type Func<This, Args extends any[], Result> = (this: This, ...args: Args) => Result

// type ArrayItem<T> = T extends Array<infer T> ? T : never

// type ArrayOrFuncItem<T> = T extends Array<infer T> ? T
//   : T extends Func<any, any[], infer T> ? ArrayItem<T>
//     : never

// type VariantArgValues<TArgs, T> = T[] | ((args: TArgs) => T[])

import {garbageCollect} from 'src/garbage-collect/garbageCollect'
import {
  AbortControllerFast,
  IAbortSignalFast,
} from '@flemist/abort-controller-fast'
import {IPool, Pool} from '@flemist/time-limits'
import {combineAbortSignals} from '@flemist/async-utils'

export type VariantsArgs<TArgs> = {
  [key in keyof TArgs]: TArgs[key][] | ((args: TArgs) => TArgs[key][])
}

// type VariantsArgsOf<T> =
//   T extends VariantsArgs<infer T> ? T : never

type PromiseOrValue<T> = Promise<T> | T

export type TestVariantsCall<TArgs> = (callParams?: null | TestVariantsCallParams<TArgs>) => PromiseOrValue<number>

export type TestVariantsSetArgs<TArgs> = <TAdditionalArgs>(args: VariantsArgs<{
  [key in (keyof TAdditionalArgs | keyof TArgs)]: key extends keyof TArgs ? TArgs[key]
    : key extends keyof TAdditionalArgs ? TAdditionalArgs[key]
      : never
}>) => {
  variants: TArgs[]
  run: TestVariantsCall<TArgs>
}

export type TestVariantsCallParams<TArgs> = {
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
  onError?: null | ((event: {
    index: number,
    variant: TArgs,
    error: any,
  }) => void)
  abortSignal?: null | IAbortSignalFast,
  parallel?: null | number | boolean,
  /**
   * [inclusive min, inclusive max]
   */
  indexRange?: null | [number | null | undefined, number | null | undefined],
  backward?: null | boolean,
}

function isPromiseLike<T>(value: PromiseOrValue<T>): value is Promise<T> {
  return typeof value === 'object'
    && value
    && typeof (value as any).then === 'function'
}

export function createTestVariants<TArgs extends object>(
  test: (args: TArgs, abortSignal: IAbortSignalFast) => Promise<number|void> | number | void,
): TestVariantsSetArgs<TArgs> {
  return function testVariantsArgs(args) {
    const argsKeys = Object.keys(args)
    const argsValues: any[] = Object.values(args)
    const argsLength = argsKeys.length

    const variantArgs: TArgs = {} as any

    function getArgValues(nArg: number) {
      let argValues = argsValues[nArg]
      if (typeof argValues === 'function') {
        argValues = argValues(variantArgs)
      }
      return argValues
    }

    const indexes: number[] = []
    const values: any[][] = []
    for (let nArg = 0; nArg < argsLength; nArg++) {
      indexes[nArg] = -1
      values[nArg] = []
    }
    values[0] = getArgValues(0)

    function nextVariant() {
      for (let nArg = argsLength - 1; nArg >= 0; nArg--) {
        const index = indexes[nArg] + 1
        if (index < values[nArg].length) {
          indexes[nArg] = index
          variantArgs[argsKeys[nArg]] = values[nArg][index]
          for (nArg++; nArg < argsLength; nArg++) {
            const argValues = getArgValues(nArg)
            if (argValues.length === 0) {
              break
            }
            indexes[nArg] = 0
            values[nArg] = argValues
            variantArgs[argsKeys[nArg]] = argValues[0]
          }
          if (nArg >= argsLength) {
            return true
          }
        }
      }

      return false
    }

    const variants: any[] = []
    while (nextVariant()) {
      variants.push({...variantArgs})
    }

    function testVariantsCall(options: TestVariantsCallParams<TArgs> = {}) {
      const GC_Iterations = options.GC_Iterations ?? 1000000
      const GC_IterationsAsync = options.GC_IterationsAsync ?? 10000
      const GC_Interval = options.GC_Interval ?? 1000
      const logInterval = options.logInterval ?? 5000
      const logCompleted = options.logCompleted ?? true
      const onErrorCallback = options.onError ?? null
      const abortSignalExternal = options.abortSignal ?? null
      const _parallel = options.parallel ?? null
      const backward = options.backward ?? false

      const abortControllerParallel = new AbortControllerFast()
      const abortSignalParallel = combineAbortSignals(abortSignalExternal, abortControllerParallel.signal)
      const abortSignalAll = abortSignalParallel

      let variantArgs: TArgs = {} as any

      // Parse indexRange option
      const variantIndexMin = options.indexRange?.[0] ?? 0
      const variantIndexMax = options.indexRange?.[1] ?? variants.length - 1

      let variantIndex = variantIndexMin - 1
      function nextVariant() {
        variantIndex++
        if (variantIndex > variantIndexMax) {
          return false
        }
        variantArgs = variants[
          backward
            ? variantIndexMax - variantIndex + variantIndexMin
            : variantIndex
        ]
        return true
      }

      let iterations = 0
      let iterationsAsync = 0
      let debug = false
      let debugIteration = 0

      let isNewError: boolean = true

      async function onError(
        error: any,
        variantIndex: number,
        variantArgs: TArgs,
      ) {
        const _isNewError = isNewError
        isNewError = false

        if (_isNewError) {
          abortControllerParallel.abort(error)

          console.error(`error variant: ${
            variantIndex
          }\r\n${
            JSON.stringify(variantArgs, (_, value) => {
              if (value
                && typeof value === 'object'
                && !Array.isArray(value)
                && value.constructor !== Object
              ) {
                return value + ''
              }

              return value
            }, 2)
          }`)
          console.error(error)
        }

        // rerun failed variant 5 times for debug
        const time0 = Date.now()
        // eslint-disable-next-line no-debugger
        debugger
        if (Date.now() - time0 > 50 && debugIteration < 5) {
          console.log('DEBUG ITERATION: ' + debugIteration)
          debug = true
          await next()
          debugIteration++
        }

        if (_isNewError) {
          if (onErrorCallback) {
            onErrorCallback({
              index  : variantIndex,
              variant: variantArgs,
              error,
            })
          }

          throw error
        }
      }

      function onCompleted() {
        if (logCompleted) {
          console.log('variants: ' + iterations)
        }
      }

      let prevLogTime = Date.now()
      let prevGC_Time = prevLogTime
      let prevGC_Iterations = iterations
      let prevGC_IterationsAsync = iterationsAsync

      const parallel = _parallel === true
        ? 2 ** 31
        : !_parallel || _parallel <= 0
          ? 1
          : _parallel

      const pool: IPool = parallel <= 1
        ? null
        : new Pool(parallel)

      async function runTest(
        variantIndex: number,
        variantArgs: TArgs,
        abortSignal: IAbortSignalFast,
      ) {
        try {
          const promiseOrIterations = test(variantArgs, abortSignal)

          if (isPromiseLike(promiseOrIterations)) {
            const value = await promiseOrIterations
            const newIterations = typeof value === 'number' ? value : 1
            iterationsAsync += newIterations
            iterations += newIterations
            return
          }

          iterations += typeof promiseOrIterations === 'number' ? promiseOrIterations : 1
        }
        catch (err) {
          await onError(err, variantIndex, variantArgs)
        }
      }

      async function next(): Promise<number> {
        while (!abortSignalExternal?.aborted && (debug || nextVariant())) {
          const _variantIndex = variantIndex
          const _variantArgs = !pool
            ? variantArgs
            : {...variantArgs}

          const now = (logInterval || GC_Interval) && Date.now()

          if (logInterval && now - prevLogTime >= logInterval) {
            // the log is required to prevent the karma browserNoActivityTimeout
            console.log(iterations)
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
            await runTest(
              _variantIndex,
              _variantArgs,
              abortSignalExternal,
            )
          }
          else {
            if (!pool.hold(1)) {
              await pool.holdWait(1)
            }
            void (async () => {
              try {
                if (abortSignalParallel?.aborted) {
                  return
                }
                await runTest(
                  _variantIndex,
                  _variantArgs,
                  abortSignalParallel,
                )
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

      return next()
    }
    
    return {
      variants,
      run: testVariantsCall,
    }
  }
}
