const PRIME_NUMBER = 1073741789
export const UNIQUE_PSEUDO_RANDOM_MAX_COUNT = (PRIME_NUMBER >> 2) - 1

// TODO: извлечь в отдельный пакет, может test utils или math utils.
/** It is very simple algorithm. Use it for tests only !!! */
export function createUniquePseudoRandom(
  count: number = UNIQUE_PSEUDO_RANDOM_MAX_COUNT,
  startFrom?: null | number,
) {
  if (count <= 0) {
    throw new Error(
      `[test][createUniquePseudoRandom] count(${count}) must be > 0`,
    )
  }
  if (count > UNIQUE_PSEUDO_RANDOM_MAX_COUNT) {
    throw new Error(
      `[test][createUniquePseudoRandom] count(${count}) must be <= ${UNIQUE_PSEUDO_RANDOM_MAX_COUNT}`,
    )
  }
  if (startFrom == null) {
    startFrom = Math.floor(Math.random() * count)
  }
  if (startFrom >= count) {
    throw new Error(
      `[test][createUniquePseudoRandom] startFrom(${startFrom}) must be < count(${count})`,
    )
  }
  let value = startFrom
  return function uniquePseudoRandom() {
    value = (value + PRIME_NUMBER) % count
    return value
  }
}
