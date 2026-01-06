import type { Obj } from '@flemist/simple-utils'
import type { Equals } from 'src/common/test-variants/types'
import type {
  ArgName,
  TestVariantsTemplates,
  TestVariantsTemplatesWithExtra,
} from '../types'
import { findValueIndex } from 'src/common/test-variants/iterator/helpers/findValueIndex'

/** Extend template arg with extra value */
function extendTemplateWithValue<Args extends Obj>(
  templates: TestVariantsTemplatesWithExtra<Args, any>,
  args: Args,
  argName: ArgName<Args>,
  equals?: null | Equals,
): void {
  const value = args[argName]

  const template = templates.templates[argName] as any[]
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

  const extra = templates.extra[argName]
  if (extra == null) {
    templates.extra[argName] = [value]
    return
  }

  if (findValueIndex(extra, value, equals) >= 0) {
    return
  }

  extra.push(value)
}

/** Extend templates with all extra values */
export function extendTemplatesWithExtraArgs<Args extends Obj>(
  templates: TestVariantsTemplatesWithExtra<Args, any>,
  args: Args,
  equals?: null | Equals,
): void {
  for (const argName in args) {
    if (Object.prototype.hasOwnProperty.call(args, argName)) {
      if (argName === 'seed') {
        continue
      }
      extendTemplateWithValue(templates, args, argName, equals)
    }
  }
}

/** Check if all args except `seed` exist in template */
export function isArgsKeysInTemplate<Args extends Obj>(
  template: TestVariantsTemplates<Args>,
  args: Args,
): boolean {
  for (const argName in args) {
    if (Object.prototype.hasOwnProperty.call(args, argName)) {
      if (argName === 'seed') {
        continue
      }
      if (!template[argName]) {
        return false
      }
    }
  }
  return true
}
