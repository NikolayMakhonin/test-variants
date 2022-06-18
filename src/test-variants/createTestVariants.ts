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

type TestVariantsFunc<TArgs, TResult> = <TAdditionalArgs>(args: VariantsArgs<{
  [key in (keyof TAdditionalArgs | keyof TArgs)]: key extends keyof TArgs ? TArgs[key]
    : key extends keyof TAdditionalArgs ? TAdditionalArgs[key]
      : never
}>) => TResult

export type TestVariantsFuncSync<TArgs> = TestVariantsFunc<TArgs, number>
export type TestVariantsFuncAsync<TArgs> = TestVariantsFunc<TArgs, Promise<number> | number>

function _createTestVariants<TArgs extends object>(
  test: (args: TArgs) => Promise<number|void> | number | void,
  sync: false,
): TestVariantsFuncAsync<TArgs>
function _createTestVariants<TArgs extends object>(
  test: (args: TArgs) => Promise<number|void> | number | void,
  sync: true,
): TestVariantsFuncSync<TArgs>
function _createTestVariants<TArgs extends object>(
  test: (args: TArgs) => Promise<number|void> | number | void,
  sync: boolean,
): TestVariantsFuncAsync<TArgs> {
  return function _testVariants(args) {
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

    function next(value: number) {
      iterations += typeof value === 'number' ? value : 1
      while (debug || nextVariant()) {
        try {
          const promise = test(variantArgs)
          if (typeof promise === 'object' && promise && typeof promise.then === 'function') {
            if (sync) {
              onError(new Error('Unexpected Promise result for sync test function'))
            }
            return promise.then(next).catch(onError)
          } else {
            iterations += typeof promise === 'number' ? promise : 1
          }
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

export function createTestVariantsSync<TArgs extends object>(
  test: (args: TArgs) => void,
) {
  return _createTestVariants(test, true)
}

export function createTestVariants<TArgs extends object>(
  test: (args: TArgs) => Promise<void> | void,
) {
  return _createTestVariants(test, false)
}
