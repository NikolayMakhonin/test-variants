import { Random, randomBoolean, randomInt } from '@flemist/simple-utils'
import { ObjectValue, StressTestArgs } from '../types'

export function generateBoolean(
  rnd: Random,
  booleanOption: boolean | null,
): boolean {
  return booleanOption ?? randomBoolean(rnd)
}

/**
 * Generate integer with boundary values priority:
 * 0, 1, 2, 3 - if max = 3
 * 0, 1, 2, max, [3..max-1] - if max >= 4 and isMaxBoundary is true
 * 0, 1, 2, [3..max] - if max >= 4 and isMaxBoundary is false
 */
export function generateBoundaryInt(
  rnd: Random,
  max: number,
  isMaxBoundary?: null | boolean,
): number {
  // max = 0: [0]
  // max = 1: [0, 1]
  // max = 2: [0, 1, 2]
  // max = 3: [0, 1, 2, 3]
  // max >= 4 && isMaxBoundary: [0, 1, 2, max, 3..max-1]
  // max >= 4 && !isMaxBoundary: [0, 1, 2, 3..max]
  if (max <= 0) {
    return 0
  }
  if (max === 1) {
    return randomBoolean(rnd) ? 0 : 1
  }
  if (max === 2) {
    return randomInt(rnd, 0, 3)
  }
  if (max === 3) {
    // [0, 1, 2, 3] - no random range since [3..2] is empty for isMaxBoundary
    // and [3..3] has only one value for !isMaxBoundary
    return randomInt(rnd, 0, 4)
  }
  if (isMaxBoundary) {
    // Priority: 0, 1, 2, max, then random [3..max-1]
    const choice = randomInt(rnd, 0, 5)
    if (choice === 0) {
      return 0
    }
    if (choice === 1) {
      return 1
    }
    if (choice === 2) {
      return 2
    }
    if (choice === 3) {
      return max
    }
    return randomInt(rnd, 3, max)
  }
  // Priority: 0, 1, 2, then random
  const choice = randomInt(rnd, 0, 4)
  if (choice === 0) {
    return 0
  }
  if (choice === 1) {
    return 1
  }
  if (choice === 2) {
    return 2
  }
  return randomInt(rnd, 3, max + 1)
}

/**
 * Generate limit value with priority: 0, 1, max-1, max, max+1, [2..max-2]
 */
export function generateLimit(rnd: Random, max: number): number {
  // max = 0: [0, 1]
  // max = 1: [0, 1, 2]
  // max = 2: [0, 1, 2, 3]
  // max = 3: [0, 1, 2, 3, 4]
  // max = 4: [0, 1, 2, 3, 4, 5]
  // max >= 5: [0, 1, 2..max-2, max-1, max, max+1]
  if (max === 0) {
    return randomBoolean(rnd) ? 0 : 1
  }
  if (max === 1) {
    return randomInt(rnd, 0, 3)
  }
  if (max === 2) {
    return randomInt(rnd, 0, 4)
  }
  if (max === 3) {
    return randomInt(rnd, 0, 5)
  }
  if (max === 4) {
    return randomInt(rnd, 0, 6)
  }
  const choice = randomInt(rnd, 0, 6)
  if (choice === 0) {
    return 0
  }
  if (choice === 1) {
    return 1
  }
  if (choice === 2) {
    return max - 1
  }
  if (choice === 3) {
    return max
  }
  if (choice === 4) {
    return max + 1
  }
  return randomInt(rnd, 2, max - 1)
}

export function equals(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }
  if (a == null || b == null) {
    return false
  }
  if (typeof a !== 'object' || typeof b !== 'object') {
    return false
  }
  return (a as ObjectValue).value === (b as ObjectValue).value
}

export function generateEquals(
  rnd: Random,
  options: StressTestArgs,
): ((a: unknown, b: unknown) => boolean) | undefined {
  const enabled = generateBoolean(rnd, options.withEquals)
  if (!enabled) {
    return void 0
  }
  return equals
}
