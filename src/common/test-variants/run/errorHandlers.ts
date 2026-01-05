import type { PromiseOrValue } from '@flemist/async-utils'
import type { Obj } from '@flemist/simple-utils'
import type { ArgsWithSeed } from 'src/common/test-variants/types'
import type { RunContext } from './RunContext'

/**
 * Handle test error. In sequential mode, awaits store.save and throws if not findBestError.
 * In parallel mode, fires store.save without awaiting and aborts via controller.
 */
export function handleError<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
  error: unknown,
  tests: number,
  isParallel: boolean,
): PromiseOrValue<void> {
  const { variantsIterator, options, abortControllerParallel, state } =
    runContext
  const { store, findBestError } = options

  if (findBestError) {
    variantsIterator.addLimit({ args, error, tests })
    const argsToSave = variantsIterator.limit?.args
    if (store && argsToSave) {
      if (isParallel) {
        void store.save(argsToSave)
      } else {
        return store.save(argsToSave).then(() => {
          state.debugMode = false
        })
      }
    }
    state.debugMode = false
    if (isParallel && !abortControllerParallel.signal.aborted) {
      abortControllerParallel.abort(null)
    }
    return
  }

  if (isParallel) {
    if (!abortControllerParallel.signal.aborted) {
      if (store) {
        void store.save(args)
      }
      abortControllerParallel.abort(error)
    }
    return
  }

  if (store) {
    return store.save(args).then(() => {
      throw error
    })
  }
  throw error
}
