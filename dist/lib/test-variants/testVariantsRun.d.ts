import { TestVariantsTestRun } from './testVariantsCreateTestRun';
import { type IAbortSignalFast } from '@flemist/abort-controller-fast';
import { Obj } from "./types";
export declare type TestVariantsFindBestErrorOptions = {
    seeds: Iterable<any>;
};
export declare type TestVariantsRunOptions = {
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
export declare function testVariantsRun<Args extends Obj>(testRun: TestVariantsTestRun<Args>, variants: Iterable<Args>, options?: TestVariantsRunOptions): Promise<TestVariantsRunResult<Args>>;
