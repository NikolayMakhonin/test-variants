import type { ModeChangeEvent, ModeConfig } from 'src/common'
import { estimateModeChanges } from 'src/common/test-variants/-test/estimations/estimateModeChanges'

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
  private lastModeIndex = -1
  private readonly iterationModes: readonly ModeConfig[]

  constructor(iterationModes: readonly ModeConfig[]) {
    this.iterationModes = iterationModes
  }

  onModeChange(event: ModeChangeEvent, expectedCallCount: number): void {
    this.modeChangeCount++

    // Validate modeIndex is in valid range
    if (event.modeIndex < 0 || event.modeIndex >= this.iterationModes.length) {
      throw new Error(
        `onModeChange: modeIndex ${event.modeIndex} out of range [0, ${this.iterationModes.length})`,
      )
    }

    // Validate mode matches iterationModes[modeIndex]
    const expectedMode = this.iterationModes[event.modeIndex]
    if (event.mode !== expectedMode) {
      throw new Error(
        `onModeChange: mode does not match iterationModes[${event.modeIndex}]`,
      )
    }

    // Validate tests count
    if (event.tests !== expectedCallCount) {
      throw new Error(
        `onModeChange: tests ${event.tests} !== callCount ${expectedCallCount}`,
      )
    }

    this.lastModeIndex = event.modeIndex
  }

  getModeChangeCount(): number {
    return this.modeChangeCount
  }

  validateFinal(callCount: number): void {
    if (callCount > 0 && this.modeChangeCount === 0) {
      throw new Error(`onModeChange: expected at least one mode change`)
    }
    const modeChangesRange = estimateModeChanges(this.iterationModes, callCount)
    if (this.modeChangeCount < modeChangesRange[0]) {
      throw new Error(
        `onModeChange: count ${this.modeChangeCount} < expected minimum ${modeChangesRange[0]}`,
      )
    }
  }
}
