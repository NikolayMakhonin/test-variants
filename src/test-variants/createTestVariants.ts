/* eslint-disable @typescript-eslint/no-shadow */

// type Func<This, Args extends any[], Result> = (this: This, ...args: Args) => Result

// type ArrayItem<T> = T extends Array<infer T> ? T : never

// type ArrayOrFuncItem<T> = T extends Array<infer T> ? T
//   : T extends Func<any, any[], infer T> ? ArrayItem<T>
//     : never

// type VariantArgValues<TArgs, T> = T[] | ((args: TArgs) => T[])

import {garbageCollect} from 'src/garbage-collect/garbageCollect'
import {IAbortSignalFast} from '@flemist/abort-controller-fast'

type VariantsArgs<TArgs> = {
  [key in keyof TArgs]: TArgs[key][] | ((args: TArgs) => TArgs[key][])
}

// type VariantsArgsOf<T> =
//   T extends VariantsArgs<infer T> ? T : never

type PromiseOrValue<T> = Promise<T> | T

type TestVariantsCall<TArgs> = (callParams?: TestVariantsCallParams<TArgs>) => PromiseOrValue<number>

type TestVariantsSetArgs<TArgs> = <TAdditionalArgs>(args: VariantsArgs<{
  [key in (keyof TAdditionalArgs | keyof TArgs)]: key extends keyof TArgs ? TArgs[key]
    : key extends keyof TAdditionalArgs ? TAdditionalArgs[key]
      : never
}>) => TestVariantsCall<TArgs>

export type TestVariantsCallParams<TArgs> = {
  /** Wait for garbage collection after iterations */
  GC_Iterations?: number,
  /** Same as GC_Iterations but only for async test variants, required for 10000 and more of Promise rejections */
  GC_IterationsAsync?: number,
  /** Wait for garbage collection after time interval, required to prevent the karma browserDisconnectTimeout */
  GC_Interval?: number,
  /** console log current iterations, required to prevent the karma browserNoActivityTimeout */
  logInterval?: number,
  /** console log iterations on test completed */
  logCompleted?: boolean,
  onError?: (event: {
    iteration: number,
    variant: TArgs,
    error: any,
  }) => void
  abortSignal?: IAbortSignalFast,
}

export function createTestVariants<TArgs extends object>(
  test: (args: TArgs) => Promise<number|void> | number | void,
): TestVariantsSetArgs<TArgs> {
  return function testVariantsArgs(args) {
    return function testVariantsCall({
      GC_Iterations = 1000000,
      GC_IterationsAsync = 10000,
      GC_Interval = 1000,
      logInterval = 5000,
      logCompleted = true,
      onError: onErrorCallback = null,
      abortSignal,
    }: TestVariantsCallParams<TArgs> = {}) {
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

      let iterations = 0
      let iterationsAsync = 0
      let debug = false
      let debugIteration = 0

      async function onError(error) {
        console.error(`error variant: ${
          iterations
        }\r\n${
          JSON.stringify(variantArgs, null, 2)
        }`)
        console.error(error)

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

        if (onErrorCallback) {
          onErrorCallback({
            iteration: iterations,
            variant  : variantArgs,
            error,
          })
        }

        throw error
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
      async function next(): Promise<number> {
        try {
          while (!abortSignal?.aborted && (debug || nextVariant())) {
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
              continue
            }

            const promiseOrIterations = test(variantArgs)

            if (
              typeof promiseOrIterations === 'object'
              && promiseOrIterations
              && typeof promiseOrIterations.then === 'function'
            ) {
              const value = await promiseOrIterations
              const newIterations = typeof value === 'number' ? value : 1
              iterationsAsync += newIterations
              iterations += newIterations
              continue
            }

            iterations += typeof promiseOrIterations === 'number' ? promiseOrIterations : 1
          }
        }
        catch (err) {
          await onError(err)
        }

        if (abortSignal?.aborted) {
          throw abortSignal.reason
        }

        onCompleted()
        await garbageCollect(1)

        return iterations
      }

      return next()
    }
  }
}
