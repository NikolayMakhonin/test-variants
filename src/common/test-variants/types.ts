import type { IAbortSignalFast } from '@flemist/abort-controller-fast'
import type { PromiseOrValue } from '@flemist/async-utils'
import type { Obj, RequiredNonNullable } from '@flemist/simple-utils'
import type { ITimeController } from '@flemist/time-controller'

// region Mode configuration types

/** Base mode configuration shared by all modes */
export type BaseModeConfig = {
  /** Maximum time in ms for this phase */
  limitTime?: null | number
  /** Maximum total picks in this phase */
  limitTests?: null | number
}

/** Sequential mode configuration shared by forward and backward modes */
export type SequentialModeConfig = BaseModeConfig & {
  /** Number of full passes through all variants */
  cycles?: null | number
  /** Number of repeat tests per variant */
  attemptsPerVariant?: null | number
}

/** Forward mode configuration */
export type ForwardModeConfig = SequentialModeConfig & {
  mode: 'forward'
}

/** Backward mode configuration - iterates from last to first combination within limits */
export type BackwardModeConfig = SequentialModeConfig & {
  mode: 'backward'
}

/** Random mode configuration */
export type RandomModeConfig = BaseModeConfig & {
  mode: 'random'
}

/** Mode configuration for iteration phase */
export type ModeConfig =
  | ForwardModeConfig
  | BackwardModeConfig
  | RandomModeConfig

export type ModeType = ModeConfig['mode']

// endregion

// region Iterator types

/** Parameters passed to getSeed function for generating test seeds */
export type GetSeedParams = {
  /** Total number of tests run */
  tests: number
  /** Number of full passes through all variants */
  cycles: number
  /** Number of repeats of current variant */
  repeats: number
}

/** Options for limiting per-arg indexes on error */
export type LimitArgOnErrorOptions = {
  /** Arg name */
  name: string
  /** Arg value's index in template values array */
  valueIndex: number
  /** Current template values array for this arg */
  values: readonly any[]
  /** Current max value index limit for this arg; null if no limit */
  maxValueIndex: number | null
}

/** Callback to decide whether to apply limit for specific arg */
export type LimitArgOnError = (options: LimitArgOnErrorOptions) => boolean

/** Limit information with args and optional error */
export type TestVariantsIteratorLimit<Args extends Obj> = {
  args: ArgsWithSeed<Args>
  error?: unknown
}

/** Options for addLimit method */
export type AddLimitOptions<Args extends Obj> = {
  args?: null | ArgsWithSeed<Args>
  index?: null | number
  error?: unknown
}

/** Options for creating test variants iterator */
export type TestVariantsIteratorOptions<Args extends Obj> = {
  argsTemplates: TestVariantsTemplates<Args>
  /** Custom equality for comparing arg values */
  equals?: null | ((a: any, b: any) => boolean)
  /** Limit per-arg indexes on error; boolean enables/disables, function for custom per-arg logic */
  limitArgOnError?: null | boolean | LimitArgOnError
  /** When true, error variant is included in iteration (for debugging); default false excludes it */
  includeErrorVariant?: null | boolean
  /** Generates seed for reproducible randomized testing; seed is added to args */
  getSeed?: null | ((params: GetSeedParams) => any)
  /** Iteration modes (variant traversal methods); each mode runs until its limits are reached */
  iterationModes?: null | ModeConfig[]
  /** Time controller for testable time-dependent operations; null uses timeControllerDefault */
  timeController?: null | ITimeController
  /** Resolved logging options */
  log: RequiredNonNullable<TestVariantsLogOptions>
}

/** Args with seed from getSeed */
export type ArgsWithSeed<Args extends Obj> = Args & { seed: any }

