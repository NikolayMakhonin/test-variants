import type { ModeChangeEvent, TestVariantsRunOptions } from 'src/common'
import type { TimeControllerMock } from '@flemist/time-controller'
import type { TestArgs } from '../types'
import { MODES_DEFAULT } from '../constants'

/**
 * Validates time limit constraints
 *
 * ## Applicability
 * - Every mode change event
 * - Test completion
 *
 * ## Invariants
 * - Each mode's runtime ≤ its limitTime (if set)
 * - Total runtime ≤ global limitTime (if set)
 */
export class LimitTimeInvariant {
  private readonly _runOptions: TestVariantsRunOptions<TestArgs>
  private readonly _timeController: TimeControllerMock
  private readonly _startTime: number
  private _modeStartTime: number
  private _lastModeIndex = -1

  constructor(
    runOptions: TestVariantsRunOptions<TestArgs>,
    timeController: TimeControllerMock,
  ) {
    this._runOptions = runOptions
    this._timeController = timeController
    this._startTime = timeController.now()
    this._modeStartTime = this._startTime
  }

  /** Use in onModeChange callback */
  onModeChange(event: ModeChangeEvent): void {
    const now = this._timeController.now()
    const iterationModes = this._runOptions.iterationModes ?? MODES_DEFAULT

    // Validate previous mode's time limit (except for first mode change)
    if (this._lastModeIndex >= 0) {
      const prevMode = iterationModes[this._lastModeIndex]
      if (prevMode.limitTime != null) {
        const modeRuntime = now - this._modeStartTime
        if (modeRuntime > prevMode.limitTime) {
          throw new Error(
            `[test][LimitTimeInvariant] mode[${this._lastModeIndex}] runtime (${modeRuntime}ms) > limitTime (${prevMode.limitTime}ms)`,
          )
        }
      }
    }

    this._lastModeIndex = event.modeIndex
    this._modeStartTime = now
  }

  /** Run after test variants completion */
  validateFinal(): void {
    const now = this._timeController.now()
    const totalRuntime = now - this._startTime
    const iterationModes = this._runOptions.iterationModes ?? MODES_DEFAULT

    // Validate last mode's time limit
    if (this._lastModeIndex >= 0) {
      const lastMode = iterationModes[this._lastModeIndex]
      if (lastMode.limitTime != null) {
        const modeRuntime = now - this._modeStartTime
        if (modeRuntime > lastMode.limitTime) {
          throw new Error(
            `[test][LimitTimeInvariant] mode[${this._lastModeIndex}] runtime (${modeRuntime}ms) > limitTime (${lastMode.limitTime}ms)`,
          )
        }
      }
    }

    // Validate global time limit
    if (this._runOptions.limitTime != null) {
      if (totalRuntime > this._runOptions.limitTime) {
        throw new Error(
          `[test][LimitTimeInvariant] totalRuntime (${totalRuntime}ms) > limitTime (${this._runOptions.limitTime}ms)`,
        )
      }
    }
  }
}
