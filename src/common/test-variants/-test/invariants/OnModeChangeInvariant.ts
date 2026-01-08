import type { ModeChangeEvent, ModeConfig } from 'src/common'
import type { NumberRange } from '@flemist/simple-utils'

/**
 * Validates onModeChange callback behavior
 *
 * ## Applicability
 * Every mode change event
 *
 * ## Invariants
 * - onModeChange count within estimated range [min, max]
 * - First modeChange: modeIndex=0, tests=0
 * - modeIndex cycles in order: 0→1→...→N-1→0→...
 * - modeIndex within range [0, modesCount)
 * - mode reference equals iterationModes[modeIndex]
 * - tests ≥ 0
 * - tests increases monotonically
 */
export class OnModeChangeInvariant {
  private _modeChangeCount = 0
  private _lastTests = -1
  private _lastModeIndex = -1
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

    // Validate tests >= 0
    if (event.tests < 0) {
      throw new Error(
        `[test][OnModeChangeInvariant] tests (${event.tests}) < 0`,
      )
    }

    // Validate modeIndex in range
    if (event.modeIndex < 0 || event.modeIndex >= this._iterationModes.length) {
      throw new Error(
        `[test][OnModeChangeInvariant] modeIndex (${event.modeIndex}) out of range [0, ${this._iterationModes.length})`,
      )
    }

    // Validate mode reference
    const expectedMode = this._iterationModes[event.modeIndex]
    if (event.mode !== expectedMode) {
      throw new Error(
        `[test][OnModeChangeInvariant] mode !== iterationModes[${event.modeIndex}]`,
      )
    }

    // Validate first modeChange
    if (this._modeChangeCount === 1) {
      if (event.modeIndex !== 0) {
        throw new Error(
          `[test][OnModeChangeInvariant] first modeIndex (${event.modeIndex}) !== 0`,
        )
      }
      if (event.tests !== 0) {
        throw new Error(
          `[test][OnModeChangeInvariant] first tests (${event.tests}) !== 0`,
        )
      }
    } else {
      // Validate modeIndex cycling order: 0→1→...→N-1→0→...
      const expectedModeIndex =
        (this._lastModeIndex + 1) % this._iterationModes.length
      if (event.modeIndex !== expectedModeIndex) {
        throw new Error(
          `[test][OnModeChangeInvariant] modeIndex (${event.modeIndex}) !== expected (${expectedModeIndex}), prev (${this._lastModeIndex})`,
        )
      }
    }

    // Validate tests monotonically increasing
    if (event.tests < this._lastTests) {
      throw new Error(
        `[test][OnModeChangeInvariant] tests (${event.tests}) < prev (${this._lastTests})`,
      )
    }

    // Validate max during execution
    if (this._modeChangeCount > this._modeChangesRange[1]) {
      throw new Error(
        `[test][OnModeChangeInvariant] modeChangeCount (${this._modeChangeCount}) > max (${this._modeChangesRange[1]})`,
      )
    }

    this._lastTests = event.tests
    this._lastModeIndex = event.modeIndex
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