/** Test variants iterator with limiting capabilities */
export type TestVariantsIterator<Args extends Obj> = {
  /** Current variant index; -1 before first next() */
  readonly index: number
  /** Current cycle index; starts at 0 after first start() */
  readonly cycleIndex: number
  /** Maximum variant count; variants with index >= count are not yielded */
  readonly count: number | null
  /** Last applied limit's args and error; null if no args-based limit applied */
  readonly limit: TestVariantsIteratorLimit<Args> | null
  /** Current mode index in modes array */
  readonly modeIndex: number
  /** Current mode configuration; null if no modes */
  readonly modeConfig: ModeConfig | null
  /** Minimum completed cycles across all modes; used for completion condition */
  readonly minCompletedCount: number
  /** Add or tighten limit */
  addLimit(options?: null | AddLimitOptions<Args>): void
  /** Reset to beginning of iteration for next cycle */
  start(): void
  /** Get next variant or null when done */
  next(): ArgsWithSeed<Args> | null
}

// endregion

// region Log options

/** Logging options for test-variants */
export type TestVariantsLogOptions = {
  /** Log at test start with memory info; default true */
  start?: null | boolean
  /** Progress log interval in ms; false/0 to disable; default 5000 */
  progress?: null | false | number
  /** Log on completion; default true */
  completed?: null | boolean
  /** Log error details (variant index, args, error); default true */
  error?: null | boolean
  /** Log mode changes with all parameters; default true */
  modeChange?: null | boolean
  /** Debug logging for internal behavior; default false */
  debug?: null | boolean
  /** Custom log function; receives log type and formatted message */
  func?: null | TestVariantsLogFunc
}

/** Log entry type for custom log function */
export type TestVariantsLogType = Exclude<keyof TestVariantsLogOptions, 'func'>

/** Custom log function signature */
export type TestVariantsLogFunc = (
  type: TestVariantsLogType,
  message: string,
) => void

/** Options for generating error variant file path */
export type GenerateErrorVariantFilePathOptions = {
  sessionDate: Date
}

/** Options for saving and replaying error-causing parameter combinations */
export type SaveErrorVariantsOptions<Args extends Obj, SavedArgs = Args> = {
  /** Directory path for error variant JSON files */
  dir: string
  /** Retry attempts per variant during replay phase (default: 1) */
  attemptsPerVariant?: null | number
  /** Custom file path generator; returns path relative to dir, or absolute path; null - use default path */
  getFilePath?:
    | null
    | ((options: GenerateErrorVariantFilePathOptions) => string | null)
  /** Transform args before JSON serialization */
  argsToJson?: null | ((args: ArgsWithSeed<Args>) => string | SavedArgs)
  /** Transform parsed JSON back to args */
  jsonToArgs?: null | ((json: SavedArgs) => ArgsWithSeed<Args>)
  /** Use saved errors to set findBestError limits instead of throwing on replay */
  useToFindBestError?: null | boolean
}

export type TestVariantsTemplate<Args extends Obj, Value> =
  | readonly Value[]
  | ((args: Args) => readonly Value[])

export type TestVariantsTemplates<Args extends Obj> = {
  [key in keyof Args]: TestVariantsTemplate<Args, Args[key]>
}

// endregion

// region Test function types

/** Result of test run (internal format with separate sync/async counts) */
export type TestFuncResult = void | {
  iterationsAsync: number
  iterationsSync: number
}

/** Options passed to test function */
export type TestVariantsTestOptions = {
  abortSignal: IAbortSignalFast
  timeController: ITimeController
}

/** Test run function (internal - wraps user's test with error handling) */
export type TestVariantsTestRun<Args extends Obj> = (
  args: ArgsWithSeed<Args>,
  tests: number,
  options: TestVariantsTestOptions,
) => PromiseOrValue<TestFuncResult>

/** Result of user's test function (number treated as iterationsSync) */
export type TestVariantsTestResult = number | void | TestFuncResult

/** User's test function */
export type TestVariantsTest<Args extends Obj> = (
  args: ArgsWithSeed<Args>,
  options: TestVariantsTestOptions,
) => PromiseOrValue<TestVariantsTestResult>

// endregion

// region SaveErrorVariantsStore types

/**
 * Store for saving and loading error-causing parameter combinations.
 * Node.js implementation uses file system. Browser returns null (not supported).
 */
