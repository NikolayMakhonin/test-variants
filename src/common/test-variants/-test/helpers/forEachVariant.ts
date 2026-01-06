import type { Template, TemplateArray, TestArgs } from '../types'

/** @return true to break */
export type ForEachVariantCallback = (
  args: TestArgs,
  index: number,
) => boolean | null | undefined | void

export function forEachVariant(
  template: Template,
  argKeys: string[],
  callback?: null | ForEachVariantCallback,
): number {
  const keysLen = argKeys.length
  if (keysLen === 0) {
    return 0
  }
  let index = 0
  let stop = false

  function iterate(keyIndex: number, args: TestArgs): void {
    if (stop) {
      return
    }
    if (keyIndex >= keysLen) {
      const result = callback?.(args, index)
      if (result === true) {
        stop = true
        return
      }
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
    // high performance alternative to delete property
    args[key] = void 0 as any
  }

  iterate(0, {})

  return index
}
