import type { ParallelOptions } from 'src/common/test-variants/types'

/**
 * Extracts actual parallel limit from parallel option
 *
 * @returns 1 for sequential, Infinity for unlimited, or the specified count
 */
export function getParallelLimit(
  parallel: number | boolean | ParallelOptions | null | undefined,
): number {
  if (parallel == null || parallel === false) {
    return 1
  }
  if (parallel === true) {
    return Infinity
  }
  if (typeof parallel === 'number') {
    return parallel > 1 ? parallel : 1
  }
  const count = parallel.count
  if (count == null || count === false) {
    return 1
  }
  if (count === true) {
    return Infinity
  }
  return count > 1 ? count : 1
}
