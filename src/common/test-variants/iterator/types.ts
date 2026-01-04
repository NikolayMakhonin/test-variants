import type { Mutable, Obj, RequiredNonNullable } from '@flemist/simple-utils'
import type { ITimeController } from '@flemist/time-controller'
import type {
  ArgsWithSeed,
  Equals,
  GetSeedParams,
  LimitArgOnError,
  ModeConfig,
  TestVariantsLogOptions,
} from 'src/common/test-variants/types'

export type ModeType = ModeConfig['mode']

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
  equals?: null | Equals
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

export type TestVariantsTemplateValues<Value> = readonly Value[]

export type TestVariantsTemplateFunc<Args extends Obj, Value> = (
  args: Args,
) => readonly Value[]

export type TestVariantsTemplate<Args extends Obj, Value> =
  | TestVariantsTemplateValues<Value>
  | TestVariantsTemplateFunc<Args, Value>

export type TestVariantsTemplates<Args extends Obj> = {
  [key in keyof Args]: TestVariantsTemplate<Args, Args[key]>
}

export type TestVariantsTemplatesExtra<Args extends Obj> = {
  [key in keyof Args]: Mutable<TestVariantsTemplateValues<Args[key]>>
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
  // Value index by arg index
  indexes: number[]
  // Possible values by arg index
  argValues: (readonly any[])[]
  // Max value index by arg index
  argLimits: (number | null)[]
  // Repeat index for the same variant if attemptsPerVariant > 1
  attemptIndex: number
}

/** Extended templates type that allows additional args beyond the base Args type */
export type TestVariantsTemplatesExt<
  Args extends Obj,
  ArgsExtra extends Obj,
> = TestVariantsTemplates<{
  [key in keyof ArgsExtra | keyof Args]: key extends keyof Args
    ? Args[key]
    : key extends keyof ArgsExtra
      ? ArgsExtra[key]
      : never
}>
