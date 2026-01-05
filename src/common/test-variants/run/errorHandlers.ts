import type { PromiseOrValue } from '@flemist/async-utils'
import type { Obj } from '@flemist/simple-utils'
import type { ArgsWithSeed } from 'src/common/test-variants/types'
import type { RunContext } from './RunContext'

function handleFindBestErrorParallel<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
  error: unknown,
  tests: number,
): void {
  const { variantsIterator, options, abortControllerParallel, state } =
    runContext

  variantsIterator.addLimit({ args, error, tests })

  const argsToSave = variantsIterator.limit?.args
  if (options.store && argsToSave) {
    void options.store.save(argsToSave)
  }

  state.debugMode = false

  if (!abortControllerParallel.signal.aborted) {
    abortControllerParallel.abort(null)
  }
}

function handleFindBestErrorSequential<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
  error: unknown,
  tests: number,
): PromiseOrValue<void> {
  const { variantsIterator, options, state } = runContext

  variantsIterator.addLimit({ args, error, tests })

  const argsToSave = variantsIterator.limit?.args
  if (options.store && argsToSave) {
    return options.store.save(argsToSave).then(() => {
      state.debugMode = false
    })
  }

  state.debugMode = false
}

function handleFatalErrorParallel<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
  error: unknown,
): void {
  const { options, abortControllerParallel } = runContext

  if (abortControllerParallel.signal.aborted) {
    return
  }

  if (options.store) {
    void options.store.save(args)
  }

  abortControllerParallel.abort(error)
}

function handleFatalErrorSequential<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
  error: unknown,
): PromiseOrValue<void> {
  const { options } = runContext

  if (options.store) {
    return options.store.save(args).then(() => {
      throw error
    })
  }

  throw error
}

/**
 * Handle test error in parallel execution mode.
 *
 * In findBestError mode: adds limit to iterator, saves args, aborts parallel tests.
 * Without findBestError: saves args and aborts with error.
 */
export function handleErrorParallel<Args extends Obj>(
  runContext: RunContext<Args>,
  args: ArgsWithSeed<Args>,
  error: unknown,
  tests: number,
): void {
  if (runContext.options.findBestError) {
    handleFindBestErrorParallel(runContext, args, error, tests)
  } else {
    handleFatalErrorParallel(runContext, args, error)
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
  if (runContext.options.findBestError) {
    return handleFindBestErrorSequential(runContext, args, error, tests)
  }
  return handleFatalErrorSequential(runContext, args, error)
}
