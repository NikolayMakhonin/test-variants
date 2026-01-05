import type { PromiseOrValue } from '@flemist/async-utils'
import type { Obj } from '@flemist/simple-utils'
import type { ArgsWithSeed } from '../types'
import type { RunContext } from './RunContext'

function saveArgs<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
  waitForSave: boolean,
): PromiseOrValue<void> {
  const { options, variantsIterator } = runContext
  const argsToSave = variantsIterator.limit?.args ?? args
  if (!options.store) {
    return
  }
  const savePromise = options.store.save(argsToSave)
  if (waitForSave) {
    return savePromise
  }
}

/**
 * Handle test error in parallel execution mode.
 *
 * In findBestError mode:
 * - With sequentialOnError=true: adds limit, saves args, aborts parallel (fall back to sequential)
 * - With sequentialOnError=false: adds limit, saves args, continues parallel with new limits
 * Without findBestError: saves args and aborts with error.
 */
export function handleErrorParallel<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
  error: unknown,
  tests: number,
): void {
  const { abortControllerParallel, state, options } = runContext
  const { logOptions } = options

  if (runContext.options.findBestError) {
    runContext.variantsIterator.addLimit({ args, error, tests })
    state.debugMode = false
    saveArgs(runContext, args, false)

    // Only abort parallel when sequentialOnError is true
    // Otherwise, let parallel threads continue working with new limits
    if (options.sequentialOnError && !abortControllerParallel.signal.aborted) {
      if (logOptions.debug) {
        logOptions.func(
          'debug',
          `[test-variants] sequentialOnError: aborting parallel, switching to sequential`,
        )
      }
      abortControllerParallel.abort(null)
    } else if (logOptions.debug) {
      logOptions.func(
        'debug',
        `[test-variants] parallel error in findBestError mode, continuing with new limits`,
      )
    }
  } else {
    if (abortControllerParallel.signal.aborted) {
      return
    }
    saveArgs(runContext, args, false)
    abortControllerParallel.abort(error)
  }
}

/**
 * Handle test error in sequential execution mode.
 *
 * In findBestError mode: adds limit to iterator, saves args.
 * Without findBestError: saves args and throws error.
 */
export function handleErrorSequential<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
  error: unknown,
  tests: number,
): PromiseOrValue<void> {
  const { state } = runContext

  if (runContext.options.findBestError) {
    runContext.variantsIterator.addLimit({ args, error, tests })
    const saveResult = saveArgs(runContext, args, true)
    if (saveResult) {
      return saveResult.then(() => {
        state.debugMode = false
      })
    }
    state.debugMode = false
    return
  }

  const saveResult = saveArgs(runContext, args, true)
  if (saveResult) {
    return saveResult.then(() => {
      throw error
    })
  }
  throw error
}
