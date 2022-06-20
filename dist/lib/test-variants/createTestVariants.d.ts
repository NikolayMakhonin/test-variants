declare type VariantsArgs<TArgs> = {
    [key in keyof TArgs]: TArgs[key][] | ((args: TArgs) => TArgs[key][]);
};
declare type PromiseOrValue<T> = Promise<T> | T;
declare type TestVariantsCall = (callParams?: TestVariantsCallParams) => PromiseOrValue<number>;
declare type TestVariantsSetArgs<TArgs> = <TAdditionalArgs>(args: VariantsArgs<{
    [key in (keyof TAdditionalArgs | keyof TArgs)]: key extends keyof TArgs ? TArgs[key] : key extends keyof TAdditionalArgs ? TAdditionalArgs[key] : never;
}>) => TestVariantsCall;
export declare type TestVariantsCallParams = {
    /** pause test, required to prevent the karma browserDisconnectTimeout */
    pauseInterval?: number;
    pauseTime?: number;
    /** console log current iterations, required to prevent the karma browserNoActivityTimeout */
    logInterval?: number;
    /** console log iterations on test completed */
    logCompleted?: boolean;
};
export declare function createTestVariants<TArgs extends object>(test: (args: TArgs) => Promise<number | void> | number | void): TestVariantsSetArgs<TArgs>;
export {};
