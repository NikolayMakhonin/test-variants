export type Obj = Record<string, any>

/*
type Func<Args extends Obj> = (args: Args) => any

export type FuncOrArgs<Args extends Obj = Obj> = Func<Args> | Args

export type ToArgs<T extends FuncOrArgs> =
  T extends Func<infer Args> ? Args : T

export type ToFunc<T extends FuncOrArgs> =
  T extends Func<any> ? T : Func<T>
*/
