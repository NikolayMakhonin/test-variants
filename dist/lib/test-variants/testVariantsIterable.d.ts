import { Obj } from "./types";
export declare type TestVariantsTemplate<Args extends Obj, Value> = Value[] | ((args: Args) => Value[]);
export declare type TestVariantsTemplates<Args extends Obj> = {
    [key in keyof Args]: TestVariantsTemplate<Args, Args[key]>;
};
export declare type TestVariantsTemplatesExt<Args extends Obj, ArgsExtra extends Obj> = TestVariantsTemplates<{
    [key in (keyof ArgsExtra | keyof Args)]: key extends keyof Args ? Args[key] : key extends keyof ArgsExtra ? ArgsExtra[key] : never;
}>;
export declare type TestVariantsIterableOptions<Args extends Obj, ArgsExtra extends Obj> = {
    argsTemplates: TestVariantsTemplatesExt<Args, ArgsExtra>;
};
export declare function testVariantsIterable<Args extends Obj, ArgsExtra extends Obj>({ argsTemplates, }: TestVariantsIterableOptions<Args, ArgsExtra>): Iterable<Args>;
