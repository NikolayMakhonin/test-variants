import type { Obj } from '@flemist/simple-utils'
import { timeControllerDefault } from '@flemist/time-controller'
import type {
  GetSeedParams,
  ModeConfig,
  TestVariantsIterator,
  TestVariantsIteratorOptions,
  TestVariantsTemplate,
} from 'src/common/test-variants/types'
import {
  calcTemplateValues,
  resetIterationPositionToStart,
} from 'src/common/test-variants/variantNavigation'
import {
  createLimit,
  extendTemplatesForArgs,
  type LimitState,
  processPendingLimits,
  updateArgLimits,
  validateArgsKeys,
} from 'src/common/test-variants/limitHandling'
import {
  advanceByMode,
  createModeState,
  getModeRepeatsPerVariant,
  isModeExhausted,
  isSequentialMode,
  type ModeState,
} from 'src/common/test-variants/modeHandling'
import { log } from 'src/common/helpers/log'

/** Iterator internal state; extends LimitState with additional iterator-specific fields */
type IteratorState<Args extends Obj> = LimitState<Args> & {
  /** Number of full passes through all variants */
  cycleIndex: number
  /** Total tests yielded (including attemptsPerVariant), used for getSeed */
  testsCount: number
  /** Whether count was set by explicit addLimit call (not by mode exhaustion) */
  countIsExplicit: boolean
  started: boolean
  currentArgs: Args | null
  /** Mode configurations */
  modes: ModeConfig[]
  /** Current mode index */
  modeIndex: number
  /** State per mode */
  modesState: ModeState[]
}

/** Reset iterator state for new external cycle (via start()) */
function resetIteratorState<Args extends Obj>(
  state: IteratorState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
): void {
  state.index = -1
  state.testsCount = 0
  resetIterationPositionToStart(state, templates, keys, keysCount)
}

/** Default modes: single forward pass */
const DEFAULT_MODES: ModeConfig[] = [{ mode: 'forward' }]

/** Save current position for a sequential mode */
function saveModePosition<Args extends Obj>(
  state: IteratorState<Args>,
  modeIndex: number,
  keysCount: number,
): void {
  const indexes: number[] = []
  for (let i = 0; i < keysCount; i++) {
    indexes[i] = state.indexes[i]
  }
  const modeState = state.modesState[modeIndex]
  modeState.savedPosition = {
    indexes,
    repeatIndex: state.repeatIndex,
    cycle: modeState.cycle,
  }
}

/** Try to restore saved position; returns true if successful, false if position is invalid */
function tryRestoreSavedPosition<Args extends Obj>(
  saved: { indexes: number[]; repeatIndex: number; cycle: number },
  state: IteratorState<Args>,
  modeState: ModeState,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
): boolean {
  // Clear args before reconstruction
  for (let i = 0; i < keysCount; i++) {
    delete state.args[keys[i]]
  }

  // Reconstruct args from saved indexes, validating each step
  for (let i = 0; i < keysCount; i++) {
    const savedIndex = saved.indexes[i]
    const values = calcTemplateValues(state, templates, state.args, i)

    // Validate: index must be within template and limits
    if (savedIndex < 0 || savedIndex >= values.length) {
      return false
    }
    const limit = state.argLimits[i]
    if (limit != null && savedIndex > limit) {
      return false
    }

    state.indexes[i] = savedIndex
    state.argValues[i] = values
    state.args[keys[i]] = values[savedIndex]
  }

  state.repeatIndex = saved.repeatIndex
  modeState.cycle = saved.cycle
  return true
}

