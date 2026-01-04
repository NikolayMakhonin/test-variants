import type { ModeConfig } from 'src/common'
import type { NumberRange } from '@flemist/simple-utils'

export function estimateModeChanges(
  modes: readonly ModeConfig[],
  callCount: number,
): NumberRange {
  if (callCount === 0) {
    return [0, 0]
  }

  const modesCount = modes.length
  if (modesCount === 0) {
    return [0, 0]
  }

  if (modesCount === 1) {
    return [1, 1]
  }

  // Find min and max limitTests across modes
  let minLimit = Infinity
  let maxLimit = 0
  for (let i = 0; i < modesCount; i++) {
    const limit = modes[i].limitTests
    if (limit != null && limit > 0) {
      if (limit < minLimit) {
        minLimit = limit
      }
      if (limit > maxLimit) {
        maxLimit = limit
      }
    }
  }

  if (minLimit === Infinity) {
    return [1, 1]
  }

  // Min: ceil(callCount / maxLimit) mode switches
  // Max: ceil(callCount / minLimit) mode switches
  const min = Math.min(Math.ceil(callCount / maxLimit), callCount)
  const max = Math.min(Math.ceil(callCount / minLimit), callCount)

  return [min, max]
}
