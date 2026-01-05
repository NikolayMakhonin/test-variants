import { Ref } from '@flemist/simple-utils'
import { VariantNavigationState } from 'src/common/test-variants/iterator/types'

function formatIndex(index: number): string {
  return index === -1 ? '_' : String(index)
}

export function formatIndexes(indexes: number[]): string {
  return indexes.map(formatIndex).join('')
}

function formatLimit(limit: number | null): string {
  return limit === null ? '_' : String(limit)
}

export function formatLimits(limits: (number | null)[]): string {
  return limits.map(formatLimit).join('')
}

function formatValues(values: readonly Ref<number>[]): string {
  if (values === undefined) {
    return '_'
  }
  const max = values.length - 1
  return max < 0 ? '-' : String(max)
}

export function formatTemplatesValues(
  argValues: (readonly Ref<number>[])[],
): string {
  return argValues.map(formatValues).join('')
}

export function formatState(state: VariantNavigationState<any>): string {
  return `${formatTemplatesValues(state.argValues as any)}|${formatIndexes(
    state.indexes,
  )}|${formatLimits(state.argLimits)}`
}
