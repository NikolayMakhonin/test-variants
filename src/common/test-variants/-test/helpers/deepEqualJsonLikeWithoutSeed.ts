import { deepEqualJsonLike } from '@flemist/simple-utils'

export function deepEqualJsonLikeWithoutSeed(a: any, b: any): boolean {
  for (const key in a) {
    if (Object.prototype.hasOwnProperty.call(a, key)) {
      if (key === 'seed') {
        continue
      }
      if (!deepEqualJsonLike(a[key], b[key])) {
        return false
      }
    }
  }
  for (const key in b) {
    if (
      Object.prototype.hasOwnProperty.call(b, key) &&
      key !== 'seed' &&
      !Object.prototype.hasOwnProperty.call(a, key)
    ) {
      return false
    }
  }
  return true
}
