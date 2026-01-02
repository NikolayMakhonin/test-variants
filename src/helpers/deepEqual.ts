/** @deprecated Use deepEqualJsonLike from @flemist/simple-utils */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }
  if (a == null || b == null) {
    return false
  }
  if (typeof a !== 'object' || typeof b !== 'object') {
    return false
  }
  const aIsArray = Array.isArray(a)
  const bIsArray = Array.isArray(b)
  if (aIsArray !== bIsArray) {
    return false
  }
  if (aIsArray && bIsArray) {
    const len = a.length
    if (len !== b.length) {
      return false
    }
    for (let i = 0; i < len; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false
      }
    }
    return true
  }
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  const lenA = keysA.length
  if (lenA !== keysB.length) {
    return false
  }
  for (let i = 0; i < lenA; i++) {
    const key = keysA[i]
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false
    }
  }
  return true
}
