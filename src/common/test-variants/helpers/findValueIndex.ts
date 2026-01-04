/** Find index of value in array; returns -1 if not found */
export function findValueIndex<T>(
  values: readonly T[],
  value: T,
  equals?: null | ((a: T, b: T) => boolean),
): number {
  for (let i = 0; i < values.length; i++) {
    if (equals ? equals(values[i], value) : values[i] === value) {
      return i
    }
  }
  return -1
}
