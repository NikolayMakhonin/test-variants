import type { PromiseOrValue } from '@flemist/async-utils'
import type { Obj } from '@flemist/simple-utils'
import type { ArgsWithSeed } from 'src/common/test-variants/types'
import type { RunContext } from './RunContext'

function handleFindBestError<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
  error: unknown,
  tests: number,
  isParallel: boolean,
): PromiseOrValue<void> {
  const { variantsIterator, options, abortControllerParallel, state } =
    runContext
  const { store } = options

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
}

function handleFatalError<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
  error: unknown,
  isParallel: boolean,
): PromiseOrValue<void> {
  const { options, abortControllerParallel } = runContext
  const { store } = options

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

/**
 * Handle test error.
 *
 * In findBestError mode: adds limit to iterator, saves args, aborts parallel tests.
 * Without findBestError: saves args and throws error (or aborts with error in parallel).
 */
export function handleError<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
  error: unknown,
  tests: number,
  isParallel: boolean,
): PromiseOrValue<void> {
  if (runContext.options.findBestError) {
    return handleFindBestError(runContext, args, error, tests, isParallel)
  }
  return handleFatalError(runContext, args, error, isParallel)
}
