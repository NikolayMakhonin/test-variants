import type { ModeChangeEvent, ModeConfig } from 'src/common'
import type { CallController } from '../helpers/CallController'

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
 * - tests parameter >= 0
 * - tests parameter increases monotonically
 * - tests parameter ~= completedCount (within parallelLimit + 1 tolerance for in-flight tests)
 */
export class OnModeChangeInvariant {
  private _modeChangeCount = 0
  private _lastTests = -1
  private readonly _iterationModes: readonly ModeConfig[]
  private readonly _callController: CallController
  private readonly _parallelLimit: number

  constructor(
    iterationModes: readonly ModeConfig[],
    callController: CallController,
    parallelLimit: number,
  ) {
    this._iterationModes = iterationModes
    this._callController = callController
    this._parallelLimit = parallelLimit
  }

  onModeChange(event: ModeChangeEvent): void {
    this._modeChangeCount++

    if (event.tests < 0) {
      throw new Error(`[test][OnModeChangeInvariant] tests ${event.tests} < 0`)
    }

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

    // Validate tests vs completedCount
    // Library counts completed tests, our completedCount counts completed mock calls
    // These should match closely, with tolerance for in-flight parallel tests
    const completedCount = this._callController.completedCount
    const tolerance = this._parallelLimit + 1
    if (event.tests > completedCount + tolerance) {
      throw new Error(
        `[test][OnModeChangeInvariant] tests ${event.tests} > completedCount ${completedCount} + tolerance ${tolerance}`,
      )
    }
    if (event.tests < completedCount - tolerance) {
      throw new Error(
        `[test][OnModeChangeInvariant] tests ${event.tests} < completedCount ${completedCount} - tolerance ${tolerance}`,
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
