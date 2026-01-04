import type { Template, TemplateArray, TestArgs } from '../types'

export type ForEachVariantCallback = (args: TestArgs, index: number) => void

export function forEachVariant(
  template: Template,
  argKeys: string[],
  callback?: null | ForEachVariantCallback,
): number {
  const keysLen = argKeys.length
  let index = 0

  function iterate(keyIndex: number, args: TestArgs): void {
    if (keyIndex >= keysLen) {
      callback?.(args, index)
      index++
      return
    }
    const key = argKeys[keyIndex]
    const templateValue = template[key]
    const values: TemplateArray =
      typeof templateValue === 'function' ? templateValue(args) : templateValue
    for (let i = 0, len = values.length; i < len; i++) {
      args[key] = values[i]
      iterate(keyIndex + 1, args)
    }
    delete args[key]
  }

  iterate(0, {})
  return index
}

export function getVariantArgsByIndex(
  template: Template,
  argKeys: string[],
  targetIndex: number,
): TestArgs | null {
  let result: TestArgs | null = null
  forEachVariant(template, argKeys, (args, index) => {
    if (index === targetIndex) {
      result = args
    }
  })
  return Object.freeze(result)
}
