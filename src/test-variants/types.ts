export type Obj = Record<string, any>

/** Options for saving and replaying error-causing parameter combinations */
export type SaveErrorVariantsOptions<Args, SavedArgs = Args> = {
  /** Directory path for error variant JSON files */
  dir: string
  /** Retry attempts per variant during replay phase (default: 1) */
  retriesPerVariant?: null | number
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
