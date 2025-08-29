import {Obj} from 'src/test-variants/types'

export type TestVariantsTemplate<Args extends Obj, Value> = Value[] | ((args: Args) => Value[])

export type TestVariantsTemplates<Args extends Obj> = {
  [key in keyof Args]: TestVariantsTemplate<Args, Args[key]>
}

export type TestVariantsTemplatesExt<Args extends Obj, AdditionalArgs extends Obj> =
  TestVariantsTemplates<{
    [key in (keyof AdditionalArgs | keyof Args)]: key extends keyof Args ? Args[key]
      : key extends keyof AdditionalArgs ? AdditionalArgs[key]
        : never
  }>

export function testVariantsIterable<Args extends Obj, AdditionalArgs extends Obj>(
  argsTemplates: TestVariantsTemplatesExt<Args, AdditionalArgs>,
): Iterable<Args> {
  return {
    [Symbol.iterator]() {
      const keys = Object.keys(argsTemplates) as (keyof Args)[]
      const templates: TestVariantsTemplate<Args, any>[] = Object.values(argsTemplates)
      const keysCount = keys.length

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
            indexes[keyIndex] = valueIndex
            args[keys[keyIndex]] = variants[keyIndex][valueIndex]
            for (keyIndex++; keyIndex < keysCount; keyIndex++) {
              const keyVariants = calcVariants(keyIndex)
              if (keyVariants.length === 0) {
                break
              }
              indexes[keyIndex] = 0
              variants[keyIndex] = keyVariants
              args[keys[keyIndex]] = keyVariants[0]
            }
            if (keyIndex >= keysCount) {
              return true
            }
          }
        }

        return false
      }

      return {
        next() {
          if (nextVariant()) {
            return {done: false, value: args}
          }

          return {done: true, value: null}
        },
      }
    },
  }
}
