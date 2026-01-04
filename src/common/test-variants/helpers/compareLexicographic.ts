/** Compare indexes lexicographically (like numbers: 1999 < 2000)
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareLexicographic(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const ai = a[i] ?? 0
    const bi = b[i] ?? 0
    if (ai < bi) {
      return -1
    }
    if (ai > bi) {
      return 1
    }
  }
  return 0
}