export type SaveErrorVariantsStore<Args extends Obj> = {
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
  variants: TestVariantsIterator<Args>
  /** Options passed to test function */
  testOptions: TestVariantsTestOptions
  /** Whether findBestError is enabled */
  findBestErrorEnabled?: null | boolean
}

/** Factory function for creating SaveErrorVariantsStore */
export type CreateSaveErrorVariantsStore<Args extends Obj, SavedArgs = Args> = (
  options: SaveErrorVariantsOptions<Args, SavedArgs>,
) => SaveErrorVariantsStore<Args> | null

// endregion

// region Run options types

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

/** Options for finding the earliest failing variant across multiple test runs */
export type FindBestErrorOptions = {
  /** Custom equality for comparing arg values when finding indexes */
  equals?: null | ((a: any, b: any) => boolean)
  /** Limit per-arg indexes on error; boolean enables/disables, function for custom per-arg logic */
  limitArgOnError?: null | boolean | LimitArgOnError
  /** When true, error variant is included in iteration (for debugging); default false excludes it */
  includeErrorVariant?: null | boolean
  /** Return found error instead of throwing after all cycles complete */
  dontThrowIfError?: null | boolean
}

/** Best error found during test run */
export type TestVariantsBestError<Args extends Obj> = {
  error: any
  args: Args
  /** Number of tests run before the error (including attemptsPerVariant) */
  tests: number
}

/** Result of test variants run */
export type TestVariantsRunResult<Args extends Obj> = {
  iterations: number
  bestError: null | TestVariantsBestError<Args>
}

/** Error event passed to onError callback */
export type ErrorEvent<Args extends Obj> = {
  error: any
  args: Args
  /** Number of tests run before this error (including attemptsPerVariant) */
  tests: number
}

/** Callback invoked when a test variant throws an error */
export type OnErrorCallback<Args extends Obj> = (
  event: ErrorEvent<Args>,
) => PromiseOrValue<void>

/** Mode change event passed to onModeChange callback */
export type ModeChangeEvent = {
  /** Current mode configuration */
  mode: ModeConfig
  /** Current mode index in iterationModes array */
  modeIndex: number
  /** Number of tests run before this mode change */
  tests: number
}

/** Callback invoked when iteration mode changes */
export type OnModeChangeCallback = (
  event: ModeChangeEvent,
) => PromiseOrValue<void>

export type TestVariantsRunOptions<Args extends Obj = Obj, SavedArgs = Args> = {
  /** Callback invoked when a test variant throws an error */
  onError?: null | OnErrorCallback<Args>
  /** Callback invoked when iteration mode changes */
  onModeChange?: null | OnModeChangeCallback
  /** Wait for garbage collection after iterations */
  GC_Iterations?: null | number
  /** Same as GC_Iterations but only for async test variants, required for 10000 and more of Promise rejections */
  GC_IterationsAsync?: null | number
  /** Wait for garbage collection after time interval, required to prevent the karma browserDisconnectTimeout */
  GC_Interval?: null | number
  /** Logging options; null/true uses defaults; false disables all; object for fine-grained control */
  log?: null | boolean | TestVariantsLogOptions
  abortSignal?: null | IAbortSignalFast
  /** true - all in parallel; number - max parallel; false/0/undefined - sequential */
  parallel?: null | number | boolean
  /** Number of full passes through all variants; default 1 */
  cycles?: null | number
  /** Generates seed for reproducible randomized testing; seed is added to args */
  getSeed?: null | ((params: GetSeedParams) => any)
  /** Iteration modes (variant traversal methods); each mode runs until its limits are reached */
  iterationModes?: null | ModeConfig[]
  findBestError?: null | FindBestErrorOptions
  /** Save error-causing args to files and replay them before normal iteration */
  saveErrorVariants?: null | SaveErrorVariantsOptions<Args, SavedArgs>
  /** Tests only first N variants, ignores the rest. If null or not specified, tests all variants */
  limitTests?: null | number
  /** Maximum test run duration in milliseconds; when exceeded, iteration stops and current results are returned */
  limitTime?: null | number
  /** Time controller for testable time-dependent operations; null uses timeControllerDefault */
  timeController?: null | ITimeController
}
