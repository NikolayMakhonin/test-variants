import type { ITimeController } from '@flemist/time-controller'

/** Runtime state for test variants run */
export type RunState = {
  // Cycle tracking
  prevCycleVariantsCount: number | null
  prevCycleDuration: number | null
  startTime: number
  cycleStartTime: number

  // Memory tracking
  startMemory: number | null

  // Iteration state
  /** Few repeats of error variant if JS debugger is attached */
  debugMode: boolean
  /** Number of test function calls */
  tests: number
  /** Sum of iterationsSync + iterationsAsync from test results */
  iterations: number
  iterationsAsync: number

  // Logging state
  prevLogTime: number
  prevLogMemory: number | null

  // GC tracking
  prevGcTime: number
  prevGcIterations: number
  prevGcIterationsAsync: number

  // Mode tracking
  prevModeIndex: number
  modeChanged: boolean

  // Global limit flag (limitTime or limitTests exceeded)
  globalLimitExceeded: boolean
}

/** Create initial run state */
export function createRunState(
  timeController: ITimeController,
  startMemory: number | null,
): RunState {
  const startTime = timeController.now()

  return {
    prevCycleVariantsCount: null,
    prevCycleDuration: null,
    startTime,
    cycleStartTime: startTime,
    startMemory,
    debugMode: false,
    tests: 0,
    iterations: 0,
    iterationsAsync: 0,
    prevLogTime: startTime,
    prevLogMemory: startMemory,
    prevGcTime: startTime,
    prevGcIterations: 0,
    prevGcIterationsAsync: 0,
    prevModeIndex: -1,
    modeChanged: false,
    globalLimitExceeded: false,
  }
}
