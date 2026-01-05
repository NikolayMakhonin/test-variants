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
  extraPatterns: string[],
  limitPattern: string,
): VariantNavigationState<any> {
  const templates = parseTemplates(argsPattern)
  const templatesExtra = parseTemplatesExtra(extraPatterns)
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
    const state = _createVariantNavigationState('', [], '')
    checkVariantNavigationState(state, '', '', '')
    assert.isFalse(advanceVariantNavigation(state))
    checkVariantNavigationState(state, '', '', '')
  })

  it('1 arg, 1 value', () => {
    const state = _createVariantNavigationState('0', [], '_')
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
    const state = _createVariantNavigationState('2', [], '_')
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
    const state = _createVariantNavigationState('11', [], '__')
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
    const state = _createVariantNavigationState('0', [], '0')
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
    const state = _createVariantNavigationState('1', [], '0')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      assert.isFalse(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '_', '_', '0')
      resetVariantNavigation(state)
    }
  })

  it('1 arg, 2 values, limit 1', () => {
    const state = _createVariantNavigationState('1', [], '1')
    for (let i = 0; i < 3; i++) {
      checkVariantNavigationState(state, '_', '_', '1')
      assert.isTrue(advanceVariantNavigation(state))
      checkVariantNavigationState(state, '1', '0', '1')
      assert.isFalse(advanceVariantNavigation(state))
    }
    checkVariantNavigationState(state, '_', '_', '1')
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
    const state = _createVariantNavigationState('0', [], '_')
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
    const state = _createVariantNavigationState('2', [], '_')
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
    const state = _createVariantNavigationState('11', [], '__')
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
    const state = _createVariantNavigationState('0', [], '0')
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
    const state = _createVariantNavigationState('1', [], '0')
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
    const state = _createVariantNavigationState('1', [], '1')
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
    const state = _createVariantNavigationState('0', [], '_')
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
    const state = _createVariantNavigationState('2', [], '_')

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
    const state = _createVariantNavigationState('11', [], '__')
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

const funcTrue = () => true
const funcFalse = () => false

const testVariants = createTestVariants(
  ({
    valuesPattern,
    extraPatterns,
    limitPattern,
    setLimitAtIteration,
    limitArgOnError,
    includeErrorVariant,
    changeMethod,
  }: {
    valuesPattern: string
    extraPatterns: string[]
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
      extraPatterns,
      limitEmpty,
    )
    state.limitArgOnError = limitArgOnError
    state.includeErrorVariant = includeErrorVariant

    checkVariantNavigationState(state, valuesEmpty, indexesEmpty, limitEmpty)
    resetVariantNavigation(state)
    checkVariantNavigationState(state, valuesEmpty, indexesEmpty, limitEmpty)

    const maxIndexes =
      extraPatterns.length === 0
        ? valuesPattern
        : valuesPattern
            .split('')
            .map(o => String(Number(o) + extraPatterns.length))
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
      .map(o => new Set(Array.from({ length: Number(o) + 1 }, (_, i) => i)))
    const countIterations = 5
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

    if (countIterations > 50) {
      assert.isAbove(countIncrements, 0)
      assert.isAbove(countDecrements, 0)
      assert.isAbove(countEquals, 0)
    }
  },
)

describe('variantNavigation variants', () => {
  it('variants', async () => {
    const patterns1 = ['', '0', '1', '2']
    const patterns2 = ['10', '02', '20', '12', '21', '22']
    const extra1 = ['3', '4']
    const extra2 = ['33', '44']
    const patternsAll = [...patterns1, ...patterns2]

    await testVariants({
      valuesPattern: patternsAll,
      extraPatterns: ({ valuesPattern }) => {
        return [[], valuesPattern.length === 1 ? extra1 : extra2]
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
})
