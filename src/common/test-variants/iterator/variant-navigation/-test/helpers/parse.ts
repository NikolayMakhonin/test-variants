import { Ref } from '@flemist/simple-utils'
import {
  TestVariantsTemplates,
  TestVariantsTemplatesExtra,
} from 'src/common/test-variants/iterator/types'
import { getArgName } from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/caches'

export function parseIndexes(numberPattern: string): number[] {
  const result: number[] = []
  for (let i = 0; i < numberPattern.length; i++) {
    const ch = numberPattern[i]
    const value = ch === '-' || ch === '_' ? -1 : Number(ch)
    result.push(value)
  }
  return result
}

export function parseLimits(numberPattern: string): (number | null)[] {
  const result: (number | null)[] = []
  for (let i = 0; i < numberPattern.length; i++) {
    const ch = numberPattern[i]
    const value = ch === '_' ? null : Number(ch)
    result.push(value)
  }
  return result
}

function parseValues(valuePattern: string): Ref<number>[] {
  if (valuePattern === '_') {
    return void 0 as any
  }
  const values: Ref<number>[] = []
  const max = valuePattern === '-' ? -1 : Number(valuePattern)
  for (let value = 0; value <= max; value++) {
    values.push({ value })
  }
  return values
}

// args as digits string: '012' => arg1=[], arg2=[0,1], arg3=[0,1,2]
export function parseTemplates(
  argsPattern: string,
  valuesAsFuncs: boolean,
): TestVariantsTemplates<any> {
  const templates: TestVariantsTemplates<any> = {}
  for (let i = 0; i < argsPattern.length; i++) {
    const argName = getArgName(i)
    const value = parseValues(argsPattern[i])
    templates[argName] = valuesAsFuncs ? value.map(o => () => o) : value
  }
  return templates
}

export function parseTemplatesValues(argsPattern: string): Ref<number>[][] {
  const values: Ref<number>[][] = []
  for (let i = 0; i < argsPattern.length; i++) {
    values.push(parseValues(argsPattern[i]))
  }
  return values
}

export function parseTemplatesExtra(
  extraPattern: string,
): TestVariantsTemplatesExtra<any> {
  const templatesExtra: TestVariantsTemplatesExtra<any> = {}
  for (let i = 0; i < extraPattern.length; i++) {
    const argName = getArgName(i)
    const count = Number(extraPattern[i])
    templatesExtra[argName] = []
    for (let j = 0; j < count; j++) {
      templatesExtra[argName].push({ value: 1000 + j })
    }
  }
  return templatesExtra
}

export function parseExtraCounts(
  extraPattern: string,
  argIndex: number,
): number[] {
  const count = Number(extraPattern[argIndex] || 0)
  const result: number[] = []
  for (let i = 0; i < count; i++) {
    result.push(1000 + i)
  }
  return result
}
