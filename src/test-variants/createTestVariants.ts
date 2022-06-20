/* eslint-disable @typescript-eslint/no-shadow */

// type Func<This, Args extends any[], Result> = (this: This, ...args: Args) => Result

// type ArrayItem<T> = T extends Array<infer T> ? T : never

// type ArrayOrFuncItem<T> = T extends Array<infer T> ? T
//   : T extends Func<any, any[], infer T> ? ArrayItem<T>
//     : never

// type VariantArgValues<TArgs, T> = T[] | ((args: TArgs) => T[])

type VariantsArgs<TArgs> = {
  [key in keyof TArgs]: TArgs[key][] | ((args: TArgs) => TArgs[key][])
}

// type VariantsArgsOf<T> =
//   T extends VariantsArgs<infer T> ? T : never

type PromiseOrValue<T> = Promise<T> | T

type TestVariantsCall = (callParams?: TestVariantsCallParams) => PromiseOrValue<number>

type TestVariantsSetArgs<TArgs> = <TAdditionalArgs>(args: VariantsArgs<{
  [key in (keyof TAdditionalArgs | keyof TArgs)]: key extends keyof TArgs ? TArgs[key]
    : key extends keyof TAdditionalArgs ? TAdditionalArgs[key]
      : never
}>) => TestVariantsCall

export type TestVariantsCallParams = {
  /** pause test and log iterations count, required to prevent the karma browserNoActivityTimeout */
  pauseInterval?: number,
  pauseTime?: number,
}

export function createTestVariants<TArgs extends object>(
  test: (args: TArgs) => Promise<number|void> | number | void,
): TestVariantsSetArgs<TArgs> {
  return function testVariantsArgs(args) {
    return function testVariantsCall({
      pauseInterval,
      pauseTime = 10,
    }: TestVariantsCallParams = {}) {
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
      let debug = false
      let debugIteration = 0

      function onError(err) {
        console.error(JSON.stringify(variantArgs, null, 2))
        console.error(err)

        // rerun failed variant 5 times for debug
        const time0 = Date.now()
        // eslint-disable-next-line no-debugger
        debugger
        if (Date.now() - time0 > 50 && debugIteration < 5) {
          debug = true
          next(0)
          debugIteration++
        }
        throw err
      }

      function onCompleted() {
        // console.log('variants: ' + iteration)
      }

      let prevLogTime = Date.now()
      function next(value: number) {
        const now = pauseInterval && Date.now()
        if (now) {
          if (now - prevLogTime >= pauseInterval) {
            // the log is required to prevent the karma browserNoActivityTimeout
            console.log(iterations)
            prevLogTime = now
          }
        }

        iterations += typeof value === 'number' ? value : 1
        const syncCallStartTime = now
        while (debug || nextVariant()) {
          try {
            const promiseOrIterations = test(variantArgs)

            if (
              typeof promiseOrIterations === 'object'
              && promiseOrIterations
              && typeof promiseOrIterations.then === 'function'
            ) {
              return promiseOrIterations.then(next).catch(onError)
            }

            if (syncCallStartTime && Date.now() - syncCallStartTime >= pauseInterval) {
              const pausePromise = pauseTime
                ? new Promise(resolve => {
                  setTimeout(() => {
                    resolve(promiseOrIterations)
                  }, pauseTime)
                })
                : Promise.resolve(promiseOrIterations)

              return pausePromise.then(next)
            }

            iterations += typeof promiseOrIterations === 'number' ? promiseOrIterations : 1
          }
          catch (err) {
            onError(err)
          }
        }
        onCompleted()
        return iterations
      }

      return next(0)
    }
  }
}
