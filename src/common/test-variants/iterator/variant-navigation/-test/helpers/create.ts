import {
  TestVariantsTemplates,
  VariantNavigationState,
} from 'src/common/test-variants/iterator/types'
import { getArgName } from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/caches'
import { deepEqualJsonLike, Ref } from '@flemist/simple-utils'
import {
  parseLimits,
  parseTemplates,
  parseTemplatesExtra,
} from 'src/common/test-variants/iterator/variant-navigation/-test/helpers/parse'
import { deepFreezeJsonLike } from 'src/common/test-variants/-test/helpers/deepFreezeJsonLike'
import { createVariantNavigationState } from 'src/common/test-variants/iterator/variant-navigation/variantNavigation'
import { assert } from 'vitest'
import { freezeProps } from 'src/common/-test/freezeProps'

export function createArgs(
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

export function _createVariantNavigationState(
  argsPattern: string,
  extraPattern: string,
  limitPattern: string,
  valuesAsFuncs?: boolean,
): VariantNavigationState<any> {
  const templates = {
    templates: parseTemplates(argsPattern, valuesAsFuncs ?? false),
    extra: parseTemplatesExtra(extraPattern),
  }
  deepFreezeJsonLike(templates)
  const state = createVariantNavigationState(
    templates,
    deepEqualJsonLike,
    null,
    false,
  )
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
    Object.keys(templates.templates),
    'state.argsNames',
  )
  assert.deepStrictEqual(
    state.indexes,
    Array.from({ length: argsPattern.length }, () => -1),
    'state.indexes',
  )
  assert.deepStrictEqual(
    state.args,
    createArgs(state.indexes, templates.templates),
    'state.args',
  )
  assert.deepStrictEqual(
    state.argValues,
    Array.from({ length: argsPattern.length }, () => void 0 as any),
    'state.argValues',
  )
  assert.strictEqual(state.attempts, 0, 'state.attemptIndex')
  assert.deepStrictEqual(state.templates, templates, 'state.templates')
  assert.strictEqual(state.limitArgOnError, null, 'state.limitArgOnError')
  assert.strictEqual(state.equals, deepEqualJsonLike, 'state.equals')
  return state
}
