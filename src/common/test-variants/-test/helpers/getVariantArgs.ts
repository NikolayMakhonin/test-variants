import type { Template, TestArgs } from 'src/common/test-variants/-test/types'
import { forEachVariant } from 'src/common/test-variants/-test/helpers/forEachVariant'

export type Variant = {
  index: number
  args: TestArgs
}

export type Variants = {
  first: null | Variant
  middle: null | Variant
  last: null | Variant
  error: null | Variant
}

export function getVariantArgs(
  template: Template,
  argKeys: string[],
  variantsCount: number,
  errorIndex: number | null,
): Variants {
  const middleIndex = Math.floor(variantsCount / 2)
  let firstArgs: TestArgs | null = null
  let middleArgs: TestArgs | null = null
  let lastArgs: TestArgs | null = null as any
  let errorArgs: TestArgs | null = null

  forEachVariant(template, argKeys, (args, index) => {
    if (firstArgs === null) {
      firstArgs = Object.freeze({ ...args })
    }
    if (index === middleIndex) {
      middleArgs = Object.freeze({ ...args })
    }
    if (errorIndex != null && index === errorIndex) {
      errorArgs = Object.freeze({ ...args })
    }
    // TODO: подумать как оптимизировать, как сделать так чтобы итератор
    // не обнулял свойства последнего элемента
    lastArgs = { ...args }
  })

  return Object.freeze({
    first: firstArgs ? { index: 0, args: firstArgs } : null,
    middle: middleArgs ? { index: middleIndex, args: middleArgs } : null,
    last: lastArgs
      ? { index: variantsCount - 1, args: Object.freeze({ ...lastArgs }) }
      : null,
    error: errorArgs ? { index: errorIndex!, args: errorArgs } : null,
  })
}
