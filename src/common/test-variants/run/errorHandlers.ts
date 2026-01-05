import type { Obj } from '@flemist/simple-utils'
import type { ArgsWithSeed } from 'src/common/test-variants/types'
import type { RunContext } from './RunContext'

/** Handle error in sync execution mode */
export async function handleSyncError<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
  error: unknown,
  tests: number,
): Promise<void> {
  const { variantsIterator, options, state } = runContext
  const { store, findBestError } = options

  if (findBestError) {
    variantsIterator.addLimit({ args, error, tests })
    if (store && variantsIterator.limit) {
      await store.save(variantsIterator.limit.args)
    }
    state.debugMode = false
  } else {
    if (store) {
      await store.save(args)
    }
    throw error
  }
}

/** Handle error in parallel execution mode */
export function handleParallelError<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
  error: unknown,
  tests: number,
): void {
  const { variantsIterator, options, abortControllerParallel, state } =
    runContext
  const { store, findBestError } = options

  if (findBestError) {
    variantsIterator.addLimit({ args, error, tests })
    if (store && variantsIterator.limit) {
      void store.save(variantsIterator.limit.args)
    }
    state.debugMode = false
    if (!abortControllerParallel.signal.aborted) {
      abortControllerParallel.abort(null)
    }
  } else if (!abortControllerParallel.signal.aborted) {
    if (store) {
      void store.save(args)
    }
    abortControllerParallel.abort(error)
  }
}
