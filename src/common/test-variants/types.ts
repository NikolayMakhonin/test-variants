import type { IAbortSignalFast } from '@flemist/abort-controller-fast'
import type { Obj, PromiseOrValue } from '@flemist/simple-utils'
import type { ITimeController } from '@flemist/time-controller'
import type { TestFuncResult } from './run/types'

// region Re-exports for public types from submodules

export type { TestVariantsTemplatesExt } from './iterator/types'

export type {
  TestVariantsCall,
  TestVariantsSetArgs,
  TestVariantsTestResult,
} from './run/types'

// endregion

// region Public API types

export type Equals = (a: any, b: any) => boolean

/** Args with seed from getSeed */
export type ArgsWithSeed<Args extends Obj> = Args & { seed: any }

// region Mode configuration types

/** Base mode configuration shared by all modes */
export type BaseModeConfig = {
  /** Maximum time in ms for this phase; does not interrupt a running test, only prevents starting the next iteration */
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

// region GetSeedParams

/** Parameters passed to getSeed function for generating test seeds */
export type GetSeedParams = {
  /** Total number of tests run */
  tests: number
}

// endregion

// region LimitArgOnError

/** Options for limiting per-arg indexes on error */
export type LimitArgOnErrorOptions = {
  /** Arg name */
  name: string
  /** Current template values array for this arg */
  values: readonly any[]
  /** Current max value index limit for this arg; null if no limit */
  maxValueIndex: number | null
}

/** Callback to decide whether to apply limit for specific arg */
export type LimitArgOnError = (options: LimitArgOnErrorOptions) => boolean

// endregion

// region Log options

/** Log entry type for custom log function */
export type TestVariantsLogType = Exclude<
  keyof TestVariantsLogOptions,
  'func' | 'format'
>

/** Custom log function signature */
export type TestVariantsLogFunc = (
  type: TestVariantsLogType,
  message: string,
) => void

/** Custom format function for log output; converts any value to string */
export type TestVariantsLogFormat = (obj: any) => string

/** Logging options for test-variants */
export type TestVariantsLogOptions = {
  /** Log saved error variants replay; default true */
  replay?: null | boolean
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
  /** Custom formatter for objects in log messages */
  format?: null | TestVariantsLogFormat
}

// endregion

// region SaveErrorVariants options

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
  /** Limit per-arg indexes; boolean enables/disables, function for custom per-arg logic */
  limitArg?: null | boolean | LimitArgOnError
  /** Extend template with extra args from limit if they are missing */
  extendTemplates?: null | boolean
}

// endregion

// region Test options

/** Options passed to test function */
export type TestVariantsState = {
  abortSignal: IAbortSignalFast
  /** For time-dependent operations inside user tests; same instance as timeController run option */
  timeController: ITimeController
}

// endregion

// region FindBestError options

/** Options for finding the earliest failing variant across multiple test runs */
export type FindBestErrorOptions = {
  /** Custom equality for comparing arg values when finding indexes */
  equals?: null | Equals
  /** Limit per-arg indexes on error; boolean enables/disables, function for custom per-arg logic */
  limitArgOnError?: null | boolean | LimitArgOnError
  /** When true, error variant is included in iteration (for debugging); default false excludes it */
  includeErrorVariant?: null | boolean
  /** Return found error instead of throwing after all cycles complete */
  dontThrowIfError?: null | boolean
}

// endregion

// region Result types

/** Best error found during test run */
export type TestVariantsBestError<Args extends Obj> = {
  error: any
  args: Args
  /** Number of tests run before the error (including attemptsPerVariant) */
  tests: number
}

/** Result of test variants run */
export type TestVariantsResult<Args extends Obj> = {
  iterations: number
  bestError: null | TestVariantsBestError<Args>
}

// endregion

// region Error event

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

// endregion

// region Test start event

