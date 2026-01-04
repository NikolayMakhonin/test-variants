import { Random, randomBoolean } from '@flemist/simple-utils'
import {
  ObjectValue,
  StressTestArgs,
  Template,
  TemplateArray,
  TemplateFunc,
  TemplateValue,
  TestArgs,
} from '../types'
import { generateBoundaryInt } from './primitives'
import { getArgKey } from '../caches'

function generateArgValuePrimitive(
  rnd: Random,
  options: StressTestArgs,
): number {
  return generateBoundaryInt(rnd, options.argValueMax)
}

function generateArgValueObject(
  rnd: Random,
  options: StressTestArgs,
): ObjectValue {
  return Object.freeze({ value: generateArgValuePrimitive(rnd, options) })
}

function generateArgValueType(
  rnd: Random,
  options: StressTestArgs,
): 'primitive' | 'object' {
  return options.argValueType ?? (randomBoolean(rnd) ? 'primitive' : 'object')
}

function generateArgValue(rnd: Random, options: StressTestArgs): TemplateValue {
  const valueType = generateArgValueType(rnd, options)
  if (valueType === 'primitive') {
    return generateArgValuePrimitive(rnd, options)
  }
  return generateArgValueObject(rnd, options)
}

function generateArgValuesArray(
  rnd: Random,
  options: StressTestArgs,
): readonly TemplateValue[] {
  const count = generateBoundaryInt(rnd, options.argValuesCountMax)
  const values: TemplateValue[] = []
  for (let i = 0; i < count; i++) {
    values[i] = generateArgValue(rnd, options)
  }
  return Object.freeze(values)
}

function generateArgType(
  rnd: Random,
  options: StressTestArgs,
): 'static' | 'dynamic' {
  return options.argType ?? (randomBoolean(rnd) ? 'static' : 'dynamic')
}

function generateStaticArg(
  rnd: Random,
  options: StressTestArgs,
): TemplateArray {
  return Object.freeze(generateArgValuesArray(rnd, options))
}

function generateDynamicArg(
  rnd: Random,
  options: StressTestArgs,
  prevArgKey: string | null,
): TemplateFunc {
  const baseValues0 = Object.freeze(generateArgValuesArray(rnd, options))
  const baseValues1 = Object.freeze(generateArgValuesArray(rnd, options))
  return function dynamicArg(args: TestArgs): TemplateArray {
    if (prevArgKey == null) {
      return baseValues0
    }
    const prevValue = args[prevArgKey]
    if (prevValue == null) {
      throw new Error(`[dynamicArg] prevValue is null for key ${prevArgKey}`)
    }
    const numValue = typeof prevValue === 'object' ? prevValue.value : prevValue
    return numValue % 2 === 0 ? baseValues0 : baseValues1
  }
}

export function generateTemplate(
  rnd: Random,
  options: StressTestArgs,
): Template {
  const argsCount = generateBoundaryInt(rnd, options.argsCountMax)
  const template: Template = {}
  let prevKey: string | null = null
  for (let i = 0; i < argsCount; i++) {
    const key = getArgKey(i)
    const argType = generateArgType(rnd, options)
    if (argType === 'static') {
      template[key] = generateStaticArg(rnd, options)
    } else {
      template[key] = generateDynamicArg(rnd, options, prevKey)
    }
    prevKey = key
  }
  return Object.freeze(template)
}
