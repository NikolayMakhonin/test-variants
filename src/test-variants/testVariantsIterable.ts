import {Obj} from 'src/test-variants/types'

export type TestVariantsTemplate<Args extends Obj, Value> = Value[] | ((args: Args) => Value[])

export type TestVariantsTemplates<Args extends Obj> = {
  [key in keyof Args]: TestVariantsTemplate<Args, Args[key]>
}

export type TestVariantsTemplatesExt<Args extends Obj, ArgsExtra extends Obj> =
  TestVariantsTemplates<{
    [key in (keyof ArgsExtra | keyof Args)]: key extends keyof Args ? Args[key]
      : key extends keyof ArgsExtra ? ArgsExtra[key]
        : never
  }>

export type TestVariantsIterableOptions<Args extends Obj, ArgsExtra extends Obj> = {
  argsTemplates: TestVariantsTemplatesExt<Args, ArgsExtra>
  /** Max values for each argument, null - no limit */
  argsMaxValues?: null | Args
  argsMaxValuesExclusive?: null | boolean
}

export function testVariantsIterable<
  Args extends Obj,
  ArgsExtra extends Obj,
>({
  argsTemplates,
  argsMaxValues,
  argsMaxValuesExclusive,
}: TestVariantsIterableOptions<Args, ArgsExtra>): Iterable<Args> {
  return {
    [Symbol.iterator]() {
      const keys = Object.keys(argsTemplates) as (keyof Args)[]
      const templates: TestVariantsTemplate<Args, any>[] = Object.values(argsTemplates)
      const keysCount = keys.length
      const keysMax = argsMaxValues ? Object.keys(argsMaxValues) as (keyof Args)[] : null
      const keysMaxCount = keysMax ? keysMax.length : 0

      const args: Args = {} as any

      function calcVariants(keyIndex: number) {
        let template = templates[keyIndex]
        if (typeof template === 'function') {
          template = template(args)
        }
        return template
      }

      const indexes: number[] = []
      const variants: any[][] = []
      for (let nArg = 0; nArg < keysCount; nArg++) {
        indexes[nArg] = -1
        variants[nArg] = []
      }
      variants[0] = calcVariants(0)

      function nextVariant() {
        for (let keyIndex = keysCount - 1; keyIndex >= 0; keyIndex--) {
          const valueIndex = indexes[keyIndex] + 1
          if (valueIndex < variants[keyIndex].length) {
            const key = keys[keyIndex]
            const value = variants[keyIndex][valueIndex]
            if (valueIndex > 0) {
              const valuePrev = variants[keyIndex][valueIndex - 1]
              if (argsMaxValues && key in argsMaxValues && argsMaxValues[key] === valuePrev) {
                continue
              }
            }
            indexes[keyIndex] = valueIndex
            args[key] = value
            for (keyIndex++; keyIndex < keysCount; keyIndex++) {
              const keyVariants = calcVariants(keyIndex)
              if (keyVariants.length === 0) {
                break
              }
              indexes[keyIndex] = 0
              variants[keyIndex] = keyVariants
              const key = keys[keyIndex]
              const value = keyVariants[0]
              args[key] = value
            }
            if (keyIndex >= keysCount) {
              return true
            }
          }
        }

        return false
      }

      function isMax() {
        if (!argsMaxValues) {
          return false
        }
        for (let nKey = 0; nKey < keysMaxCount; nKey++) {
          const key = keysMax[nKey]
          if (args[key] !== argsMaxValues[key]) {
            return false
          }
        }
        return true
      }

      return {
        next() {
          while (nextVariant()) {
            if (argsMaxValuesExclusive && isMax()) {
              continue
            }
            return {done: false, value: args}
          }

          return {done: true, value: null}
        },
      }
    },
  }
}
