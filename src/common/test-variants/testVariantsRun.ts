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
import { AbortErrorSilent } from 'src/common/test-variants/run/AbortErrorSilent'

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
  } = optionsResolved

  const abortControllerGlobal = new AbortControllerFast()
  const abortControllerParallel = new AbortControllerFast()
  const abortSignalGlobal = combineAbortSignals(
    abortSignalExternal,
    abortControllerGlobal.signal,
  )
  const abortSignalParallel = combineAbortSignals(
    abortSignalGlobal,
    abortControllerParallel.signal,
  )

  const testOptions: TestOptions = {
    abortSignal: abortSignalGlobal,
    timeController,
  }

  const testOptionsParallel: TestOptions = {
    abortSignal: abortSignalParallel,
    timeController,
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
    testOptionsParallel,
    abortControllerGlobal,
    abortControllerParallel,
    abortSignal: abortSignalParallel,
    pool,
    state,
  }

  try {
    await runIterationLoop(runContext)
  } catch (error) {
    abortControllerGlobal.abort(new AbortErrorSilent())
    throw error
  }

  abortSignalGlobal.throwIfAborted()
  abortControllerGlobal.abort(new AbortErrorSilent())

  logCompleted(runContext)
  await garbageCollect(1)

  return createRunResult(state, variantsIterator, dontThrowIfError)
}
