import type { TestVariantsTestOptions, TestVariantsTestRun } from './types'
import { AbortControllerFast } from '@flemist/abort-controller-fast'
import { combineAbortSignals } from '@flemist/async-utils'
import { Pool } from '@flemist/time-limits'
import { garbageCollect } from 'src/common/garbage-collect/garbageCollect'
import type { Obj } from '@flemist/simple-utils'
import type {
  TestVariantsIterator,
  TestVariantsRunOptionsInternal,
  TestVariantsResult,
} from './types'
import { getMemoryUsage } from './helpers/getMemoryUsage'
import { resolveRunConfig } from './helpers/resolveRunConfig'
import { createRunState } from './helpers/createRunState'
import { logStart, logCompleted } from './helpers/runLogger'
import { runIterationLoop } from './helpers/runIterationLoop'
import { createRunResult } from './helpers/createRunResult'
import type { RunContext } from './helpers/RunContext'

export async function testVariantsRun<Args extends Obj, SavedArgs = Args>(
  testRun: TestVariantsTestRun<Args>,
  variants: TestVariantsIterator<Args>,
  options?: null | TestVariantsRunOptionsInternal<Args, SavedArgs>,
): Promise<TestVariantsResult<Args>> {
  // Setup
  const config = resolveRunConfig(options)
  const {
    store,
    logOpts,
    abortSignalExternal,
    findBestError,
    dontThrowIfError,
    timeController,
    parallel,
    limitTests,
  } = config

  const abortControllerParallel = new AbortControllerFast()
  const abortSignal = combineAbortSignals(
    abortSignalExternal,
    abortControllerParallel.signal,
  )

  const testOptions: TestVariantsTestOptions = {
    abortSignal,
    timeController,
  }

  // Apply initial limits
  if (limitTests != null) {
    variants.addLimit({ index: limitTests })
  }

  // Replay saved error variants
  if (store) {
    await store.replay({
      testRun,
      variants,
      testOptions,
      findBestErrorEnabled: !!findBestError,
    })
  }

  // Initialize state
  const startMemory = getMemoryUsage()
  const state = createRunState(timeController, startMemory)
  const pool = parallel <= 1 ? null : new Pool(parallel)

  logStart(logOpts, startMemory)

  // Run iteration loop
  const ctx: RunContext<Args> = {
    config,
    testRun,
    variants,
    testOptions,
    abortControllerParallel,
    abortSignal,
    pool,
    state,
  }
  await runIterationLoop(ctx)

  // Cleanup
  if (abortSignal?.aborted && abortSignal.reason != null) {
    throw abortSignal.reason
  }

  logCompleted(logOpts, timeController, state)
  await garbageCollect(1)

  return createRunResult(state, variants, findBestError, dontThrowIfError)
}
