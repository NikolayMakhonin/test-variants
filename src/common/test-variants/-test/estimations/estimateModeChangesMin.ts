import type { ModeConfig } from 'src/common'

export function estimateModeChangesMin(
  modes: readonly ModeConfig[],
  callCount: number,
): number {
  if (callCount === 0) {
    return 0
  }

  const modesCount = modes.length
  if (modesCount === 0) {
    return 0
  }

  // At least 1 mode change when first mode starts
  if (modesCount === 1) {
    return 1
  }

  // Find minimum limitTests across modes
  let minLimit = Infinity
  for (let i = 0; i < modesCount; i++) {
    const limit = modes[i].limitTests
    if (limit != null && limit > 0 && limit < minLimit) {
      minLimit = limit
    }
  }

  if (minLimit === Infinity) {
    // No limits - only 1 mode change (first mode runs until completion)
    return 1
  }

  // Lower bound: ceil(callCount / minLimit) mode switches
  return Math.min(Math.ceil(callCount / minLimit), callCount)
}
