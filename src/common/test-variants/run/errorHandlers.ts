import type { Obj } from '@flemist/simple-utils'
import type { AbortControllerFast } from '@flemist/abort-controller-fast'
import type {
  ArgsWithSeed,
  TestVariantsIterator,
  SaveErrorVariantsStore,
} from 'src/common/test-variants/types'
import type { TestVariantsRunState } from './createRunState'

export type ErrorHandlerDeps<Args extends Obj> = {
  variants: TestVariantsIterator<Args>
  store: SaveErrorVariantsStore<Args> | null
  abortControllerParallel: AbortControllerFast
  findBestError: boolean
}

/** Handle error in sync execution mode */
export async function handleSyncError<Args extends Obj>(
  deps: ErrorHandlerDeps<Args>,
  state: TestVariantsRunState,
  args: ArgsWithSeed<Args>,
  error: unknown,
): Promise<void> {
  const { variants, store, findBestError } = deps

  if (findBestError) {
    variants.addLimit({ args, error })
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
  deps: ErrorHandlerDeps<Args>,
  state: TestVariantsRunState,
  args: ArgsWithSeed<Args>,
  error: unknown,
): void {
  const { variants, store, abortControllerParallel, findBestError } = deps

  if (findBestError) {
    variants.addLimit({ args, error })
    if (store && variants.limit) {
      void store.save(variants.limit.args)
    }
    state.debug = false
    // Abort current cycle after first error - next cycle will use new limits
    // This prevents in-flight parallel tests from continuing to error and spam logs
    // Use explicit null reason to distinguish from real errors
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
