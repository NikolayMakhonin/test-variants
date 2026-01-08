import type { ModeChangeEvent, ModeConfig } from 'src/common'
import type { NumberRange } from '@flemist/simple-utils'

/**
 * Validates onModeChange callback behavior
 *
 * ## Applicability
 * Every mode change and test completion
 *
 * ## Invariants
 * - onModeChange count within estimated range
 * - mode parameter is valid ModeConfig from iterationModes
 * - modeIndex parameter within range [0, iterationModes.length)
 * - tests parameter ≥ 0
 * - tests parameter increases monotonically
 */
export class OnModeChangeInvariant {
  private _modeChangeCount = 0
  private _lastTests = -1
  private readonly _iterationModes: readonly ModeConfig[]
  private readonly _modeChangesRange: NumberRange

  constructor(
    iterationModes: readonly ModeConfig[],
    modeChangesRange: NumberRange,
  ) {
    this._iterationModes = iterationModes
    this._modeChangesRange = modeChangesRange
  }

  /** Use in onModeChange callback */
  onModeChange(event: ModeChangeEvent): void {
    this._modeChangeCount++

    if (event.tests < 0) {
      throw new Error(
        `[test][OnModeChangeInvariant] tests (${event.tests}) < 0`,
      )
    }

    if (event.modeIndex < 0 || event.modeIndex >= this._iterationModes.length) {
      throw new Error(
        `[test][OnModeChangeInvariant] modeIndex (${event.modeIndex}) out of range [0, ${this._iterationModes.length})`,
      )
    }

    const expectedMode = this._iterationModes[event.modeIndex]
    if (event.mode !== expectedMode) {
      throw new Error(
        `[test][OnModeChangeInvariant] mode !== iterationModes[${event.modeIndex}]`,
      )
    }

    if (event.tests < this._lastTests) {
      throw new Error(
        `[test][OnModeChangeInvariant] tests (${event.tests}) < prev (${this._lastTests})`,
      )
    }

    if (this._modeChangeCount > this._modeChangesRange[1]) {
      throw new Error(
        `[test][OnModeChangeInvariant] modeChangeCount (${this._modeChangeCount}) > max (${this._modeChangesRange[1]})`,
      )
    }

    this._lastTests = event.tests
  }

  /** Run after test variants completion */
  validateFinal(): void {
    if (this._modeChangeCount < this._modeChangesRange[0]) {
      throw new Error(
        `[test][OnModeChangeInvariant] modeChangeCount (${this._modeChangeCount}) < min (${this._modeChangesRange[0]})`,
      )
    }
    if (this._modeChangeCount > this._modeChangesRange[1]) {
      throw new Error(
        `[test][OnModeChangeInvariant] modeChangeCount (${this._modeChangeCount}) > max (${this._modeChangesRange[1]})`,
      )
    }
  }
}
