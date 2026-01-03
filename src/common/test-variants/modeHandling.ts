import type { Obj } from '@flemist/simple-utils'
import type {
  BackwardModeConfig,
  ForwardModeConfig,
  ModeConfig,
  TestVariantsTemplate,
  LimitArgOnError,
} from 'src/common/test-variants/types'
import type { NavigationState } from 'src/common/test-variants/variantNavigation'
import {
  advanceVariant,
  randomPickVariant,
  resetIterationPositionToEnd,
  resetIterationPositionToStart,
  retreatVariant,
} from 'src/common/test-variants/variantNavigation'

/** State per mode */
export type ModeState = {
  /** Saved position for sequential modes; null if not interrupted */
  savedPosition: {
    indexes: number[]
    repeatIndex: number
    cycle: number
  } | null
  /** Total completed cycles */
  completedCount: number
  /** Picks in current round */
  pickCount: number
  /** Start time of current round */
  startTime: number
  /** Cycle within current round (0-based) */
  cycle: number
  /** Whether mode executed at least 1 test in current outer cycle */
  hadProgressInCycle: boolean
  /** Progress flag from previous cycle (saved before reset in start()) */
  hadProgressInPreviousCycle: boolean
}

/** Check if mode is sequential (forward or backward) */
export function isSequentialMode(
  modeConfig: ModeConfig,
): modeConfig is ForwardModeConfig | BackwardModeConfig {
  return modeConfig.mode === 'forward' || modeConfig.mode === 'backward'
}

/** Get attemptsPerVariant for mode; returns 1 for random mode */
export function getModeRepeatsPerVariant(modeConfig: ModeConfig): number {
  if (isSequentialMode(modeConfig)) {
    return modeConfig.attemptsPerVariant ?? 1
  }
  return 1
}

/** Get cycles for sequential modes; returns 1 for random mode */
export function getModeCycles(modeConfig: ModeConfig): number {
  if (isSequentialMode(modeConfig)) {
    return modeConfig.cycles ?? 1
  }
  return 1
}

/** Check if current mode has reached its limits */
export function isModeExhausted(
  modeConfig: ModeConfig,
  modeState: ModeState,
  now: number,
): boolean {
  if (
    getModeRepeatsPerVariant(modeConfig) <= 0 ||
    getModeCycles(modeConfig) <= 0
  ) {
    return true
  }
  if (
    modeConfig.limitTests != null &&
    modeState.pickCount >= modeConfig.limitTests
  ) {
    return true
  }
  if (
    modeConfig.limitTime != null &&
    now - modeState.startTime >= modeConfig.limitTime
  ) {
    return true
  }
  return false
}

/** Handle empty template cycling for sequential modes; returns true if should yield variant */
function handleEmptyTemplateCycle(
  modeState: ModeState,
  index: number,
  cycles: number,
): boolean {
  if (cycles <= 0) {
    return false
  }
  if (index < 0) {
    return true
  }
  if (modeState.cycle + 1 < cycles) {
    modeState.cycle++
    return true
  }
  return false
}

/** Advance in forward mode handling cycles; returns true if successful */
export function advanceForwardMode<Args extends Obj>(
  state: NavigationState<Args>,
  modeState: ModeState,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  cycles: number,
  index: number,
): boolean {
  if (keysCount === 0) {
    return handleEmptyTemplateCycle(modeState, index, cycles)
  }
  if (advanceVariant(state, templates, keys, keysCount)) {
    return true
  }
  if (modeState.cycle + 1 < cycles) {
    modeState.cycle++
    resetIterationPositionToStart(state, templates, keys, keysCount)
    return advanceVariant(state, templates, keys, keysCount)
  }
  return false
}

/** Advance in backward mode handling cycles; returns true if successful */
export function advanceBackwardMode<Args extends Obj>(
  state: NavigationState<Args>,
  modeState: ModeState,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  cycles: number,
  index: number,
): boolean {
  if (keysCount === 0) {
    return handleEmptyTemplateCycle(modeState, index, cycles)
  }
  if (state.indexes[0] < 0) {
    return resetIterationPositionToEnd(state, templates, keys, keysCount)
  }
  if (retreatVariant(state, templates, keys, keysCount)) {
    return true
  }
  if (modeState.cycle + 1 < cycles) {
    modeState.cycle++
    return resetIterationPositionToEnd(state, templates, keys, keysCount)
  }
  return false
}

/** Advance variant based on mode type; returns true if successful */
export function advanceByMode<Args extends Obj>(
  modeConfig: ModeConfig,
  state: NavigationState<Args>,
  modeState: ModeState,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  index: number,
  limitArgOnError?: null | boolean | LimitArgOnError,
): boolean {
  if (modeConfig.mode === 'random') {
    return randomPickVariant(state, templates, keys, keysCount, limitArgOnError)
  }
  if (modeConfig.mode === 'backward') {
    return advanceBackwardMode(
      state,
      modeState,
      templates,
      keys,
      keysCount,
      getModeCycles(modeConfig),
      index,
    )
  }
  return advanceForwardMode(
    state,
    modeState,
    templates,
    keys,
    keysCount,
    getModeCycles(modeConfig),
    index,
  )
}

/** Create initial mode state */
export function createModeState(): ModeState {
  return {
    savedPosition: null,
    completedCount: 0,
    pickCount: 0,
    startTime: 0,
    cycle: 0,
    hadProgressInCycle: false,
    hadProgressInPreviousCycle: true,
  }
}
