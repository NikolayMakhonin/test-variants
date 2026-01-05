import { VariantNavigationState } from 'src/common/test-variants/iterator/types'
import {
  parseIndexes,
  parseLimits,
  parseTemplatesValues,
} from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/parse'
import { assert } from 'vitest'
import {
  formatIndexes,
  formatLimits,
  formatTemplatesValues,
} from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/format'
import { createArgs } from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/create'

export function checkVariantNavigationState(
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
