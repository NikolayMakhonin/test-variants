import { type IAbortSignalFast } from '@flemist/abort-controller-fast';
import { type PromiseOrValue } from '@flemist/async-utils';
import { Obj } from "./types";
export declare type ErrorEvent<Args extends Obj> = {
    error: any;
    args: Args;
    index: number;
};
export declare type OnErrorCallback<Args extends Obj> = (event: ErrorEvent<Args>) => PromiseOrValue<void>;
export declare type TestVariantsCreateTestRunOptions<Args extends Obj> = {
    onError?: null | OnErrorCallback<Args>;
};
export declare type TestVariantsTestRunResult = void | {
    iterationsAsync: number;
    iterationsSync: number;
};
export declare type TestVariantsTestRun<Args extends Obj> = (args: Args, index: number, abortSignal: IAbortSignalFast) => PromiseOrValue<TestVariantsTestRunResult>;
export declare type TestVariantsTestResult = number | void | TestVariantsTestRunResult;
export declare type TestVariantsTest<Args extends Obj> = (args: Args & {
    seed?: null | number;
}, abortSignal: IAbortSignalFast) => PromiseOrValue<TestVariantsTestResult>;
export declare function testVariantsCreateTestRun<Args extends Obj>(test: TestVariantsTest<Args>, options?: null | TestVariantsCreateTestRunOptions<Args>): TestVariantsTestRun<Args>;
