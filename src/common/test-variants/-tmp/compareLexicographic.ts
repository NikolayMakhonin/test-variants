/** Compare indexes lexicographically (like numbers: 1999 < 2000)
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 * Treat null/undefined as +Infinity
 */
export function compareLexicographic(
  a: (number | null)[],
  b: (number | null)[],
): number {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const ai = a[i]
    const bi = b[i]

    if (ai == null) {
      if (bi == null) {
        continue
      }
      return 1
    }
    if (bi == null) {
      return -1
    }

    if (ai < bi) {
      return -1
    }
    if (ai > bi) {
      return 1
    }
  }
  return 0
}
