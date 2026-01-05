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
  randomVariantNavigation,
  resetVariantNavigation,
  retreatVariantNavigation,
} from 'src/common/test-variants/iterator/variantNavigation'
import type { LimitArgOnError } from 'src/common'
import { deepFreezeJsonLike } from 'src/common/test-variants/-tmp/-test/helpers/deepFreezeJsonLike'
import { freezeProps } from 'src/common/-test/freezeProps'
import { createTestVariants } from '@flemist/test-variants'

// region helpers

// region naming

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

// endregion

// region parse

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
function parseTemplates(
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

function parseTemplatesValues(argsPattern: string): Ref<number>[][] {
  const values: Ref<number>[][] = []
  for (let i = 0; i < argsPattern.length; i++) {
    values.push(parseValues(argsPattern[i]))
  }
  return values
}

function parseTemplatesExtra(
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

// endregion

// region format

function formatIndex(index: number): string {
  return index === -1 ? '_' : String(index)
}

function formatIndexes(indexes: number[]): string {
  return indexes.map(formatIndex).join('')
}

function formatLimit(limit: number | null): string {
  return limit === null ? '_' : String(limit)
}

function formatLimits(limits: (number | null)[]): string {
  return limits.map(formatLimit).join('')
}

function formatValues(values: readonly Ref<number>[]): string {
  if (values === undefined) {
    return '_'
  }
  const max = values.length - 1
  return max < 0 ? '-' : String(max)
}

function formatTemplatesValues(argValues: (readonly Ref<number>[])[]): string {
  return argValues.map(formatValues).join('')
}

function formatState(state: VariantNavigationState<any>): string {
  return `${formatTemplatesValues(state.argValues as any)}|${formatIndexes(
    state.indexes,
  )}|${formatLimits(state.argLimits)}`
}

// endregion

// region create

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
  extraPattern: string,
  limitPattern: string,
  valuesAsFuncs?: boolean,
): VariantNavigationState<any> {
  const templates = parseTemplates(argsPattern, valuesAsFuncs ?? false)
  const templatesExtra = parseTemplatesExtra(extraPattern)
  deepFreezeJsonLike(templates)
  deepFreezeJsonLike(templatesExtra)
  const state = createVariantNavigationState(
    templates,
    deepEqualJsonLike,
    null,
    false,
  )
  state.templates.extra = templatesExtra
  const argLimits = parseLimits(limitPattern)
  assert.deepStrictEqual(
    state.argLimits,
    Array.from({ length: argsPattern.length }, () => null),
    'state.argLimits',
  )
  state.argLimits = argLimits
  freezeProps(
    state,
    'args',
    'argsNames',
    'indexes',
    'argValues',
    'templates',
    'equals',
  )
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
  assert.strictEqual(state.attemptIndex, 0, 'state.attemptIndex')
  assert.deepStrictEqual(
    state.templates,
    {
      templates,
      extra: templatesExtra,
    },
    'state.templates',
  )
  assert.strictEqual(state.limitArgOnError, null, 'state.limitArgOnError')
  assert.strictEqual(state.equals, deepEqualJsonLike, 'state.equals')
  return state
}

// endregion

// region check

function checkVariantNavigationState(
  state: VariantNavigationState<any>,
  valuesPattern: string,
  indexesPattern: string | null,
  limitPattern: string,
): void {
  if (indexesPattern != null) {
    const expectedIndexes = parseIndexes(indexesPattern)
    assert.deepStrictEqual(
      formatIndexes(state.indexes),
      indexesPattern,
      'state.indexes format',
    )
    assert.deepStrictEqual(state.indexes, expectedIndexes, 'state.indexes')
  }

  const expectedArgs = createArgs(state.indexes, state.templates.templates)
  assert.deepStrictEqual(state.args, expectedArgs, 'state.args')

  const expectedValues = parseTemplatesValues(valuesPattern)
  assert.deepStrictEqual(
    formatTemplatesValues(state.argValues),
    valuesPattern,
    'state.argValues format',
  )
  assert.deepStrictEqual(state.argValues, expectedValues, 'state.argValues')

  const expectedLimits = parseLimits(limitPattern)
  assert.deepStrictEqual(
    formatLimits(state.argLimits),
    limitPattern,
    'state.argLimits format',
  )
  assert.deepStrictEqual(state.argLimits, expectedLimits, 'state.argLimits')
}

// endregion

// endregion

describe('advanceVariantNavigation', () => {
  it('empty', () => {
    const state = _createVariantNavigationState('', '', '')
    checkVariantNavigationState(state, '', '', '')
    assert.isFalse(advanceVariantNavigation(state))
    checkVariantNavigationState(state, '', '', '')
  })

  it('1 arg, 1 value', () => {
    const state = _createVariantNavigationState('0', '', '_')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '_')
      state.argLimits[0] = 0
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      state.argLimits[0] = null
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      state.argLimits[0] = 0
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      state.argLimits[0] = null
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 3 values', () => {
    const state = _createVariantNavigationState('2', '', '_')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '2', '0', '_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '2', '1', '_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '2', '2', '_')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '2', '0', '_')
      resetVariantNavigation(state)
    }
  })

  it('2 arg, 2 values', () => {
    const state = _createVariantNavigationState('11', '', '__')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '__', '__', '__')
      state.argLimits[1] = 0
      state.limitArgOnError = true
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '_0')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '10', '_0')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '_0')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '_0')
      state.argLimits[0] = 0
      resetVariantNavigation(state)
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '00')
      state.argLimits[0] = null
      state.argLimits[1] = null
      state.limitArgOnError = null
      checkVariantNavigationState(state, '__', '__', '__')

      state.argLimits[0] = 0
      state.limitArgOnError = true
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '0_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '01', '0_')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '0_')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '0_')
      state.argLimits[1] = 0
      resetVariantNavigation(state)
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '00')
      state.argLimits[0] = null
      state.argLimits[1] = null
      state.limitArgOnError = null
      checkVariantNavigationState(state, '__', '__', '__')

      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '__')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '01', '__')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '10', '__')

      state.argLimits[0] = 0
      state.argLimits[1] = 1
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '01')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '01')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '01')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '01')
      state.argLimits[0] = null
      state.argLimits[1] = null
      resetVariantNavigation(state)
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
      checkVariantNavigationState(state, '__', '__', '__')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '__')
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 1 value, limit 0', () => {
    const state = _createVariantNavigationState('0', '', '0')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 2 values, limit 0', () => {
    const state = _createVariantNavigationState('1', '', '0')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      resetVariantNavigation(state)
    }
  })
})

