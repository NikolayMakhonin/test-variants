import { Obj } from '@flemist/simple-utils'

export function freezeProps<T extends Obj>(obj: T, ...props: (keyof T)[]): T {
  for (const prop of props) {
    const value = obj[prop]
    Object.defineProperty(obj, prop, {
      value,
      writable: false,
      configurable: false,
      enumerable: true,
    })
  }
  return obj
}
