import { isPromiseLike } from '@flemist/async-utils'
import type { RequiredNonNullable, Obj } from '@flemist/simple-utils'
import type {
  TestVariantsLogOptions,
  TestVariantsIterator,
  OnModeChangeCallback,
} from '../types'
import type { TestVariantsRunState } from './createRunState'
import { logModeChange } from './runLogger'

export type ModeChangeHandlerDeps<Args extends Obj> = {
  logOpts: RequiredNonNullable<TestVariantsLogOptions>
  onModeChange: OnModeChangeCallback | null | undefined
  variants: TestVariantsIterator<Args>
}

/** Handle mode change event */
export async function handleModeChange<Args extends Obj>(
  deps: ModeChangeHandlerDeps<Args>,
  state: TestVariantsRunState,
  logInitial: boolean,
): Promise<void> {
  const { logOpts, onModeChange, variants } = deps

  // Check if mode actually changed (or initial log)
  if (!logInitial && variants.modeIndex === state.prevModeIndex) {
    return
  }

  if (logOpts.debug && !logInitial) {
    logOpts.func(
      'debug',
      `[debug] mode switch: modeIndex=${variants.modeIndex}, index=${variants.index}`,
    )
  }

  state.modeChanged = true
  state.prevModeIndex = variants.modeIndex

  // Log mode change immediately for initial or when not during progress
  if (logInitial && logOpts.modeChange) {
    logModeChange(logOpts, variants.modeConfig, variants.modeIndex)
  }

  if (onModeChange && variants.modeConfig) {
    const result = onModeChange({
      mode: variants.modeConfig,
      modeIndex: variants.modeIndex,
      tests: state.iterations,
    })
    if (isPromiseLike(result)) {
      await result
    }
  }
}
