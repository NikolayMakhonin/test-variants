import type { LimitArgOnError } from 'src/common'
import {
  TestVariantsTemplates,
  VariantNavigationState,
} from 'src/common/test-variants/iterator/types'
import {
  advanceVariantNavigation,
  createVariantNavigationState,
} from 'src/common/test-variants/iterator/variant-navigation/variantNavigation'
import { parseExtraCounts } from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/parse'
import { formatIndexes } from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/format'

export type ComplexArgs = {
  a: number
  b: number
  c: number
  d: number
}
// Complex template with irregular tree structure (20 valid combinations)
// a=0: b=[0,1]
//   b=0: c=[0,1,2]
//     c=0: d=[0,1,2] (3)
//     c=1: d=[0] (1)
//     c=2: d=[0,1] (2)
//   b=1: c=[0]
//     c=0: d=[0] (1)
// a=1: b=[0,1,2]
//   b=0: c=[0,1]
//     c=0: d=[0,1,2] (3)
//     c=1: d=[0] (1)
//   b=1: c=[0,1]
//     c=0: d=[0] (1)
//     c=1: d=[0,1] (2)
//   b=2: c=[] (dead end)
// a=2: b=[0]
//   b=0: c=[0,1,2,3]
//     c=0: d=[0,1,2] (3)
//     c=1: d=[0] (1)
//     c=2: d=[0,1] (2)
//     c=3: d=[] (dead end)
// a=3: b=[] (dead end)
// Total: 6 + 1 + 4 + 3 + 6 = 20 combinations
function createComplexTemplates(
  extraPattern: string,
): TestVariantsTemplates<ComplexArgs> {
  const extraA = parseExtraCounts(extraPattern, 0)
  const extraB = parseExtraCounts(extraPattern, 1)
  const extraC = parseExtraCounts(extraPattern, 2)
  const extraD = parseExtraCounts(extraPattern, 3)

  return {
    a: [0, 1, 2, 3, ...extraA],
    b: ({ a }) => {
      let values: number[]
      if (a === 0) values = [0, 1]
      else if (a === 1) values = [0, 1, 2]
      else if (a === 2) values = [0]
      else values = []
      return [...values, ...extraB]
    },
    c: ({ a, b }) => {
      let values: number[]
      if (a === 0) values = b === 0 ? [0, 1, 2] : [0]
      else if (a === 1) values = b === 2 ? [] : [0, 1]
      else if (a === 2) values = [0, 1, 2, 3]
      else values = []
      return [...values, ...extraC]
    },
    d: ({ b, c }) => {
      const sum = (b ?? 0) + (c ?? 0)
      let values: number[]
      if (sum === 0) values = [0, 1, 2]
      else if (sum === 1) values = [0]
      else if (sum === 2) values = [0, 1]
      else if (sum === 3) values = []
      else values = [0]
      return [...values, ...extraD]
    },
  }
}

export function createComplexState(
  extraPattern: string,
  limitArgOnError: null | boolean | LimitArgOnError,
  includeErrorVariant: boolean,
): VariantNavigationState<ComplexArgs> {
  const templates = createComplexTemplates(extraPattern)
  const state = createVariantNavigationState<ComplexArgs, ComplexArgs>(
    { templates, extra: {} },
    null,
    limitArgOnError,
    includeErrorVariant,
  )
  return state
}

// Collect all valid variants for given extraPattern
export function collectAllVariants(extraPattern: string): string[] {
  const state = createComplexState(extraPattern, null, false)
  const variants: string[] = []
  while (advanceVariantNavigation(state)) {
    variants.push(formatIndexes(state.indexes))
  }
  return variants
}

export const funcTrue = () => true
export const funcFalse = () => false
