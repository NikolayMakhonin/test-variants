import type { Obj } from '@flemist/simple-utils'
import type { Equals } from 'src/common/test-variants/types'
import type {
  ArgName,
  TestVariantsTemplates,
  TestVariantsTemplatesWithExtra,
} from './types'
import { findValueIndex } from 'src/common/test-variants/helpers/findValueIndex'

/** Extend template arg with extra value */
function extendTemplateWithValue<Args extends Obj>(
  templates: TestVariantsTemplatesWithExtra<Args, any>,
  addingArgs: Args,
  keys: ArgName<Args>[],
  keyIndex: number,
  equals?: null | Equals,
): void {
  const key = keys[keyIndex]
  const value = addingArgs[key]

  const template = templates.templates[key] as any[]
  if (typeof template !== 'function') {
    if (findValueIndex(template, value, equals) >= 0) {
      return
    }
    // Это только для оптимизации, чтобы не создавать
    // лишние массивы в calcArgValues.
    // Но это может мутировать входящий шаблон,
    // поэтому его нужно клонировать после получения от пользователя
    template.push(value)
    return
  }

  const extra = templates.extra[key]
  if (findValueIndex(extra, value, equals) >= 0) {
    return
  }

  extra.push(value)
}

/** Extend templates with all missing values from saved args */
export function extendTemplatesForArgs<Args extends Obj>(
  templates: TestVariantsTemplatesWithExtra<Args, any>,
  addingArgs: Args,
  keys: ArgName<Args>[],
  keysCount: number,
  equals?: null | Equals,
): void {
  for (let i = 0; i < keysCount; i++) {
    extendTemplateWithValue(templates, addingArgs, keys, i, equals)
  }
}

/** Check if all args keys exist in template */
export function isArgsKeysInTemplate<Args extends Obj>(
  template: TestVariantsTemplates<Args>,
  args: Args,
): boolean {
  for (const key in args) {
    if (Object.prototype.hasOwnProperty.call(args, key)) {
      if (key === 'seed') {
        continue
      }
      if (!template[key]) {
        return false
      }
    }
  }
  return true
}
