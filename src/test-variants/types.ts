export type Obj = Record<string, any>

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
}

/*
type Func<Args extends Obj> = (args: Args) => any

export type FuncOrArgs<Args extends Obj = Obj> = Func<Args> | Args

export type ToArgs<T extends FuncOrArgs> =
  T extends Func<infer Args> ? Args : T

export type ToFunc<T extends FuncOrArgs> =
  T extends Func<any> ? T : Func<T>
*/