/** Test start event passed to onStart callback */
export type TestStartEvent<Args extends Obj> = {
  /** Args of the variant about to run (including seed if getSeed provided) */
  args: Args
  /** Index of this test run; equals total tests run before this one (including attemptsPerVariant) */
  tests: number
}

/** Callback invoked before each single test run */
export type OnTestStartCallback<Args extends Obj> = (
  event: TestStartEvent<Args>,
) => PromiseOrValue<void>

// endregion

// region Test end event

/** Test end event passed to onEnd callback */
export type TestEndEvent<Args extends Obj> = TestStartEvent<Args> & {
  /** Iteration counts returned by the test; absent when the test threw */
  result?: TestFuncResult
  /** Error thrown by the test; absent on success */
  error?: any
}

/** Callback invoked after each single test run, on both success and error */
export type OnTestEndCallback<Args extends Obj> = (
  event: TestEndEvent<Args>,
) => PromiseOrValue<void>

// endregion

// region Mode change event

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
export type OnModeChangeCallback = (event: ModeChangeEvent) => void

// endregion

// region Parallel options

/** Options for parallel test execution */
export type ParallelOptions = {
  /** Number of parallel threads; true = unlimited, false/1 = sequential */
  count?: null | number | boolean
  /** Switch to sequential mode after first error in findBestError mode */
  sequentialOnError?: null | boolean
}

// endregion

// region Run options

export type TestVariantsRunOptions<Args extends Obj = Obj, SavedArgs = Args> = {
  /** Callback invoked before each single test run */
  onStart?: null | OnTestStartCallback<Args>
  /** Callback invoked after each single test run, on both success and error */
  onEnd?: null | OnTestEndCallback<Args>
  /** Callback invoked when a test variant throws an error */
  onError?: null | OnErrorCallback<Args>
  /** Callback invoked when iteration mode changes */
  onModeChange?: null | OnModeChangeCallback
  /** Pause debugger on error */
  pauseDebuggerOnError?: null | boolean
  /** Wait for garbage collection after iterations */
  GC_Iterations?: null | number
  /** Same as GC_Iterations but only for async test variants, required for 10000 and more of Promise rejections */
  GC_IterationsAsync?: null | number
  /** Wait for garbage collection after time interval, required to prevent the karma browserDisconnectTimeout */
  GC_Interval?: null | number
  /** Logging options; null/true uses defaults; false disables all; object for fine-grained control */
  log?: null | boolean | TestVariantsLogOptions
  abortSignal?: null | IAbortSignalFast
  /** Parallel execution; true = unlimited, number = max parallel, false/1 = sequential, object = ParallelOptions */
  parallel?: null | number | boolean | ParallelOptions
  /** Number of full passes through all variants; default 1 */
  cycles?: null | number
  /** Generates seed for reproducible randomized testing; seed is added to args */
  getSeed?: null | ((params: GetSeedParams) => any)
  /** Iteration modes (variant traversal methods); each mode runs until its limits are reached */
  iterationModes?: null | readonly ModeConfig[]
  findBestError?: null | FindBestErrorOptions
  /** Save error-causing args to files and replay them before normal iteration */
  saveErrorVariants?: null | SaveErrorVariantsOptions<Args, SavedArgs>
  /** Tests only first N variants, ignores the rest. If null or not specified, tests all variants */
  limitTests?: null | number
  /** Maximum total duration in milliseconds; does not interrupt a running test, only prevents starting the next iteration; use timeout to interrupt individual tests; not applied during saveErrorVariants replay to ensure all previously failing variants are verified */
  limitTime?: null | number
  /** Time controller for time-dependent operations inside user tests; null uses timeControllerDefault */
  timeController?: null | ITimeController
  /** Time controller for internal library timing; null uses timeControllerDefault */
  timeControllerInternal?: null | ITimeController
  /** Throws TimeoutError if single test run exceeds this timeout */
  timeout?: null | number | ((args: Args) => number | null | undefined)
}

// endregion

// endregion

export class TimeoutError extends Error {}
