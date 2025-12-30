export type Obj = Record<string, any>

/** Logging options for test-variants */
export type TestVariantsLogOptions = {
  /** Log at test start with memory info; default true */
  start?: null | boolean
  /** Progress log interval in ms; false/0 to disable; default 5000 */
  progressInterval?: null | false | number
  /** Log on completion; default true */
  completed?: null | boolean
  /** Log error details (variant index, args, error); default true */
  error?: null | boolean
  /** Log mode changes with all parameters; default true */
  modeChange?: null | boolean
}

/** Options for generating error variant file path */
export type GenerateErrorVariantFilePathOptions = {
  sessionDate: Date
}

/** Options for saving and replaying error-causing parameter combinations */
export type SaveErrorVariantsOptions<Args, SavedArgs = Args> = {
  /** Directory path for error variant JSON files */
  dir: string
  /** Retry attempts per variant during replay phase (default: 1) */
  retriesPerVariant?: null | number
  /** Custom file path generator; returns path relative to dir; null - use default path */
  getFilePath?: null | ((options: GenerateErrorVariantFilePathOptions) => string | null)
  /** Transform args before JSON serialization */
  argsToJson?: null | ((args: Args) => string | SavedArgs)
  /** Transform parsed JSON back to args */
  jsonToArgs?: null | ((json: SavedArgs) => Args)
  /** Use saved errors to set findBestError limits instead of throwing on replay */
  useToFindBestError?: null | boolean
}

export type TestVariantsTemplate<Args extends Obj, Value> = Value[] | ((args: Args) => Value[])
/*
type Func<Args extends Obj> = (args: Args) => any

export type FuncOrArgs<Args extends Obj = Obj> = Func<Args> | Args

export type ToArgs<T extends FuncOrArgs> =
  T extends Func<infer Args> ? Args : T

export type ToFunc<T extends FuncOrArgs> =
  T extends Func<any> ? T : Func<T>
*/
export type TestVariantsTemplates<Args extends Obj> = {
  [key in keyof Args]: TestVariantsTemplate<Args, Args[key]>
}
