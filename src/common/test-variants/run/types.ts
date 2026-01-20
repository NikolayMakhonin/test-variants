import type { PromiseOrValue } from '@flemist/async-utils'
import type { Obj, RequiredNonNullable } from '@flemist/simple-utils'
import type {
  TestVariantsTemplatesExt,
  VariantsIterator,
} from '../iterator/types'
import type {
  ArgsWithSeed,
  OnErrorCallback,
  SaveErrorVariantsOptions,
  TestVariantsState,
  TestVariantsLogOptions,
  TestVariantsResult,
  TestVariantsRunOptions,
} from '../types'

/** Result of test run (internal format with separate sync/async counts) */
export type TestFuncResult = void | {
  iterationsAsync: number
  iterationsSync: number
}

/** Test run function (internal - wraps user's test with error handling) */
export type TestVariantsTestRun<Args extends Obj> = (
  args: ArgsWithSeed<Args>,
  tests: number,
  options: TestVariantsState,
) => PromiseOrValue<TestFuncResult>

/** Result of user's test function (number treated as iterationsSync) */
export type TestVariantsTestResult = number | void | TestFuncResult

/** User's test function */
export type TestVariantsTest<Args extends Obj> = (
  args: ArgsWithSeed<Args>,
  options: TestVariantsState,
) => PromiseOrValue<TestVariantsTestResult>

/**
 * Store for saving and loading error-causing parameter combinations.
 * Node.js implementation uses file system. Browser returns null (not supported).
 */
export interface SaveErrorVariantsStore<Args extends Obj> {
  /**
   * Save error-causing args to storage.
   * Handles concurrency protection and deduplication internally.
   */
  save(args: ArgsWithSeed<Args>): Promise<void>
  /**
   * Replay saved error variants before normal iteration.
   * If error occurs during replay:
   * - In findBestError mode (useToFindBestError + findBestErrorEnabled): adds limit and continues
   * - Otherwise: throws the error
   */
  replay(options: SaveErrorVariantsStoreReplayOptions<Args>): Promise<void>
}

/** Options for SaveErrorVariantsStore.replay method */
export type SaveErrorVariantsStoreReplayOptions<Args extends Obj> = {
  /** Test run function */
  testRun: TestVariantsTestRun<Args>
  /** Iterator to add limits to */
  variantsIterator: VariantsIterator<Args>
  /** Options passed to test function */
  testOptions: TestVariantsState
  /** Whether findBestError is enabled */
  findBestErrorEnabled?: null | boolean
}

/** Factory function for creating SaveErrorVariantsStore */
export type CreateSaveErrorVariantsStore<Args extends Obj, SavedArgs = Args> = (
  options: SaveErrorVariantsOptions<Args, SavedArgs>,
) => SaveErrorVariantsStore<Args> | null

/** Internal run options with injected dependencies */
export type TestVariantsRunOptionsInternal<
  Args extends Obj = Obj,
  SavedArgs = Args,
> = TestVariantsRunOptions<Args, SavedArgs> & {
  createSaveErrorVariantsStore?: null | CreateSaveErrorVariantsStore<
    Args,
    SavedArgs
  >
}

export type TestVariantsCreateTestRunOptions<Args extends Obj> = {
  onError?: null | OnErrorCallback<Args>
  /** Resolved logging options */
  log: RequiredNonNullable<TestVariantsLogOptions>
  /** Pause debugger on error */
  pauseDebuggerOnError?: null | boolean
}

export type TestVariantsCall<Args extends Obj> = <SavedArgs = Args>(
  options?: null | TestVariantsRunOptionsInternal<Args, SavedArgs>,
) => PromiseOrValue<TestVariantsResult<Args>>

export type TestVariantsSetArgs<Args extends Obj> = <ArgsExtra extends Obj>(
  args: TestVariantsTemplatesExt<Omit<Args, 'seed'>, ArgsExtra>,
) => TestVariantsCall<Args>
