import type { ModeConfig } from 'src/common'

export function getMaxAttemptsPerVariant(modes: readonly ModeConfig[]): number {
  let max = 1
  for (let i = 0, len = modes.length; i < len; i++) {
    const mode = modes[i]
    if (mode.mode === 'forward' || mode.mode === 'backward') {
      const attempts = mode.attemptsPerVariant ?? 1
      if (attempts > max) {
        max = attempts
      }
    }
  }
  return max
}
