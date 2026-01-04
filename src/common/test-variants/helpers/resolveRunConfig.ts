import type { IAbortSignalFast } from '@flemist/abort-controller-fast'
import type { ITimeController } from '@flemist/time-controller'
import type { RequiredNonNullable, Obj } from '@flemist/simple-utils'
import type {
  TestVariantsLogOptions,
  TestVariantsRunOptionsInternal,
  FindBestErrorOptions,
  SaveErrorVariantsStore,
  OnModeChangeCallback,
} from '../types'
import { timeControllerDefault } from '@flemist/time-controller'
import { resolveLogOptions } from './logOptions'

/** Resolved configuration for test variants run */
export type TestVariantsRunConfig<Args extends Obj> = {
  store: SaveErrorVariantsStore<Args> | null
  GC_Iterations: number
  GC_IterationsAsync: number
  GC_Interval: number
  logOpts: RequiredNonNullable<TestVariantsLogOptions>
  abortSignalExternal: IAbortSignalFast | null | undefined
  findBestError: FindBestErrorOptions | null | undefined
  cycles: number
  dontThrowIfError: boolean | null | undefined
  limitTime: number | null | undefined
  timeController: ITimeController
  onModeChange: OnModeChangeCallback | null | undefined
  parallel: number
  limitTests: number | null | undefined
}

/** Resolve run options into normalized config */
export function resolveRunConfig<Args extends Obj, SavedArgs = Args>(
  options: TestVariantsRunOptionsInternal<Args, SavedArgs> | null | undefined,
): TestVariantsRunConfig<Args> {
  const saveErrorVariantsOptions = options?.saveErrorVariants
  const store: SaveErrorVariantsStore<Args> | null =
    saveErrorVariantsOptions && options?.createSaveErrorVariantsStore
      ? options.createSaveErrorVariantsStore(saveErrorVariantsOptions)
      : null

  const findBestError = options?.findBestError

  const parallel =
    options?.parallel === true
      ? 2 ** 31
      : !options?.parallel || options.parallel <= 0
        ? 1
        : options.parallel

  return {
    store,
    GC_Iterations: options?.GC_Iterations ?? 1000000,
    GC_IterationsAsync: options?.GC_IterationsAsync ?? 10000,
    GC_Interval: options?.GC_Interval ?? 1000,
    logOpts: resolveLogOptions(options?.log),
    abortSignalExternal: options?.abortSignal,
    findBestError,
    cycles: options?.cycles ?? 1,
    dontThrowIfError: findBestError?.dontThrowIfError,
    limitTime: options?.limitTime,
    timeController: options?.timeController ?? timeControllerDefault,
    onModeChange: options?.onModeChange,
    parallel,
    limitTests: options?.limitTests,
  }
}
