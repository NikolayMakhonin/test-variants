import type {
  BackwardModeConfig,
  ForwardModeConfig,
  ModeConfig,
} from 'src/common/test-variants/types'

/** Check if mode is sequential (forward or backward) */
export function isSequentialMode(
  modeConfig: ModeConfig,
): modeConfig is ForwardModeConfig | BackwardModeConfig {
  return modeConfig.mode === 'forward' || modeConfig.mode === 'backward'
}
