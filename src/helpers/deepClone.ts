export function deepClone<T>(value: T): T {
  if (value === null || value === (void 0)) {
    return value
  }
  if (typeof value !== 'object') {
    return value
  }
  if (Array.isArray(value)) {
    const len = value.length
    const result: unknown[] = []
    for (let i = 0; i < len; i++) {
      result[i] = deepClone(value[i])
    }
    return result as unknown as T
  }
  const result: Record<string, unknown> = {}
  const keys = Object.keys(value)
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i]
    result[key] = deepClone((value as Record<string, unknown>)[key])
  }
  return result as T
}