describe('retreatVariantNavigation', () => {
  it('empty', () => {
    const state = _createVariantNavigationState('', [], '')
    checkVariantNavigationState(state, '', '', '')
    assert.isFalse(retreatVariantNavigation(state))
    checkVariantNavigationState(state, '', '', '')
  })

  it('1 arg, 1 value', () => {
    const state = _createVariantNavigationState('0', '', '_')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '_')
      state.argLimits[0] = 0
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      state.argLimits[0] = null
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      state.argLimits[0] = 0
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      state.argLimits[0] = null
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 3 values', () => {
    const state = _createVariantNavigationState('2', '', '_')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '2', '2', '_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '2', '1', '_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '2', '0', '_')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '2', '2', '_')
      resetVariantNavigation(state)
    }
  })

  it('2 arg, 2 values', () => {
    const state = _createVariantNavigationState('11', '', '__')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '__', '__', '__')
      state.argLimits[1] = 0
      state.limitArgOnError = true
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '10', '_0')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '_0')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '_0')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '10', '_0')
      state.argLimits[0] = 0
      resetVariantNavigation(state)
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '00')
      state.argLimits[0] = null
      state.argLimits[1] = null
      state.limitArgOnError = null
      checkVariantNavigationState(state, '__', '__', '__')

      state.argLimits[0] = 0
      state.limitArgOnError = true
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '01', '0_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '0_')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '0_')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '01', '0_')
      state.argLimits[1] = 0
      resetVariantNavigation(state)
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '00')
      state.argLimits[0] = null
      state.argLimits[1] = null
      state.limitArgOnError = null
      checkVariantNavigationState(state, '__', '__', '__')

      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '11', '__')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '10', '__')

      state.argLimits[0] = 0
      state.argLimits[1] = 1
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '01')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '01')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '01')
      state.argLimits[0] = null
      state.argLimits[1] = null
      resetVariantNavigation(state)
      checkVariantNavigationState(state, '__', '__', '__')

      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '11', '__')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '10', '__')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '01', '__')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '00', '__')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '__', '__', '__')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '11', '11', '__')
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 1 value, limit 0', () => {
    const state = _createVariantNavigationState('0', '', '0')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 2 values, limit 0', () => {
    const state = _createVariantNavigationState('1', '', '0')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 2 values, limit 1', () => {
    const state = _createVariantNavigationState('1', '', '1')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '1')
      assert.isTrue(retreatVariantNavigation(state))
      checkVariantNavigationState(state, '1', '0', '1')
      assert.isFalse(retreatVariantNavigation(state))
    }
    checkVariantNavigationState(state, '_', '_', '1')
  })
})

