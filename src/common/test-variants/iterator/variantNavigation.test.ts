import { describe, it, assert } from 'vitest'
import {
  TestVariantsTemplates,
  TestVariantsTemplatesExtra,
  VariantNavigationState,
} from 'src/common/test-variants/iterator/types'
import { deepEqualJsonLike, Ref } from '@flemist/simple-utils'
import {
  advanceVariantNavigation,
  createVariantNavigationState,
  resetVariantNavigation,
  retreatVariantNavigation,
} from 'src/common/test-variants/iterator/variantNavigation'
import type { LimitArgOnError } from 'src/common'
import { deepFreezeJsonLike } from 'src/common/test-variants/-tmp/-test/helpers/deepFreezeJsonLike'

const shuffledString = '9081726354'
const argNamesMap = new Map<number, string>()
function getArgName(argIndex: number): string {
  let argName = argNamesMap.get(argIndex)
  if (!argName) {
    argName = `arg_${shuffledString[argIndex % shuffledString.length]}_${argIndex + 1}`
    argNamesMap.set(argIndex, argName)
  }
  return argName
}

function parseIndexes(numberPattern: string): number[] {
  const result: number[] = []
  for (let i = 0; i < numberPattern.length; i++) {
    const ch = numberPattern[i]
    const value = ch === '-' || ch === '_' ? -1 : Number(ch)
    result.push(value)
  }
  return result
}

function parseLimits(numberPattern: string): (number | null)[] {
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
function parseTemplates(argsPattern: string): TestVariantsTemplates<any> {
  const templates: TestVariantsTemplates<any> = {}
  for (let i = 0; i < argsPattern.length; i++) {
    const argName = getArgName(i)
    templates[argName] = parseValues(argsPattern[i])
  }
  return templates
}

function parseTemplatesValues(argsPattern: string): Ref<number>[][] {
  const values: Ref<number>[][] = []
  for (let i = 0; i < argsPattern.length; i++) {
    values.push(parseValues(argsPattern[i]))
  }
  return values
}

function parseTemplatesExtra(
  extraPatterns: string[],
): TestVariantsTemplatesExtra<any> {
  const templatesExtra: TestVariantsTemplatesExtra<any> = {}
  for (let i = 0; i < extraPatterns.length; i++) {
    const extraPattern = extraPatterns[i]
    for (let j = 0; j < extraPattern.length; j++) {
      const argName = getArgName(j)
      if (!templatesExtra[argName]) {
        templatesExtra[argName] = []
      }
      const value = Number(extraPattern[j])
      templatesExtra[argName].push({ value })
    }
  }
  return templatesExtra
}

function createArgs(
  indexes: number[],
  templates: TestVariantsTemplates<any>,
): any {
  const args: any = {}
  for (let i = 0; i < indexes.length; i++) {
    const argName = getArgName(i)
    const values = templates[argName] as Ref<number>[]
    const valueIndex = indexes[i]
    args[argName] =
      valueIndex >= 0 && valueIndex < values.length
        ? values[valueIndex]
        : undefined
  }
  return args
}

function _createVariantNavigationState(
  argsPattern: string,
  extraPatterns: string[] = [],
  limitArgOnError: null | boolean | LimitArgOnError,
): VariantNavigationState<any> {
  const templates = parseTemplates(argsPattern)
  const templatesExtra = parseTemplatesExtra(extraPatterns)
  deepFreezeJsonLike(templates)
  deepFreezeJsonLike(templatesExtra)
  const state = createVariantNavigationState(
    templates,
    deepEqualJsonLike,
    limitArgOnError,
  )
  state.templates.extra = templatesExtra
  Object.freeze(state)
  Object.freeze(state.templates)
  Object.freeze(state.templates.templates)
  Object.freeze(state.argsNames)
  assert.deepStrictEqual(
    state.argsNames,
    Object.keys(templates),
    'state.argsNames',
  )
  assert.deepStrictEqual(
    state.indexes,
    Array.from({ length: argsPattern.length }, () => -1),
    'state.indexes',
  )
  assert.deepStrictEqual(
    state.args,
    createArgs(state.indexes, templates),
    'state.args',
  )
  assert.deepStrictEqual(
    state.argValues,
    Array.from({ length: argsPattern.length }, () => void 0 as any),
    'state.argValues',
  )
  assert.deepStrictEqual(
    state.argLimits,
    Array.from({ length: argsPattern.length }, () => null),
    'state.argLimits',
  )
  assert.strictEqual(state.attemptIndex, 0, 'state.attemptIndex')
  assert.deepStrictEqual(
    state.templates,
    {
      templates,
      extra: {},
    },
    'state.templates',
  )
  assert.strictEqual(
    state.limitArgOnError,
    limitArgOnError,
    'state.limitArgOnError',
  )
  assert.strictEqual(state.equals, deepEqualJsonLike, 'state.equals')
  return state
}

function checkVariantNavigationState(
  state: VariantNavigationState<any>,
  valuesPattern: string,
  indexesPattern: string,
  limitPattern: string,
): void {
  const expectedIndexes = parseIndexes(indexesPattern)
  assert.deepStrictEqual(state.indexes, expectedIndexes, 'state.indexes')

  const expectedArgs = createArgs(expectedIndexes, state.templates.templates)
  assert.deepStrictEqual(state.args, expectedArgs, 'state.args')

  const expectedValues = parseTemplatesValues(valuesPattern)
  assert.deepStrictEqual(state.argValues, expectedValues, 'state.argValues')

  const expectedLimits = parseLimits(limitPattern)

  assert.deepStrictEqual(state.argLimits, expectedLimits, 'state.argLimits')
}

describe('advanceVariantNavigation', () => {
  it('empty', () => {
    const state = _createVariantNavigationState('', [], null)
    checkVariantNavigationState(state, '', '', '')
    assert.isFalse(advanceVariantNavigation(state))
    checkVariantNavigationState(state, '', '', '')
  })

  it('1 arg, 1 value', () => {
    const state = _createVariantNavigationState('0', [], null)
    for (let i = 0; i < 2; i++) {
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 3 values', () => {
    const state = _createVariantNavigationState('2', [], null)
    for (let i = 0; i < 2; i++) {
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '2', '0', '_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '2', '1', '_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '2', '2', '_')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '2', '2', '_')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '2', '2', '_')
      resetVariantNavigation(state)
    }
  })

  it('2 arg, 2 values', () => {
    const state = _createVariantNavigationState('11', [], null)
    for (let i = 0; i < 2; i++) {
      checkVariantNavigationState(state, '__', '__', '__')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '__')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '01', '__')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '10', '__')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '11', '__')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '11', '__')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '11', '__')
      resetVariantNavigation(state)
    }
  })
})
