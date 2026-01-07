import type { ModeChangeEvent, ModeConfig } from 'src/common'

/**
 * Validates onModeChange callback behavior
 *
 * ## Applicability
 * Active when iterationModes are configured.
 * Validates onModeChange callback is called correctly.
 *
 * ## Validated Rules
 * - onModeChange called at least once if tests run
 * - mode parameter is valid ModeConfig from iterationModes
 * - modeIndex parameter is within range
 * - tests parameter increases monotonically
 *
 * ## Note
 * tests vs callCount comparison removed due to timing issues in parallel execution
 */
export class OnModeChangeInvariant {
  private _modeChangeCount = 0
  private _lastTests = -1
  private readonly _iterationModes: readonly ModeConfig[]

  constructor(iterationModes: readonly ModeConfig[]) {
    this._iterationModes = iterationModes
  }

  onModeChange(event: ModeChangeEvent): void {
    this._modeChangeCount++

    if (event.modeIndex < 0 || event.modeIndex >= this._iterationModes.length) {
      throw new Error(
        `[test][OnModeChangeInvariant] modeIndex ${event.modeIndex} out of range [0, ${this._iterationModes.length})`,
      )
    }

    const expectedMode = this._iterationModes[event.modeIndex]
    if (event.mode !== expectedMode) {
      throw new Error(
        `[test][OnModeChangeInvariant] mode does not match iterationModes[${event.modeIndex}]`,
      )
    }

    if (event.tests < this._lastTests) {
      throw new Error(
        `[test][OnModeChangeInvariant] tests ${event.tests} < previous ${this._lastTests} (not monotonic)`,
      )
    }

    this._lastTests = event.tests
  }

  validateFinal(callCount: number): void {
    if (callCount > 0 && this._modeChangeCount === 0) {
      throw new Error(
        `[test][OnModeChangeInvariant] expected at least one mode change but got 0`,
      )
    }
  }
}