describe('randomVariantNavigation', () => {
  it('empty', () => {
    const state = _createVariantNavigationState('', [], '')
    checkVariantNavigationState(state, '', '', '')
    assert.isFalse(randomVariantNavigation(state))
    checkVariantNavigationState(state, '', '', '')
  })

  it('1 arg, 1 value', () => {
    const state = _createVariantNavigationState('0', '', '_')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '_')
      assert.isTrue(randomVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      assert.isTrue(randomVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      assert.isTrue(randomVariantNavigation(state))
      checkVariantNavigationState(state, '0', '0', '_')
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 3 values', () => {
    const state = _createVariantNavigationState('2', '', '_')

    const actualStates = new Set<string>()
    for (let i = 0; i < 10; i++) {
      checkVariantNavigationState(state, '_', '_', '_')
      for (let i = 0; i < 1000; i++) {
        assert.isTrue(randomVariantNavigation(state))
        checkVariantNavigationState(state, '2', null, '_')
        actualStates.add(formatState(state))
      }
      resetVariantNavigation(state)
    }

    assert.deepStrictEqual(
      Array.from(actualStates).sort(),
      ['2|0|_', '2|1|_', '2|2|_'],
      'actualStates',
    )
  })

  it('2 arg, 2 values', () => {
    const state = _createVariantNavigationState('11', '', '__')
    // For test random navigation
    const sequences = new Set<string>()

    const actualStates = new Set<string>()
    for (let i = 0; i < 20; i++) {
      checkVariantNavigationState(state, '__', '__', '__')
      for (let i = 0; i < 1000; i++) {
        assert.isTrue(randomVariantNavigation(state))
        checkVariantNavigationState(state, '11', null, '__')
        actualStates.add(formatState(state))
      }
      resetVariantNavigation(state)

      const sequence = Array.from(actualStates).join(',')
      sequences.add(sequence)

      assert.deepStrictEqual(
        Array.from(actualStates).sort(),
        ['11|00|__', '11|01|__', '11|10|__', '11|11|__'],
        'actualStates',
      )
      actualStates.clear()
    }

    assert.isAbove(
      sequences.size,
      3,
      `navigation is not random:\n${Array.from(sequences).join('\n')}`,
    )
  })
})

describe('variantNavigation complex', () => {
  it('values as complex funcs', () => {
    const state = createVariantNavigationState(
      {
        a: [1, 2],
        b: ({ a }) => (a % 2 === 0 ? [] : [3, 4]),
        c: ({ b }) => (b % 2 === 1 ? [5, 6] : [7, 8, 9]),
      },
      null,
      null,
      false,
    )
    const advanceStates = new Set<string>()
    const retreatStates = new Set<string>()
    const randomStates = new Set<string>()
    while (advanceVariantNavigation(state)) {
      advanceStates.add(formatState(state))
    }
    resetVariantNavigation(state)
    while (retreatVariantNavigation(state)) {
      retreatStates.add(formatState(state))
    }
    resetVariantNavigation(state)
    for (let i = 0; i < 1000; i++) {
      const result = randomVariantNavigation(state)
      if (result) {
        randomStates.add(formatState(state))
      }
    }

    assert.deepStrictEqual(
      Array.from(advanceStates),
      Array.from(retreatStates).reverse(),
    )
    assert.deepStrictEqual(
      Array.from(randomStates).sort(),
      Array.from(advanceStates).sort(),
    )

    console.log('advanceStates:', Array.from(advanceStates))
    console.log('retreatStates:', Array.from(retreatStates))
    console.log('randomStates:', Array.from(randomStates))
  })
})

// region complex template test

type ComplexArgs = {
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

function parseExtraCounts(extraPattern: string, argIndex: number): number[] {
  const count = Number(extraPattern[argIndex] || 0)
  const result: number[] = []
  for (let i = 0; i < count; i++) {
    result.push(1000 + i)
  }
  return result
}

function createComplexState(
  extraPattern: string,
  limitArgOnError: null | boolean | LimitArgOnError,
  includeErrorVariant: boolean,
): VariantNavigationState<ComplexArgs> {
  const templates = createComplexTemplates(extraPattern)
  const state = createVariantNavigationState<ComplexArgs>(
    templates,
    null,
    limitArgOnError,
    includeErrorVariant,
  )
  return state
}

// Collect all valid variants for given extraPattern
function collectAllVariants(extraPattern: string): string[] {
  const state = createComplexState(extraPattern, null, false)
  const variants: string[] = []
  while (advanceVariantNavigation(state)) {
    variants.push(formatIndexes(state.indexes))
  }
  return variants
}

const testVariantsComplex = createTestVariants(
  ({
    extraPattern,
    limitPattern,
    setLimitAtIteration,
    limitArgOnError,
    includeErrorVariant,
    changeMethod,
  }: {
    extraPattern: string
    limitPattern: string
    setLimitAtIteration: null | number
    limitArgOnError: null | boolean | LimitArgOnError
    includeErrorVariant: boolean
    changeMethod: 'advance' | 'retreat' | 'random'
  }) => {
    const argsCount = 4
    const indexesEmpty = '_'.repeat(argsCount)
    const limitEmpty = '_'.repeat(argsCount)

    const state = createComplexState(
      extraPattern,
      limitArgOnError,
      includeErrorVariant,
    )

    // Collect all valid variants for this extraPattern
    const allVariants = collectAllVariants(extraPattern)
    const allVariantsSet = new Set(allVariants)

    // Invariant: initial state is empty
    assert.deepStrictEqual(formatIndexes(state.indexes), indexesEmpty)

    let prevIndexes: string = indexesEmpty
    let countIncrements = 0
    let countDecrements = 0
    let countEquals = 0
    let limitHit = false
    const hitVariants = new Set<string>()

    const countIterations = 256
    for (let iteration = 0; iteration < countIterations; iteration++) {
      // Set limit at specified iteration
      if (setLimitAtIteration != null && iteration === setLimitAtIteration) {
        state.argLimits = parseLimits(limitPattern)
      }

      let result: boolean
      if (changeMethod === 'advance') {
        result = advanceVariantNavigation(state)
      } else if (changeMethod === 'retreat') {
        result = retreatVariantNavigation(state)
      } else if (changeMethod === 'random') {
        result = randomVariantNavigation(state)
      } else {
        throw new Error(`Unknown changeMethod: ${changeMethod}`)
      }

      const indexes = formatIndexes(state.indexes)

      if (result) {
        hitVariants.add(indexes)

        // Invariant: result variant is not empty
        if (indexes === indexesEmpty) {
          assert.fail(`indexes(${indexes}) === indexesEmpty(${indexesEmpty})`)
        }

        // Invariant: result variant is in allVariants (valid combination)
        if (!allVariantsSet.has(indexes)) {
          assert.fail(`indexes(${indexes}) not in allVariants`)
        }

        // Invariant: args match indexes
        for (let i = 0; i < argsCount; i++) {
          const argName = state.argsNames[i]
          const valueIndex = state.indexes[i]
          const value = state.argValues[i][valueIndex]
          assert.strictEqual(
            state.args[argName],
            value,
            `args[${argName}] !== argValues[${i}][${valueIndex}]`,
          )
        }

        // Invariant: indexes are within recalculated template bounds
        // This catches stale argValues and missing resetSubsequent bugs
        const recalcArgs: Partial<ComplexArgs> = {}
        for (let i = 0; i < argsCount; i++) {
          const argName = state.argsNames[i]
          const template = state.templates.templates[argName]
          const values =
            typeof template === 'function'
              ? template(recalcArgs as ComplexArgs)
              : template
          const valueIndex = state.indexes[i]
          if (valueIndex >= values.length) {
            assert.fail(
              `index(${valueIndex}) >= recalculated values.length(${values.length}) for ${argName}`,
            )
          }
          recalcArgs[argName] = values[valueIndex]
        }

        // Invariant: order (advance/retreat/random)
        if (prevIndexes !== indexesEmpty) {
          if (changeMethod === 'advance') {
            if (indexes <= prevIndexes) {
              assert.fail(`indexes(${indexes}) <= prevIndexes(${prevIndexes})`)
            }
          } else if (changeMethod === 'retreat') {
            if (indexes >= prevIndexes) {
              assert.fail(`indexes(${indexes}) >= prevIndexes(${prevIndexes})`)
            }
          } else if (changeMethod === 'random') {
            if (indexes > prevIndexes) {
              countIncrements++
            } else if (indexes < prevIndexes) {
              countDecrements++
            } else {
              countEquals++
            }
          }
        }

        // Invariant: limit check
        if (setLimitAtIteration != null && iteration >= setLimitAtIteration) {
          if (limitPattern !== limitEmpty) {
            // Lexicographic limit
            if (includeErrorVariant) {
              if (indexes > limitPattern) {
                assert.fail(
                  `indexes(${indexes}) > limitPattern(${limitPattern})`,
                )
              }
              if (indexes === limitPattern) {
                limitHit = true
              }
            } else {
              if (indexes >= limitPattern) {
                assert.fail(
                  `indexes(${indexes}) >= limitPattern(${limitPattern})`,
                )
              }
            }

            // Per-arg limit (when limitArgOnError is true or funcTrue)
            if (limitArgOnError === true || limitArgOnError === funcTrue) {
              state.indexes.forEach((index, i) => {
                const limit = state.argLimits[i]
                if (limit != null && index > limit) {
                  assert.fail(
                    `index(${index}) > argLimit(${limit}) for arg${i}`,
                  )
                }
              })
            }
          }
        }
      } else {
        // Invariant: false result means empty state
        if (indexes !== indexesEmpty) {
          assert.fail(`indexes(${indexes}) !== indexesEmpty(${indexesEmpty})`)
        }
      }

      prevIndexes = indexes
    }

    // Invariant: all variants hit when no limit (for advance/retreat, or statistically for random)
    if (setLimitAtIteration == null && changeMethod !== 'random') {
      for (const variant of allVariants) {
        if (!hitVariants.has(variant)) {
          assert.fail(`Variant ${variant} not hit`)
        }
      }
    }

    // Invariant: random produces variance
    if (
      changeMethod === 'random' &&
      countIterations > 50 &&
      (countIncrements > 5 || countDecrements > 5)
    ) {
      if (
        (countIncrements === 0 && countDecrements === 0) ||
        (countIncrements === 0 && countEquals === 0) ||
        (countDecrements === 0 && countEquals === 0)
      ) {
        assert.fail(
          `countIncrements(${countIncrements}), countDecrements(${countDecrements}), countEquals(${countEquals})`,
        )
      }
    }

    // Invariant: limit point reachable when includeErrorVariant
    if (
      setLimitAtIteration != null &&
      setLimitAtIteration < countIterations &&
      limitPattern !== limitEmpty &&
      includeErrorVariant &&
      allVariantsSet.has(limitPattern) &&
      changeMethod !== 'random' &&
      !limitHit
    ) {
      assert.fail(`limitPattern(${limitPattern}) not hit`)
    }
  },
)

// endregion

const funcTrue = () => true
const funcFalse = () => false

const testVariants = createTestVariants(
  ({
    valuesAsFuncs,
    valuesPattern,
    extraPattern,
    limitPattern,
    setLimitAtIteration,
    limitArgOnError,
    includeErrorVariant,
    changeMethod,
  }: {
    valuesAsFuncs: boolean
    valuesPattern: string
    extraPattern: string
    limitPattern: string
    setLimitAtIteration: null | number
    limitArgOnError: null | boolean | LimitArgOnError
    includeErrorVariant: boolean
    changeMethod: 'advance' | 'retreat' | 'random'
  }) => {
    const valuesEmpty = '_'.repeat(valuesPattern.length)
    const indexesEmpty = '_'.repeat(valuesPattern.length)
    const limitEmpty = '_'.repeat(limitPattern.length)

    const state = _createVariantNavigationState(
      valuesPattern,
      extraPattern,
      limitEmpty,
      valuesAsFuncs,
    )
    state.limitArgOnError = limitArgOnError
    state.includeErrorVariant = includeErrorVariant

    checkVariantNavigationState(state, valuesEmpty, indexesEmpty, limitEmpty)
    resetVariantNavigation(state)
    checkVariantNavigationState(state, valuesEmpty, indexesEmpty, limitEmpty)

    const maxIndexes = valuesPattern
      .split('')
      .map((o, i) => String(Number(o) + Number(extraPattern[i] || 0)))
      .join('')
    const limitNeverHit =
      setLimitAtIteration == null ||
      limitPattern > maxIndexes ||
      limitPattern
        .split('')
        .some((o, i) => o === '_' || Number(o) > Number(maxIndexes[i]))
    let prevIndexes: string = formatIndexes(state.indexes)
    let prevValues: string = formatTemplatesValues(state.argValues)
    let countIncrements = 0
    let countDecrements = 0
    let countEquals = 0
    let limitHit = false
    const notHitIndexes = valuesPattern
      .split('')
      .map(
        (o, i) =>
          new Set(
            Array.from(
              { length: Number(o) + 1 + Number(extraPattern[i] || 0) },
              (_, i) => i,
            ),
          ),
      )
    const countIterations = 256 // 4 ** 4 (values + extra)
    for (let iteration = 0; iteration < countIterations; iteration++) {
      // set limit at iteration
      if (setLimitAtIteration != null && iteration === setLimitAtIteration) {
        state.argLimits = parseLimits(limitPattern)
      }

      let result: boolean
      if (changeMethod === 'advance') {
        result = advanceVariantNavigation(state)
      } else if (changeMethod === 'retreat') {
        result = retreatVariantNavigation(state)
      } else if (changeMethod === 'random') {
        result = randomVariantNavigation(state)
      } else {
        throw new Error(`Unknown changeMethod: ${changeMethod}`)
      }

      const indexes = formatIndexes(state.indexes)
      const values = formatTemplatesValues(state.argValues)
      state.indexes.forEach((index, i) => {
        notHitIndexes[i].delete(index)
      })

      if (result) {
        if (valuesPattern !== valuesEmpty) {
          if (indexes === indexesEmpty) {
            assert.fail(`indexes(${indexes}) === indexesEmpty(${indexesEmpty})`)
          }
          if (values === valuesEmpty) {
            assert.fail(`values(${values}) === valuesEmpty(${valuesEmpty})`)
          }
        }

        // check order
        if (prevIndexes === indexesEmpty || prevValues === valuesEmpty) {
          if (prevIndexes !== indexesEmpty) {
            assert.fail(
              `prevIndexes(${prevIndexes}) !== indexesEmpty(${indexesEmpty})`,
            )
          }
          if (prevValues !== valuesEmpty) {
            assert.fail(
              `prevValues(${prevValues}) !== valuesEmpty(${valuesEmpty})`,
            )
          }
        } else {
          assert.strictEqual(values, prevValues)
          if (changeMethod === 'advance') {
            if (indexes <= prevIndexes) {
              assert.fail(`indexes(${indexes}) <= prevIndexes(${prevIndexes})`)
            }
          } else if (changeMethod === 'retreat') {
            if (indexes >= prevIndexes) {
              assert.fail(`indexes(${indexes}) >= prevIndexes(${prevIndexes})`)
            }
          } else if (changeMethod === 'random') {
            if (indexes > prevIndexes) {
              countIncrements++
            } else if (indexes < prevIndexes) {
              countDecrements++
            } else {
              countEquals++
            }
          }
        }
      } else {
        if (indexes !== indexesEmpty) {
          assert.fail(`indexes(${indexes}) !== indexesEmpty(${indexesEmpty})`)
        }
        if (values !== valuesEmpty) {
          assert.fail(`values(${values}) !== valuesEmpty(${valuesEmpty})`)
        }
      }

      // check limit
      if (setLimitAtIteration != null && iteration >= setLimitAtIteration) {
        if (limitPattern !== limitEmpty && indexes !== indexesEmpty) {
          // lexicographic limit
          if (includeErrorVariant) {
            if (indexes > limitPattern) {
              assert.fail(`indexes(${indexes}) > limitPattern(${limitPattern})`)
            }
            if (indexes === limitPattern) {
              limitHit = true
            }
          } else {
            if (indexes >= limitPattern) {
              assert.fail(
                `indexes(${indexes}) >= limitPattern(${limitPattern})`,
              )
            }
          }

          // arg limits
          if (limitArgOnError === true || limitArgOnError === funcTrue) {
            state.indexes.forEach((index, i) => {
              const limit = state.argLimits[i]
              if (limit != null && index > limit) {
                assert.fail(`index(${index}) > argLimit(${limit}) for arg${i}`)
              }
            })
          }
        }
      }

      prevIndexes = indexes
      prevValues = values
    }

    if (
      setLimitAtIteration == null &&
      (changeMethod !== 'random' || countIterations > 50)
    ) {
      notHitIndexes.forEach((set, i) => {
        if (set.size > 0) {
          assert.fail(
            `Not hit indexes for arg${i}: ${Array.from(set).join(', ')}`,
          )
        }
      })
    }

    if (
      setLimitAtIteration != null &&
      !limitNeverHit &&
      limitPattern &&
      valuesPattern >= limitPattern &&
      countIterations > setLimitAtIteration &&
      includeErrorVariant &&
      (changeMethod !== 'random' || countIterations > 50) &&
      !limitHit
    ) {
      assert.fail(`limitPattern(${limitPattern}) not hit`)
    }

    if (
      changeMethod === 'random' &&
      countIterations > 50 &&
      (countIncrements > 5 || countDecrements > 5)
    ) {
      if (
        (countIncrements === 0 && countDecrements === 0) ||
        (countIncrements === 0 && countEquals === 0) ||
        (countDecrements === 0 && countEquals === 0)
      ) {
        assert.fail(
          `countIncrements(${countIncrements}), countDecrements(${countDecrements}), countEquals(${countEquals})`,
        )
      }
    }
  },
)

describe(
  'variantNavigation variants',
  { timeout: 7 * 24 * 60 * 60 * 1000 },
  () => {
    it('variants', async () => {
      const patterns1 = ['', '0', '1', '2']
      const patterns2 = ['10', '02', '20', '12', '21', '22']
      const patternsAll = [...patterns1, ...patterns2]

      await testVariants({
        valuesAsFuncs: [false, true],
        valuesPattern: patternsAll,
        extraPattern: ({ valuesPattern }) => {
          return [
            '0'.repeat(valuesPattern.length),
            '2'.repeat(valuesPattern.length),
          ]
        },
        setLimitAtIteration: [null, 0, 1, 2],
        limitPattern: ({ setLimitAtIteration, valuesPattern }) => {
          return setLimitAtIteration == null
            ? ['_'.repeat(valuesPattern.length)]
            : valuesPattern.length === 1
              ? patterns1
              : patterns2
        },
        limitArgOnError: [null, true, false, funcTrue, funcFalse],
        includeErrorVariant: [false, true],
        changeMethod: ['advance', 'retreat', 'random'],
      })()
    })
  },
)

describe(
  'variantNavigation complex variants',
  { timeout: 7 * 24 * 60 * 60 * 1000 },
  () => {
    it('complex variants', async () => {
      // Sample limit patterns covering interesting cases:
      // - first variant, middle variants, last variant
      // - variants with dead-end branches
      // - patterns with unlimited later args to trigger resetSubsequent bug
      const limitPatterns = [
        '0000', // first possible
        '0010', // early variant
        '0102', // middle area
        '1000', // after first arg change
        '1110', // near dead end (b=2 is dead)
        '2030', // last arg area (a=2)
        '2032', // near the end
        // Patterns to trigger resetSubsequent bug:
        // When prior arg clamped, stale argValues for later args may be longer
        // than recalculated values, causing index to exceed bounds
        '1033', // a<=1 but c,d have high limits
        '0133', // b<=1 but c,d have high limits
        '1133', // a,b limited, c,d have high limits
      ]

      await testVariantsComplex({
        extraPattern: ['0000', '1111', '0202'],
        setLimitAtIteration: [null, 0, 1, 5, 10],
        limitPattern: ({ setLimitAtIteration }) => {
          return setLimitAtIteration == null ? ['____'] : limitPatterns
        },
        limitArgOnError: [null, true, false, funcTrue, funcFalse],
        includeErrorVariant: [false, true],
        changeMethod: ['advance', 'retreat', 'random'],
      })()
    })
  },
)