/** Switch to next mode; optionally saves current position and resets mode state */
function switchToNextMode<Args extends Obj>(
  state: IteratorState<Args>,
  templates: TestVariantsTemplate<Args, any>[],
  keys: (keyof Args)[],
  keysCount: number,
  savePosition: boolean,
  now: number,
  logDebug?: null | boolean,
): void {
  const currentModeIndex = state.modeIndex
  const currentMode = state.modes[currentModeIndex]
  const currentModeState = state.modesState[currentModeIndex]

  if (logDebug) {
    log(
      `[debug:iter] switchToNextMode: mode[${currentModeIndex}]=${currentMode?.mode}, savePosition=${savePosition}, pickCount=${currentModeState?.pickCount}, hadProgressInCycle=${currentModeState?.hadProgressInCycle}`,
    )
  }

  // For sequential modes: save position when interrupted by limits (only if made progress), clear when naturally completed
  // completedCount increments when mode ran tests in this cycle OR had saved position from previous rounds
  if (currentMode && isSequentialMode(currentMode)) {
    if (savePosition && currentModeState.hadProgressInCycle) {
      // Only save position if mode actually yielded tests; otherwise nothing to resume
      saveModePosition(state, currentModeIndex, keysCount)
      if (logDebug) {
        log(
          `[debug:iter] saved position for mode[${currentModeIndex}], completedCount stays ${currentModeState.completedCount}`,
        )
      }
    } else {
      // Mode completed naturally - count if made progress:
      // - hadProgressInCycle: yielded at least one variant this entry
      // - savedPosition != null: had progress from previous entries (position was saved, meaning tests were yielded before interruption)
      const hadProgress =
        currentModeState.hadProgressInCycle ||
        currentModeState.savedPosition != null
      currentModeState.savedPosition = null
      if (hadProgress) {
        currentModeState.completedCount++
        if (logDebug) {
          log(
            `[debug:iter] mode[${currentModeIndex}] completed naturally, completedCount++ → ${currentModeState.completedCount}`,
          )
        }
      } else if (logDebug) {
        log(
          `[debug:iter] mode[${currentModeIndex}] completed but no progress, completedCount stays ${currentModeState.completedCount}`,
        )
      }
    }
  }
  // Random mode: completedCount increments per-pick in next() only when variant is yielded
  // No additional increment needed here - random mode counts each pick, not pass completions

  state.modeIndex++
  if (logDebug) {
    log(`[debug:iter] modeIndex++ → ${state.modeIndex}`)
  }
  if (state.modeIndex < state.modes.length) {
    const nextModeState = state.modesState[state.modeIndex]
    nextModeState.pickCount = 0
    nextModeState.startTime = now

    const nextMode = state.modes[state.modeIndex]
    if (isSequentialMode(nextMode)) {
      // Reset state, then try to restore saved position
      resetIteratorState(state, templates, keys, keysCount)
      const saved = nextModeState.savedPosition
      if (saved) {
        tryRestoreSavedPosition(
          saved,
          state,
          nextModeState,
          templates,
          keys,
          keysCount,
        )
        // If restore failed, state remains in fresh position from resetIteratorState
        if (logDebug) {
          log(`[debug:iter] restored position for mode[${state.modeIndex}]`)
        }
      } else {
        nextModeState.cycle = 0
      }
    } else {
      nextModeState.cycle = 0
    }
  } else if (logDebug) {
    log(
      `[debug:iter] all modes exhausted, modeIndex=${state.modeIndex} >= modes.length=${state.modes.length}`,
    )
  }
}

