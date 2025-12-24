import { TestVariantsTestRun } from './testVariantsCreateTestRun';
import { type IAbortSignalFast } from '@flemist/abort-controller-fast';
import { Obj, type SaveErrorVariantsOptions } from "./types";
export declare type TestVariantsFindBestErrorOptions = {
    seeds: Iterable<any>;
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
