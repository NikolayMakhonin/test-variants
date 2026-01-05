import type { TestOptions, TestVariantsResult } from './types'
import type { VariantsIterator } from './iterator/types'
import type {
  TestVariantsTestRun,
  TestVariantsRunOptionsInternal,
} from './run/types'
import { AbortControllerFast } from '@flemist/abort-controller-fast'
import { combineAbortSignals } from '@flemist/async-utils'
import { Pool } from '@flemist/time-limits'
import { garbageCollect } from 'src/common/garbage-collect/garbageCollect'
import type { Obj } from '@flemist/simple-utils'
import { getMemoryUsage } from './log/getMemoryUsage'
import { resolveRunConfig } from './run/resolveRunConfig'
import { createRunState } from './run/createRunState'
import { logStart, logCompleted } from './log/runLogger'
import { runIterationLoop } from './run/runIterationLoop'
import { createRunResult } from './run/createRunResult'
import type { RunContext } from './run/RunContext'

export async function testVariantsRun<Args extends Obj, SavedArgs = Args>(
  testRun: TestVariantsTestRun<Args>,
  variantsIterator: VariantsIterator<Args>,
  options?: null | TestVariantsRunOptionsInternal<Args, SavedArgs>,
): Promise<TestVariantsResult<Args>> {
  // Setup
  const config = resolveRunConfig(options)
  const {
    store,
    logOptions,
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

  const testOptions: TestOptions = {
    abortSignal,
    timeController,
  }

  // Apply initial limits
  if (limitTests != null) {
    variantsIterator.addLimit({ index: limitTests })
  }

  // Replay saved error variants
  if (store) {
    await store.replay({
      testRun,
      variantsIterator,
      testOptions,
      findBestErrorEnabled: !!findBestError,
    })
  }

  // Initialize state
  const startMemory = getMemoryUsage()
  const state = createRunState(timeController, startMemory)
  const pool = parallel <= 1 ? null : new Pool(parallel)

  logStart(logOptions, startMemory)

  // Run iteration loop
  const runContext: RunContext<Args> = {
    config,
    testRun,
    variantsIterator,
    testOptions,
    abortControllerParallel,
    abortSignal,
    pool,
    state,
  }
  await runIterationLoop(runContext)

  // Cleanup
  if (abortSignal?.aborted && abortSignal.reason != null) {
    throw abortSignal.reason
  }

  logCompleted(logOptions, timeController, state)
  await garbageCollect(1)

  return createRunResult(state, variantsIterator, dontThrowIfError)
}