/** Creates test variants iterator with limiting capabilities */
export function testVariantsIterator<Args extends Obj>(
  options: TestVariantsIteratorOptions<Args>,
): TestVariantsIterator<Args> {
  const {
    argsTemplates,
    getSeed,
    equals,
    limitArgOnError,
    includeErrorVariant,
    logDebug,
  } = options
  const modes = options.iterationModes ?? DEFAULT_MODES
  const timeController = options.timeController ?? timeControllerDefault
  const keys = Object.keys(argsTemplates) as (keyof Args)[]
  const templates: TestVariantsTemplate<Args, any>[] =
    Object.values(argsTemplates)
  const keysCount = keys.length
  const keySet = new Set(keys as string[])

  // Initialize state
  const indexes: number[] = []
  const argValues: any[][] = []
  const argLimits: (number | null)[] = []
  const extraValues: (any[] | null)[] = []
  for (let i = 0; i < keysCount; i++) {
    indexes[i] = -1
    argValues[i] = []
    argLimits[i] = null
    extraValues[i] = null
  }

  // Initialize modesState for all modes
  const modesState: ModeState[] = []
  for (let i = 0; i < modes.length; i++) {
    modesState[i] = createModeState()
  }

  const state: IteratorState<Args> = {
    args: {} as Args,
    indexes,
    argValues,
    argLimits,
    extraValues,
    index: -1,
    cycleIndex: -1,
    repeatIndex: 0,
    testsCount: 0,
    count: null,
    countIsExplicit: false,
    limit: null,
    started: false,
    currentArgs: null,
    pendingLimits: [],
    modes,
    modeIndex: 0,
    modesState,
  }

  // Pre-allocated object for getSeed params - mutated and reused on each call
  // Safe because getSeed is expected to extract values immediately (per README examples)
  const seedParams: GetSeedParams = { tests: 0, cycles: 0, repeats: 0 }

  function buildCurrentArgs(): Args {
    if (getSeed) {
      seedParams.tests = state.testsCount
      seedParams.cycles = state.cycleIndex
      seedParams.repeats = state.repeatIndex
      const seed = getSeed(seedParams)
      return { ...state.args, seed } as Args
    }
    return { ...state.args }
  }

  const iterator: TestVariantsIterator<Args> = {
    get index() {
      return state.index
    },
    get cycleIndex() {
      return state.cycleIndex
    },
    get count() {
      return state.count
    },
    get limit() {
      return state.limit
    },
    get modeIndex() {
      return state.modeIndex
    },
    get modeConfig() {
      return state.modes[state.modeIndex] ?? null
    },
    get minCompletedCount() {
      if (state.modesState.length === 0) {
        if (logDebug) {
          log(`[debug:iter] minCompletedCount: no modes, returning Infinity`)
        }
        return Infinity
      }
      // Use hadProgressInPreviousCycle because this getter is called AFTER start() resets hadProgressInCycle
      // Only count modes that made progress in the previous cycle
      // Modes with no progress are stuck and should not block min calculation
      let min = Infinity
      let anyModeHadProgress = false
      for (let i = 0; i < state.modesState.length; i++) {
        const modeState = state.modesState[i]
        if (logDebug) {
          log(
            `[debug:iter] mode[${i}]: hadProgressInPreviousCycle=${modeState.hadProgressInPreviousCycle}, completedCount=${modeState.completedCount}`,
          )
        }
        if (modeState.hadProgressInPreviousCycle) {
          anyModeHadProgress = true
          if (modeState.completedCount < min) {
            min = modeState.completedCount
          }
        }
      }
      // If no mode made progress in previous cycle, iteration is stuck → return Infinity to exit
      // Initial state has hadProgressInPreviousCycle = true to allow first cycle to start
      if (!anyModeHadProgress) {
        if (logDebug) {
          log(
            `[debug:iter] minCompletedCount: no mode had progress, returning Infinity`,
          )
        }
        return Infinity
      }
      if (logDebug) {
        log(`[debug:iter] minCompletedCount: returning ${min}`)
      }
      return min
    },
    addLimit(options) {
      const hasArgs = options?.args != null
      const hasIndex = options?.index != null

      // addLimit() or addLimit({error}) - uses current args and index
      if (!hasArgs && !hasIndex) {
        if (state.index < 0) {
          throw new Error(
            '[testVariantsIterator] addLimit() requires at least one next() call',
          )
        }
        const oldLimitArgs = state.limit?.args ?? null
        const isEarlierIndex = state.count == null || state.index < state.count
        // Pass state.indexes directly to avoid recalculating indexes via calcArgIndexes
        // This fixes the bug where dynamic templates create new object instances that fail === comparison
        const updated = updateArgLimits(
          state,
          state.args,
          oldLimitArgs,
          templates,
          keys,
          keysCount,
          equals,
          limitArgOnError,
          state.indexes,
        )

        if (updated) {
          // Lexicographically smaller - update limit and add pending for next cycle
          const limit = createLimit(state.currentArgs, options?.error)
          state.limit = limit
          state.pendingLimits.push(limit)
          if (isEarlierIndex) {
            state.count = includeErrorVariant ? state.index + 1 : state.index
            state.countIsExplicit = true
          }
        } else if (isEarlierIndex) {
          // Earlier index but not lexicographically smaller (or limitArgOnError disabled)
          state.count = includeErrorVariant ? state.index + 1 : state.index
          state.countIsExplicit = true
          state.limit = createLimit(state.currentArgs, options?.error)
        }
        return
      }

      // addLimit({index}) - only index limiting
      if (hasIndex && !hasArgs) {
        if (state.count == null || options.index < state.count) {
          state.count = options.index
          state.countIsExplicit = true
        }
        return
      }

      // addLimit({args}) or addLimit({args, error}) - pending limit + immediate per-arg limits
      if (hasArgs && !hasIndex) {
        if (!validateArgsKeys(options.args, keySet, keysCount)) {
          return
        }
        // Extend templates with missing values from saved args
        extendTemplatesForArgs(
          state,
          options.args,
          templates,
          keys,
          keysCount,
          equals,
        )
        const oldLimitArgs = state.limit?.args ?? null
        const updated = updateArgLimits(
          state,
          options.args,
          oldLimitArgs,
          templates,
          keys,
          keysCount,
          equals,
          limitArgOnError,
        )
        if (updated) {
          const limit = createLimit(options.args, options.error)
          state.limit = limit
          state.pendingLimits.push(limit)
        } else if (!limitArgOnError) {
          // When limitArgOnError is false, still set state.limit for error retrieval
          // and add to pendingLimits for next cycle index limiting
          const limit = createLimit(options.args, options.error)
          if (state.limit == null) {
            state.limit = limit
          }
          state.pendingLimits.push(limit)
        }
        return
      }

      // addLimit({args, index}) or addLimit({args, index, error}) - immediate index + pending args
      if (hasArgs && hasIndex) {
        const isEarliest = state.count == null || options.index < state.count
        if (isEarliest) {
          state.count = options.index
        }
        if (!validateArgsKeys(options.args, keySet, keysCount)) {
          return
        }
        // Extend templates with missing values from saved args
        extendTemplatesForArgs(
          state,
          options.args,
          templates,
          keys,
          keysCount,
          equals,
        )
        if (isEarliest) {
          const oldLimitArgs = state.limit?.args ?? null
          state.limit = createLimit(options.args, options.error)
          updateArgLimits(
            state,
            options.args,
            oldLimitArgs,
            templates,
            keys,
            keysCount,
            equals,
            limitArgOnError,
          )
        }
      }
    },
    start() {
      // Do NOT increment completedCount for interrupted modes here
      // Completion only counts when mode naturally finishes all variants
      // Modes interrupted by count limit (error found) should not count as completed

      // Save progress flags before resetting (used by minCompletedCount which is checked after start())
      // On first start (cycleIndex = -1), keep initial hadProgressInPreviousCycle = true to allow loop entry
      // On subsequent starts, save current progress before resetting
      for (let i = 0; i < state.modesState.length; i++) {
        if (state.cycleIndex >= 0) {
          state.modesState[i].hadProgressInPreviousCycle =
            state.modesState[i].hadProgressInCycle
        }
        state.modesState[i].hadProgressInCycle = false
      }

      state.cycleIndex++
      // Reset count for new cycle unless:
      // 1. count was explicitly set by addLimit({index}), OR
      // 2. there's an error limit set (constrains future cycles in findBestError mode)
      if (!state.countIsExplicit && !state.limit?.error) {
        state.count = null
      }
      resetIteratorState(state, templates, keys, keysCount)
      state.modeIndex = 0
      if (state.modesState.length > 0) {
        const mode0State = state.modesState[0]
        mode0State.pickCount = 0
        mode0State.startTime = timeController.now()

        // Restore saved position for mode 0 if it exists (was interrupted by limit previously)
        const mode0 = state.modes[0]
        if (mode0 && isSequentialMode(mode0)) {
          const saved = mode0State.savedPosition
          if (saved) {
            tryRestoreSavedPosition(
              saved,
              state,
              mode0State,
              templates,
              keys,
              keysCount,
            )
          } else {
            mode0State.cycle = 0
          }
        } else {
          mode0State.cycle = 0
        }
      }
      state.started = true
    },
    next() {
      if (!state.started) {
        throw new Error(
          '[testVariantsIterator] start() must be called before next()',
        )
      }

      // Check if all modes exhausted
      if (state.modeIndex >= state.modes.length) {
        if (state.count == null) {
          state.count = state.index + 1
        }
        return null
      }

      const now = timeController.now()
      const modeConfig = state.modes[state.modeIndex]
      const modeState = state.modesState[state.modeIndex]
      const attemptsPerVariant = getModeRepeatsPerVariant(modeConfig)

      // Try next repeat for current variant
      if (state.index >= 0 && state.repeatIndex + 1 < attemptsPerVariant) {
        if (state.count == null || state.index < state.count) {
          state.repeatIndex++
          modeState.pickCount++
          modeState.hadProgressInCycle = true
          state.currentArgs = buildCurrentArgs()
          state.testsCount++
          return state.currentArgs
        }
      }

      // Check if current mode is exhausted - switch to next mode (save position since interrupted by limit)
      if (isModeExhausted(modeConfig, modeState, now)) {
        if (logDebug) {
          log(
            `[debug:iter] mode exhausted (limits): mode[${state.modeIndex}]=${modeConfig.mode}, limitTests=${modeConfig.limitTests}, pickCount=${modeState.pickCount}`,
          )
        }
        switchToNextMode(state, templates, keys, keysCount, true, now, logDebug)
        return this.next()
      }

      // Move to next variant based on current mode
      state.repeatIndex = 0
      const success = advanceByMode(
        modeConfig,
        state,
        modeState,
        templates,
        keys,
        keysCount,
        state.index,
        limitArgOnError,
      )

      if (!success) {
        // Current mode naturally completed - switch to next mode (don't save position)
        if (logDebug) {
          log(
            `[debug:iter] mode completed naturally: mode[${state.modeIndex}]=${modeConfig.mode}, cycle=${modeState.cycle}, index=${state.index}`,
          )
        }
        switchToNextMode(
          state,
          templates,
          keys,
          keysCount,
          false,
          now,
          logDebug,
        )
        return this.next()
      }

      state.index++
      modeState.pickCount++

      // Process pending limits at new position
      if (state.pendingLimits.length > 0) {
        processPendingLimits(
          state,
          templates,
          keys,
          keysCount,
          equals,
          limitArgOnError,
          includeErrorVariant,
        )
      }

      // Check count limit - end cycle (count is a global limit, not per-mode)
      if (state.count != null && state.index >= state.count) {
        if (logDebug) {
          log(
            `[debug:iter] count limit reached: index=${state.index} >= count=${state.count}`,
          )
        }
        // Only count completion if mode actually yielded tests in this cycle
        // README: "If in the last pass any mode executed zero tests, it is not counted in termination condition check"
        if (modeState.hadProgressInCycle) {
          modeState.completedCount++
        }
        // Mark all modes as exhausted for this cycle
        state.modeIndex = state.modes.length
        return null
      }
      // For random mode: each yielded pick = 1 completed cycle
      if (modeConfig.mode === 'random') {
        modeState.completedCount++
      }

      // Mark progress only when we actually return a test variant
      // README: "If in the last pass any mode executed zero tests, it is not counted in termination condition check"
      modeState.hadProgressInCycle = true
      state.currentArgs = buildCurrentArgs()
      state.testsCount++
      return state.currentArgs
    },
  }

  return iterator
}
