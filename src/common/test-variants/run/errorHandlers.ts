import type { Obj } from '@flemist/simple-utils'
import type { ArgsWithSeed } from 'src/common/test-variants/types'
import type { RunContext } from './RunContext'
import type { TestVariantsRunState } from './createRunState'

/** Handle error in sync execution mode */
export async function handleSyncError<Args extends Obj>(
  ctx: RunContext<Args>,
  state: TestVariantsRunState,
  args: ArgsWithSeed<Args>,
  error: unknown,
  tests: number,
): Promise<void> {
  const { variants, config } = ctx
  const { store, findBestError } = config

  if (findBestError) {
    variants.addLimit({ args, error, tests })
    if (store && variants.limit) {
      await store.save(variants.limit.args)
    }
    state.debug = false
  } else {
    if (store) {
      await store.save(args)
    }
    throw error
  }
}

/** Handle error in parallel execution mode */
export function handleParallelError<Args extends Obj>(
  ctx: RunContext<Args>,
  state: TestVariantsRunState,
  args: ArgsWithSeed<Args>,
  error: unknown,
  tests: number,
): void {
  const { variants, config, abortControllerParallel } = ctx
  const { store, findBestError } = config

  if (findBestError) {
    variants.addLimit({ args, error, tests })
    if (store && variants.limit) {
      void store.save(variants.limit.args)
    }
    state.debug = false
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
