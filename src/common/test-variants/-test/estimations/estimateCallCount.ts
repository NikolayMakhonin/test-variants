import type { TestVariantsRunOptions } from 'src/common'
import type { NumberRange } from '@flemist/simple-utils'
import { TestArgs } from '../types'
import { LIMIT_MAX, MODES_DEFAULT } from '../constants'

export function estimateCallCount(
  variantsCount: number,
  runOptions: TestVariantsRunOptions<TestArgs>,
): NumberRange {
  if (variantsCount === 0) {
    return [0, 0]
  }

  let min = 0
  let max: number

  if (runOptions.findBestError) {
    max = LIMIT_MAX
  } else {
    const globalCycles = Math.max(1, runOptions.cycles ?? 1)
    const modes = runOptions.iterationModes ?? MODES_DEFAULT

    let minPerGlobalCycle = 0
    let maxPerGlobalCycle = 0
    for (let i = 0, len = modes.length; i < len; i++) {
      const mode = modes[i]
      switch (mode.mode) {
        case 'forward':
        case 'backward': {
          const modeCycles = mode.cycles ?? 1
          const attempts = mode.attemptsPerVariant ?? 1
          let modeMax = variantsCount * modeCycles * attempts
          let modeMin = modeMax
          if (mode.limitTests != null) {
            modeMax = Math.min(modeMax, mode.limitTests)
            modeMin = Math.min(modeMin, mode.limitTests)
          }
          minPerGlobalCycle += modeMin
          maxPerGlobalCycle += modeMax
          break
        }
        case 'random': {
          let modeMax = variantsCount
          const modeMin = 0
          if (mode.limitTests != null) {
            modeMax = Math.min(modeMax, mode.limitTests)
          }
          minPerGlobalCycle += modeMin
          maxPerGlobalCycle += modeMax
          break
        }
        default: {
          throw new Error(`Unknown mode type: ${(mode as any).mode}`)
        }
      }
    }

    min = minPerGlobalCycle * globalCycles
    max = maxPerGlobalCycle * globalCycles
  }

  if (runOptions.limitTests != null) {
    min = Math.min(min, runOptions.limitTests)
    max = Math.min(max, runOptions.limitTests)
  }

  return [min, max]
}
