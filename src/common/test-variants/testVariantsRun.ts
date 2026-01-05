import { AbortControllerFast } from '@flemist/abort-controller-fast'
import { combineAbortSignals } from '@flemist/async-utils'
import type { Obj } from '@flemist/simple-utils'
import { Pool } from '@flemist/time-limits'
import { garbageCollect } from 'src/common/garbage-collect/garbageCollect'
import type { VariantsIterator } from './iterator/types'
import { getMemoryUsage } from './log/getMemoryUsage'
import { createRunResult } from './run/createRunResult'
import { createRunState } from './run/createRunState'
import { resolveRunOptions } from './run/resolveRunOptions'
import type { RunContext } from './run/RunContext'
import { runIterationLoop } from './run/runIterationLoop'
import { logStart, logCompleted } from './run/runLogger'
import type {
  TestVariantsTestRun,
  TestVariantsRunOptionsInternal,
} from './run/types'
import type { TestOptions, TestVariantsResult } from './types'

export async function testVariantsRun<Args extends Obj, SavedArgs = Args>(
  testRun: TestVariantsTestRun<Args>,
  variantsIterator: VariantsIterator<Args>,
  options?: null | TestVariantsRunOptionsInternal<Args, SavedArgs>,
): Promise<TestVariantsResult<Args>> {
  const optionsResolved = resolveRunOptions(options)
  const {
    store,
    logOptions,
    abortSignalExternal,
    findBestError,
    dontThrowIfError,
    timeController,
    parallel,
    limitTests,
  } = optionsResolved

  const abortControllerParallel = new AbortControllerFast()
  const abortSignal = combineAbortSignals(
    abortSignalExternal,
    abortControllerParallel.signal,
  )

  const testOptions: TestOptions = {
    abortSignal,
    timeController,
  }

  if (limitTests != null) {
    variantsIterator.addLimit({ index: limitTests })
  }

  if (store) {
    await store.replay({
      testRun,
      variantsIterator,
      testOptions,
      findBestErrorEnabled: !!findBestError,
    })
  }

  const startMemory = getMemoryUsage()
  const state = createRunState(timeController, startMemory)
  const pool = parallel <= 1 ? null : new Pool(parallel)

  logStart(logOptions, startMemory)

  const runContext: RunContext<Args> = {
    options: optionsResolved,
    testRun,
    variantsIterator,
    testOptions,
    abortControllerParallel,
    abortSignal,
    pool,
    state,
  }
  await runIterationLoop(runContext)

  if (abortSignal.aborted && abortSignal.reason != null) {
    throw abortSignal.reason
  }

  logCompleted(runContext)
  await garbageCollect(1)

  return createRunResult(state, variantsIterator, dontThrowIfError)
}
