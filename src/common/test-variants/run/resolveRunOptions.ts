import type { IAbortSignalFast } from '@flemist/abort-controller-fast'
import type { RequiredNonNullable, Obj } from '@flemist/simple-utils'
import {
  timeControllerDefault,
  type ITimeController,
} from '@flemist/time-controller'
import { resolveLogOptions } from '../log/logOptions'
import type {
  TestVariantsLogOptions,
  FindBestErrorOptions,
  ParallelOptions,
} from '../types'
import type {
  TestVariantsRunOptionsInternal,
  SaveErrorVariantsStore,
} from './types'

const PARALLEL_UNLIMITED = 2 ** 31

type ResolvedParallelOptions = {
  parallel: number
  sequentialOnError: boolean
}

function resolveParallelOptions(
  option: null | undefined | number | boolean | ParallelOptions,
): ResolvedParallelOptions {
  if (option == null) {
    return { parallel: 1, sequentialOnError: false }
  }

  if (typeof option === 'boolean') {
    return {
      parallel: option ? PARALLEL_UNLIMITED : 1,
      sequentialOnError: false,
    }
  }

  if (typeof option === 'number') {
    return { parallel: option > 0 ? option : 1, sequentialOnError: false }
  }

  // ParallelOptions object
  const count = option.count
  let parallel = 1
  if (count === true) {
    parallel = PARALLEL_UNLIMITED
  } else if (typeof count === 'number' && count > 0) {
    parallel = count
  }

  return {
    parallel,
    sequentialOnError: option.sequentialOnError ?? false,
  }
}

/** Resolved configuration for test variants run */
export type RunOptionsResolved<Args extends Obj> = {
  store: SaveErrorVariantsStore<Args> | null
  GC_Iterations: number
  GC_IterationsAsync: number
  GC_Interval: number
  logOptions: RequiredNonNullable<TestVariantsLogOptions>
  abortSignalExternal: IAbortSignalFast | null | undefined
  findBestError: FindBestErrorOptions | null | undefined
  dontThrowIfError: boolean | null | undefined
  timeController: ITimeController
  /** Maximum number of parallel threads */
  parallel: number
  /** Switch to sequential mode after first error in findBestError mode */
  sequentialOnError: boolean
}

/** Resolve run options into normalized structure */
export function resolveRunOptions<Args extends Obj, SavedArgs = Args>(
  options: TestVariantsRunOptionsInternal<Args, SavedArgs> | null | undefined,
): RunOptionsResolved<Args> {
  const saveErrorVariantsOptions = options?.saveErrorVariants
  const store: SaveErrorVariantsStore<Args> | null =
    saveErrorVariantsOptions && options.createSaveErrorVariantsStore
      ? options.createSaveErrorVariantsStore(saveErrorVariantsOptions)
      : null

  const findBestError = options?.findBestError

  const { parallel, sequentialOnError } = resolveParallelOptions(
    options?.parallel,
  )

  return {
    store,
    GC_Iterations: options?.GC_Iterations ?? 1000000,
    GC_IterationsAsync: options?.GC_IterationsAsync ?? 10000,
    GC_Interval: options?.GC_Interval ?? 1000,
    logOptions: resolveLogOptions(options?.log),
    abortSignalExternal: options?.abortSignal,
    findBestError,
    dontThrowIfError: findBestError?.dontThrowIfError,
    timeController: options?.timeController ?? timeControllerDefault,
    parallel,
    sequentialOnError,
  }
}
