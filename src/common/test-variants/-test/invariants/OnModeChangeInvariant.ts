import type { ModeChangeEvent, ModeConfig } from 'src/common'
import type { CallController } from '../helpers/CallController'

/**
 * Validates onModeChange callback behavior
 *
 * ## Applicability
 * Every mode change and test completion
 *
 * ## Invariants
 * - onModeChange called at least once
 * - mode parameter is valid ModeConfig from iterationModes
 * - modeIndex parameter within range [0, iterationModes.length)
 * - modeIndex sequence cycles in order: 0 → 1 → ... → N-1 → 0 → ...
 * - tests parameter ≥ 0
 * - tests parameter increases monotonically
 * - tests parameter approximately equals completedCount (tolerance: parallelLimit + 1)
 * - All modes used at least once after full cycle completion
 * - Mode changes count ≤ completedCount + modesCount
 */
export class OnModeChangeInvariant {
  private _modeChangeCount = 0
  private _lastTests = -1
  private _lastModeIndex = -1
  private readonly _iterationModes: readonly ModeConfig[]
  private readonly _callController: CallController
  private readonly _parallelLimit: number
  private readonly _modeUsed: boolean[]

  constructor(
    iterationModes: readonly ModeConfig[],
    callController: CallController,
    parallelLimit: number,
  ) {
    this._iterationModes = iterationModes
    this._callController = callController
    this._parallelLimit = parallelLimit
    this._modeUsed = new Array(iterationModes.length).fill(false)
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
        `[test][OnModeChangeInvariant] modeIndex (${event.modeIndex}) >= modesCount (${this._iterationModes.length})`,
      )
    }

    const expectedMode = this._iterationModes[event.modeIndex]
    if (event.mode !== expectedMode) {
      throw new Error(
        `[test][OnModeChangeInvariant] mode !== iterationModes[(${event.modeIndex})]`,
      )
    }

    if (this._lastModeIndex >= 0) {
      const expectedNextIndex =
        (this._lastModeIndex + 1) % this._iterationModes.length
      if (event.modeIndex !== expectedNextIndex) {
        throw new Error(
          `[test][OnModeChangeInvariant] modeIndex (${event.modeIndex}) !== expected (${expectedNextIndex}), prev (${this._lastModeIndex})`,
        )
      }
    } else if (event.modeIndex !== 0) {
      throw new Error(
        `[test][OnModeChangeInvariant] modeIndex (${event.modeIndex}) !== 0`,
      )
    }

    this._modeUsed[event.modeIndex] = true

    if (event.tests < this._lastTests) {
      throw new Error(
        `[test][OnModeChangeInvariant] tests (${event.tests}) < prev (${this._lastTests})`,
      )
    }

    const completedCount = this._callController.completedCount
    const tolerance = this._parallelLimit + 1
    if (event.tests > completedCount + tolerance) {
      throw new Error(
        `[test][OnModeChangeInvariant] tests (${event.tests}) > completedCount (${completedCount}) + tolerance (${tolerance})`,
      )
    }
    if (event.tests < completedCount - tolerance) {
      throw new Error(
        `[test][OnModeChangeInvariant] tests (${event.tests}) < completedCount (${completedCount}) - tolerance (${tolerance})`,
      )
    }

    this._lastTests = event.tests
    this._lastModeIndex = event.modeIndex
  }

  /** Run after test variants completion */
  validateFinal(): void {
    const completedCount = this._callController.completedCount
    const modesCount = this._iterationModes.length

    if (this._modeChangeCount === 0) {
      throw new Error(`[test][OnModeChangeInvariant] modeChangeCount == 0`)
    }

    if (modesCount === 1 && this._modeChangeCount !== 1) {
      throw new Error(
        `[test][OnModeChangeInvariant] modeChangeCount (${this._modeChangeCount}) !== 1, modesCount 1`,
      )
    }

    if (modesCount > 1) {
      const maxPossible = completedCount + modesCount
      if (this._modeChangeCount > maxPossible) {
        throw new Error(
          `[test][OnModeChangeInvariant] modeChangeCount (${this._modeChangeCount}) > max (${maxPossible}), completedCount (${completedCount}), modesCount (${modesCount})`,
        )
      }
    }

    const fullCycles = Math.floor(this._modeChangeCount / modesCount)
    if (fullCycles >= 1) {
      for (let i = 0; i < modesCount; i++) {
        if (!this._modeUsed[i]) {
          throw new Error(
            `[test][OnModeChangeInvariant] mode[(${i})] not used, fullCycles (${fullCycles})`,
          )
        }
      }
    }

    const expectedLastIndex = (this._modeChangeCount - 1) % modesCount
    if (this._lastModeIndex !== expectedLastIndex) {
      throw new Error(
        `[test][OnModeChangeInvariant] lastModeIndex (${this._lastModeIndex}) !== expected (${expectedLastIndex}), modeChangeCount (${this._modeChangeCount}), modesCount (${modesCount})`,
      )
    }
  }
}
