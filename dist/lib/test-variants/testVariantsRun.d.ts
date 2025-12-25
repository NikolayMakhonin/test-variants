import { TestVariantsTestRun } from './testVariantsCreateTestRun';
import { type IAbortSignalFast } from '@flemist/abort-controller-fast';
import { Obj, type SaveErrorVariantsOptions } from "./types";
/** Parameters passed to getSeed function for generating test seeds */
export declare type GetSeedParams = {
    /** Index of current variant/parameter-combination being tested */
    variantIndex: number;
    /** Index of current cycle - full pass through all variants (0..cycles-1) */
    cycleIndex: number;
    /** Index of repeat for current variant within this cycle (0..repeatsPerVariant-1) */
    repeatIndex: number;
    /** Total index across all cycles: cycleIndex × repeatsPerVariant + repeatIndex */
    totalIndex: number;
};
/** Options for finding the earliest failing variant across multiple test runs */
export declare type TestVariantsFindBestErrorOptions = {
    /** Function to generate seed based on current iteration state */
    getSeed: (params: GetSeedParams) => any;
    /** Number of full passes through all variants */
    cycles: number;
    /** Number of repeat tests per variant within each cycle */
    repeatsPerVariant: number;
};
export declare type TestVariantsRunOptions<Args extends Obj = Obj, SavedArgs = Args> = {
    /** Wait for garbage collection after iterations */
    GC_Iterations?: null | number;
    /** Same as GC_Iterations but only for async test variants, required for 10000 and more of Promise rejections */
    GC_IterationsAsync?: null | number;
    /** Wait for garbage collection after time interval, required to prevent the karma browserDisconnectTimeout */
    GC_Interval?: null | number;
    /** console log current iterations, required to prevent the karma browserNoActivityTimeout */
    logInterval?: null | number;
    /** console log iterations on test completed */
    logCompleted?: null | boolean;
    abortSignal?: null | IAbortSignalFast;
    parallel?: null | number | boolean;
    findBestError?: null | TestVariantsFindBestErrorOptions;
    /** Save error-causing args to files and replay them before normal iteration */
    saveErrorVariants?: null | SaveErrorVariantsOptions<Args, SavedArgs>;
    /** Tests only first N variants, ignores the rest. If null or not specified, tests all variants */
    limitVariantsCount?: null | number;
};
export declare type TestVariantsBestError<Args extends Obj> = {
    error: any;
    args: Args;
    index: number;
};
export declare type TestVariantsRunResult<Arg extends Obj> = {
    iterations: number;
    bestError: null | TestVariantsBestError<Arg>;
};
export declare function testVariantsRun<Args extends Obj, SavedArgs = Args>(testRun: TestVariantsTestRun<Args>, variants: Iterable<Args>, options?: TestVariantsRunOptions<Args, SavedArgs>): Promise<TestVariantsRunResult<Args>>;
