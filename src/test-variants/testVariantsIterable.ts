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
  argsMaxIndexes?: null | { [key in keyof Args]?: null | number }
  argsMaxIndexesExclusive?: null | boolean
}

export type TestVariantsIterableItem<Args extends Obj> = {
  args: Args,
  indexes: { [key in keyof Args]: number }
}

export function testVariantsIterable<
  Args extends Obj,
  ArgsExtra extends Obj,
>({
  argsTemplates,
  argsMaxIndexes,
  argsMaxIndexesExclusive,
}: TestVariantsIterableOptions<Args, ArgsExtra>): Iterable<TestVariantsIterableItem<Args>> {
  return {
    [Symbol.iterator]() {
      const keys = Object.keys(argsTemplates) as (keyof Args)[]
      const templates: TestVariantsTemplate<Args, any>[] = Object.values(argsTemplates)
      const keysCount = keys.length
      const keysMax = argsMaxIndexes ? Object.keys(argsMaxIndexes) as (keyof Args)[] : null
      const keysMaxCount = keysMax ? keysMax.length : 0

      const args: Args = {} as any
      const argsIndexes: { [key in keyof Args]: number } = {} as any

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
              if (
                argsMaxIndexes
                && key in argsMaxIndexes
                && argsMaxIndexes[key] === valueIndex - 1
              ) {
                continue
              }
            }
            indexes[keyIndex] = valueIndex
            args[key] = value
            argsIndexes[key] = valueIndex
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
              argsIndexes[key] = 0
            }
            if (keyIndex >= keysCount) {
              return true
            }
          }
        }

        return false
      }

      function isMax() {
        if (!argsMaxIndexesExclusive || !argsMaxIndexes) {
          return false
        }
        for (let nKey = 0; nKey < keysMaxCount; nKey++) {
          const key = keysMax[nKey]
          if (argsIndexes[key] !== argsMaxIndexes[key]) {
            return false
          }
        }
        return true
      }

      return {
        next() {
          while (nextVariant()) {
            if (isMax()) {
              continue
            }
            return {
              done : false,
              value: {
                args   : {...args},
                indexes: {...argsIndexes},
              },
            }
          }

          return {done: true, value: null}
        },
      }
    },
  }
}
