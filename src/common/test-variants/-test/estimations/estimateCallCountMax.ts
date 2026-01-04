import type { ModeConfig, TestVariantsRunOptions } from 'src/common'
import { TestArgs } from '../types'
import { LIMIT_MAX } from '../constants'

export const MODES_DEFAULT: readonly ModeConfig[] = Object.freeze([
  { mode: 'forward' },
])

export function estimateCallCountMax(
  variantsCount: number,
  runOptions: TestVariantsRunOptions<TestArgs>,
): number {
  if (variantsCount === 0) {
    return 0
  }

  let total: number

  if (runOptions.findBestError) {
    total = LIMIT_MAX
  } else {
    const globalCycles = Math.max(1, runOptions.cycles ?? 1)
    const modes = runOptions.iterationModes ?? MODES_DEFAULT

    // Calculate max calls per global cycle (all modes once)
    let maxPerGlobalCycle = 0
    for (let i = 0, len = modes.length; i < len; i++) {
      const mode = modes[i]
      switch (mode.mode) {
        case 'forward':
        case 'backward': {
          const modeCycles = mode.cycles ?? 1
          const attempts = mode.attemptsPerVariant ?? 1
          let modeMax = variantsCount * modeCycles * attempts
          // Apply mode limitTests
          if (mode.limitTests != null) {
            modeMax = Math.min(modeMax, mode.limitTests)
          }
          maxPerGlobalCycle += modeMax
          break
        }
        case 'random': {
          let modeMax = variantsCount
          // Apply mode limitTests
          if (mode.limitTests != null) {
            modeMax = Math.min(modeMax, mode.limitTests)
          }
          maxPerGlobalCycle += modeMax
          break
        }
        default: {
          throw new Error(`Unknown mode type: ${(mode as any).mode}`)
        }
      }
    }

    total = maxPerGlobalCycle * globalCycles
  }

  if (runOptions.limitTests != null) {
    total = Math.min(total, runOptions.limitTests)
  }

  return total
}
