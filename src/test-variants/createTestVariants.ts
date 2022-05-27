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
  test: (args: TArgs) => Promise<void> | void,
  sync: false,
): TestVariantsFuncAsync<TArgs>
function _createTestVariants<TArgs extends object>(
  test: (args: TArgs) => Promise<void> | void,
  sync: true,
): TestVariantsFuncSync<TArgs>
function _createTestVariants<TArgs extends object>(
  test: (args: TArgs) => Promise<void> | void,
  sync: boolean,
): TestVariantsFuncAsync<TArgs> {
  return function _testVariants(args) {
    const argsKeys = Object.keys(args)
    const argsValues = Object.values(args)
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

    let iteration = 0

    function onError(err) {
      console.error(JSON.stringify(variantArgs, null, 2))
      console.error(err)

      // rerun failed variant 5 times for debug
      const time0 = Date.now()
      // eslint-disable-next-line no-debugger
      debugger
      if (Date.now() - time0 > 5) {
        for (let i = 0; i < 5; i++) {
          try {
            test(variantArgs)
          }
          catch {
            // eslint-disable-next-line no-debugger
            debugger
          }
        }
      }
      throw err
    }

    function onCompleted() {
      // console.log('variants: ' + iteration)
    }

    const next = function next() {
      while (nextVariant()) {
        try {
          iteration++
          const promise = test(variantArgs)
          if (promise && typeof promise.then === 'function') {
            if (sync) {
              onError(new Error('Unexpected Promise result for sync test function'))
            }
            return promise.then(next).catch(onError)
          }
        }
        catch (err) {
          onError(err)
        }
      }
      onCompleted()
      return iteration
    }

    return next()
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
