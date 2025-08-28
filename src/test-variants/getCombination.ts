export function getCombinationCount(
  options: any[][],
): number {
  let count = 1
  for (let i = 0, len = options.length; i < len; i++) {
    count *= options[i].length
  }
  return count
}

export function getCombination(
  options: any[][],
  index: number,
  result?: null | any[],
): any[] | null {
  if (!result) {
    result = [] as any
  }
  const len = options.length
  for (let i = len - 1; i >= 0; i--) {
    const option = options[i]
    const optionLen = option.length
    if (optionLen === 0) {
      return null
    }
    result[i] = option[index % optionLen]
    index = Math.floor(index / optionLen)
  }
  return result
}
