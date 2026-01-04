import type { ModeChangeEvent, ModeConfig } from 'src/common'
import type { NumberRange } from '@flemist/simple-utils'

/**
 * Validates onModeChange callback behavior
 *
 * ## Applicability
 * Active when iterationModes are configured.
 * Validates onModeChange callback is called correctly.
 *
 * ## Validated Rules
 * - onModeChange called at start with initial mode
 * - onModeChange called when mode switches
 * - mode parameter is valid ModeConfig from iterationModes
 * - modeIndex parameter is within range
 * - tests parameter matches callCount at mode change
 */
export class OnModeChangeInvariant {
  private modeChangeCount = 0
  private readonly iterationModes: readonly ModeConfig[]
  private readonly modeChangesRange: NumberRange

  constructor(
    iterationModes: readonly ModeConfig[],
    modeChangesRange: NumberRange,
  ) {
    this.iterationModes = iterationModes
    this.modeChangesRange = modeChangesRange
  }

  onModeChange(event: ModeChangeEvent, callCount: number): void {
    this.modeChangeCount++

    if (event.modeIndex < 0 || event.modeIndex >= this.iterationModes.length) {
      throw new Error(
        `[test][OnModeChangeInvariant] modeIndex ${event.modeIndex} out of range [0, ${this.iterationModes.length})`,
      )
    }

    const expectedMode = this.iterationModes[event.modeIndex]
    if (event.mode !== expectedMode) {
      throw new Error(
        `[test][OnModeChangeInvariant] mode does not match iterationModes[${event.modeIndex}]`,
      )
    }

    if (event.tests !== callCount) {
      throw new Error(
        `[test][OnModeChangeInvariant] tests ${event.tests} !== callCount ${callCount}`,
      )
    }
  }

  validateFinal(callCount: number): void {
    if (callCount > 0 && this.modeChangeCount === 0) {
      throw new Error(
        `[test][OnModeChangeInvariant] expected at least one mode change`,
      )
    }
    if (this.modeChangeCount < this.modeChangesRange[0]) {
      throw new Error(
        `[test][OnModeChangeInvariant] count ${this.modeChangeCount} < expected minimum ${this.modeChangesRange[0]}`,
      )
    }
  }
}
