import type { Mutable, Obj } from '@flemist/simple-utils'
import type { ITimeController } from '@flemist/time-controller'
import type {
  ArgsWithSeed,
  Equals,
  GetSeedParams,
  LimitArgOnError,
  ModeConfig,
  OnModeChangeCallback,
} from 'src/common/test-variants/types'

/** Limit information with args and optional error */
export type VariantsIteratorLimit<Args extends Obj> = {
  args: ArgsWithSeed<Args>
  error?: unknown
  /** Number of tests run when this limit was applied */
  tests: number
}

/** Options for addLimit method */
export type AddLimitOptions<Args extends Obj> = {
  args?: null | ArgsWithSeed<Args>
  error?: unknown
  /** Number of tests run when this limit is applied */
  tests?: null | number
}

/** Options for calcIndexes method */
export type CalcIndexesOptions = {
  /** Limit per-arg indexes; boolean enables/disables, function for custom per-arg logic */
  limitArg?: null | boolean | LimitArgOnError
  /** When true, error variant is included in iteration (for debugging); default false excludes it */
  includeLimit?: null | boolean
}

/** Options for creating test variants iterator */
export type VariantsIteratorOptions<Args extends Obj> = {
  argsTemplates: TestVariantsTemplates<Args>
  /** Custom equality for comparing arg values */
  equals?: null | Equals
  /** Limit per-arg indexes on error; boolean enables/disables, function for custom per-arg logic */
  limitArgOnError?: null | boolean | LimitArgOnError
  /** When true, error variant is included in iteration (for debugging); default false excludes it */
  includeErrorVariant?: null | boolean
  /** Generates seed for reproducible randomized testing; seed is added to args */
  getSeed?: null | ((params: GetSeedParams) => any)
  /** Iteration modes (variant traversal methods); each mode runs until its limits are reached */
  iterationModes?: null | readonly ModeConfig[]
  /** Time controller for testable time-dependent operations; null uses timeControllerDefault */
  timeController?: null | ITimeController
  /** Callback invoked when iteration mode changes */
  onModeChange?: null | OnModeChangeCallback
  /** Global completion count limit; default 1 */
  limitCompletionCount?: null | number
  /** Global tests limit */
  limitTests?: null | number
  /** Global time limit in ms */
  limitTime?: null | number
}

/** State for each iteration mode */
export type ModeState<Args extends Obj> = {
  /** Position and arg state, independent per mode */
  navigationState: VariantNavigationState<Args>
  /** Full passes through all variants; resets to 0 when completedCount increments */
  cycleCount: number
  /** Times mode reached its cycles config limit; only grows */
  completedCount: number
  /** Tests since last switch to this mode; for "did nothing" check */
  testsInLastTurn: number
  /** Count of attempts to get next variant in current mode */
  tryNextVariantAttempts: number
  /** Set on first iteration after switching to mode; for per-mode limitTime check */
  startTime: number | null
}

/** Test variants iterator with limiting capabilities */
export type VariantsIterator<Args extends Obj> = {
  /** Last applied limit's args and error; null if no args-based limit applied */
  readonly limit: VariantsIteratorLimit<Args> | null
  /** Current mode index in modes array */
  readonly modeIndex: number
  readonly modeConfigs: readonly ModeConfig[]
  readonly modeStates: ModeState<Args>[]
  /** Total tests count; for external logging, events, etc */
  readonly tests: number
  /** Add or tighten limit */
  addLimit(options?: null | AddLimitOptions<Args>): void
  /** Calculate indexes for args; returns null if args not in templates or beyond limit */
  calcIndexes(
    args: ArgsWithSeed<Args>,
    options?: null | CalcIndexesOptions,
  ): number[] | null
  /** Extend templates with args values that are not in templates */
  extendTemplates(args: Args): void
  /** Get next variant or null when done */
  next(): ArgsWithSeed<Args> | null
}

export type TestVariantsTemplateValues<Value> = readonly Value[]

export type TestVariantsTemplateFunc<Args extends Obj, Value> = (
  args: Args,
) => readonly Value[]

export type TestVariantsTemplate<Args extends Obj, Value> =
  | TestVariantsTemplateValues<Value>
  | TestVariantsTemplateFunc<Args, Value>

export type ArgName<Args extends Obj> = Extract<keyof Args, string>

export type TestVariantsTemplates<Args extends Obj> = {
  [key in keyof Args]: TestVariantsTemplate<Args, Args[key]>
}

export type TestVariantsTemplatesExtra<Args extends Obj> = {
  [key in ArgName<Args>]?: Mutable<TestVariantsTemplateValues<Args[key]>>
}

export type TestVariantsTemplatesWithExtra<
  Args extends Obj,
  Extra extends Obj,
> = {
  templates: TestVariantsTemplates<Args>
  extra: TestVariantsTemplatesExtra<Extra>
}

/** State required for variant navigation */
export type VariantNavigationState<Args extends Obj> = {
  // Variant args
  args: Args
  // Arg names
  argsNames: ArgName<Args>[]
  // Value index by arg index
  indexes: number[]
  // Possible values by arg index
  argValues: (readonly any[])[]
  // Max value index by arg index
  argLimits: (number | null)[]
  // Repeat index for the same variant if attemptsPerVariant > 1
  attempts: number
  templates: TestVariantsTemplatesWithExtra<Args, any>
  limitArgOnError: null | boolean | LimitArgOnError
  equals: null | Equals
  // When true, error variant (limit point) is included in iteration
  includeErrorVariant: boolean
}

/** Extended templates type that allows additional args beyond the base Args type */
export type TestVariantsTemplatesExt<
  Args extends Obj,
  ArgsExtra extends Obj,
> = TestVariantsTemplates<{
  [key in keyof Args | keyof ArgsExtra]: key extends keyof Args
    ? Args[key]
    : key extends keyof ArgsExtra
      ? ArgsExtra[key]
      : never
}> & {
  /** Use getSeed option instead */
  seed?: never
}
