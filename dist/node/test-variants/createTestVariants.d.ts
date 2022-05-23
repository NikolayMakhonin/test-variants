declare type VariantsArgs<TArgs> = {
    [key in keyof TArgs]: TArgs[key][] | ((args: TArgs) => TArgs[key][]);
};
declare type TestVariantsFunc<TArgs, TResult> = <TAdditionalArgs>(args: VariantsArgs<{
    [key in (keyof TAdditionalArgs | keyof TArgs)]: key extends keyof TArgs ? TArgs[key] : key extends keyof TAdditionalArgs ? TAdditionalArgs[key] : never;
}>) => TResult;
export declare type TestVariantsFuncSync<TArgs> = TestVariantsFunc<TArgs, number>;
export declare type TestVariantsFuncAsync<TArgs> = TestVariantsFunc<TArgs, Promise<number> | number>;
export declare function createTestVariantsSync<TArgs extends object>(test: (args: TArgs) => void): TestVariantsFuncSync<TArgs>;
export declare function createTestVariants<TArgs extends object>(test: (args: TArgs) => Promise<void> | void): TestVariantsFuncAsync<TArgs>;
export {};
