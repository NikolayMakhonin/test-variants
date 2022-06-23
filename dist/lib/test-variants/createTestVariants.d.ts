declare type VariantsArgs<TArgs> = {
    [key in keyof TArgs]: TArgs[key][] | ((args: TArgs) => TArgs[key][]);
};
declare type PromiseOrValue<T> = Promise<T> | T;
declare type TestVariantsCall = (callParams?: TestVariantsCallParams) => PromiseOrValue<number>;
declare type TestVariantsSetArgs<TArgs> = <TAdditionalArgs>(args: VariantsArgs<{
    [key in (keyof TAdditionalArgs | keyof TArgs)]: key extends keyof TArgs ? TArgs[key] : key extends keyof TAdditionalArgs ? TAdditionalArgs[key] : never;
}>) => TestVariantsCall;
export declare type TestVariantsCallParams = {
    /** Wait for garbage collection after iterations */
    GC_Iterations?: number;
    /** Same as GC_Iterations but only for async test variants, required for 10000 and more of Promise rejections */
    GC_IterationsAsync?: number;
    /** Wait for garbage collection after time interval, required to prevent the karma browserDisconnectTimeout */
    GC_Interval?: number;
    /** console log current iterations, required to prevent the karma browserNoActivityTimeout */
    logInterval?: number;
    /** console log iterations on test completed */
    logCompleted?: boolean;
};
export declare function createTestVariants<TArgs extends object>(test: (args: TArgs) => Promise<number | void> | number | void): TestVariantsSetArgs<TArgs>;
export {};
