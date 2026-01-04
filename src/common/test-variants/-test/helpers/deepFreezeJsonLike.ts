export function deepFreezeJsonLike(value: unknown): void {
  if (value == null || typeof value !== 'object') {
    return
  }
  Object.freeze(value)
  if (Array.isArray(value)) {
    for (let i = 0, len = value.length; i < len; i++) {
      deepFreezeJsonLike(value[i])
    }
  } else {
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        deepFreezeJsonLike((value as Record<string, unknown>)[key])
      }
    }
  }
}
