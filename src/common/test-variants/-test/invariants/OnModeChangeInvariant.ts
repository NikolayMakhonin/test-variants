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
 * - onModeChange called at least once even if no tests run (library starts iteration)
 * - mode parameter is valid ModeConfig from iterationModes
 * - modeIndex parameter is within range
 * - modeIndex sequence is valid (cycles through modes in order)
 * - tests parameter >= 0
 * - tests parameter increases monotonically
 * - tests parameter ~= completedCount (within parallelLimit + 1 tolerance for in-flight tests)
 * - All modes in iterationModes are used at least once if tests run long enough
 * - Mode changes count matches expected patterns
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

    // Validate mode index sequence
    // Modes cycle in order: 0 → 1 → 2 → ... → N-1 → 0 → 1 → ...
    if (this._lastModeIndex >= 0) {
      const expectedNextIndex =
        (this._lastModeIndex + 1) % this._iterationModes.length
      if (event.modeIndex !== expectedNextIndex) {
        throw new Error(
          `[test][OnModeChangeInvariant] modeIndex ${event.modeIndex} does not follow expected sequence (previous=${this._lastModeIndex}, expected=${expectedNextIndex})`,
        )
      }
    } else {
      // First mode change must be index 0
      if (event.modeIndex !== 0) {
        throw new Error(
          `[test][OnModeChangeInvariant] first modeIndex ${event.modeIndex} !== 0`,
        )
      }
    }

    // Track which modes were used
    this._modeUsed[event.modeIndex] = true

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
    this._lastModeIndex = event.modeIndex
  }

  validateFinal(): void {
    const completedCount = this._callController.completedCount
    const modesCount = this._iterationModes.length

    // Validate minimum mode changes
    // onModeChange is ALWAYS called at start (before first test), so modeChangeCount >= 1
    if (this._modeChangeCount === 0) {
      throw new Error(
        `[test][OnModeChangeInvariant] modeChangeCount is 0 - callback never called (library bug or not wired)`,
      )
    }

    // With single mode: exactly 1 mode change (at start)
    if (modesCount === 1) {
      if (this._modeChangeCount !== 1) {
        throw new Error(
          `[test][OnModeChangeInvariant] single mode but modeChangeCount=${this._modeChangeCount} !== 1`,
        )
      }
    }

    // With multiple modes: at least 1, at most completedCount + modesCount
    // (can switch mode on every test completion + initial mode + final incomplete cycle)
    if (modesCount > 1) {
      const maxPossible = completedCount + modesCount
      if (this._modeChangeCount > maxPossible) {
        throw new Error(
          `[test][OnModeChangeInvariant] modeChangeCount ${this._modeChangeCount} > max possible ${maxPossible} (completedCount=${completedCount}, modesCount=${modesCount})`,
        )
      }
    }

    // If we completed full cycles through all modes, verify all modes were used
    // A full cycle means: visited all modes at least once
    const fullCycles = Math.floor(this._modeChangeCount / modesCount)
    if (fullCycles >= 1) {
      for (let i = 0; i < modesCount; i++) {
        if (!this._modeUsed[i]) {
          throw new Error(
            `[test][OnModeChangeInvariant] completed ${fullCycles} full cycles but mode[${i}] was never used`,
          )
        }
      }
    }

    // Validate last mode index is consistent with total changes
    // After N mode changes, we should be at index (N-1) % modesCount
    const expectedLastIndex = (this._modeChangeCount - 1) % modesCount
    if (this._lastModeIndex !== expectedLastIndex) {
      throw new Error(
        `[test][OnModeChangeInvariant] lastModeIndex ${this._lastModeIndex} !== expected ${expectedLastIndex} (modeChangeCount=${this._modeChangeCount}, modesCount=${modesCount})`,
      )
    }
  }
}
