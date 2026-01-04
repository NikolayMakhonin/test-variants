import type { ITimeController } from '@flemist/time-controller'

/** Runtime state for test variants run */
export type TestVariantsRunState = {
  // Cycle tracking
  prevCycleVariantsCount: number | null
  prevCycleDuration: number | null
  startTime: number
  cycleStartTime: number

  // Memory tracking
  startMemory: number | null

  // Iteration state
  debug: boolean
  iterations: number
  iterationsAsync: number

  // Logging state
  prevLogTime: number
  prevLogMemory: number | null

  // GC tracking
  prevGC_Time: number
  prevGC_Iterations: number
  prevGC_IterationsAsync: number

  // Mode tracking
  prevModeIndex: number
  modeChanged: boolean

  // Time limit flag
  timeLimitExceeded: boolean
}

/** Create initial run state */
export function createRunState(
  timeController: ITimeController,
  startMemory: number | null,
): TestVariantsRunState {
  const startTime = timeController.now()

  return {
    prevCycleVariantsCount: null,
    prevCycleDuration: null,
    startTime,
    cycleStartTime: startTime,
    startMemory,
    debug: false,
    iterations: 0,
    iterationsAsync: 0,
    prevLogTime: startTime,
    prevLogMemory: startMemory,
    prevGC_Time: startTime,
    prevGC_Iterations: 0,
    prevGC_IterationsAsync: 0,
    prevModeIndex: -1,
    modeChanged: false,
    timeLimitExceeded: false,
  }
}
