import {Obj} from 'src/test-variants/types'

export function argsToString(args: Obj) {
  return JSON.stringify(args, (_, value) => {
    if (value
      && typeof value === 'object'
      && !Array.isArray(value)
      && value.constructor !== Object
    ) {
      return value + ''
    }

    return value
  }, 2)
}
