import { type PromiseOrValue } from '@flemist/async-utils';
import { TestVariantsTemplatesExt } from "./testVariantsIterable";
import { TestVariantsCreateTestRunOptions, TestVariantsTest } from "./testVariantsCreateTestRun";
import { TestVariantsRunOptions, TestVariantsRunResult } from "./testVariantsRun";
import { Obj } from "./types";
export declare type TestVariantsCall<Args extends Obj> = <SavedArgs = Args>(options?: null | TestVariantsRunOptions<Args, SavedArgs> & TestVariantsCreateTestRunOptions<Args>) => PromiseOrValue<TestVariantsRunResult<Args>>;
export declare type TestVariantsSetArgs<Args extends Obj> = <ArgsExtra extends Obj>(args: TestVariantsTemplatesExt<Omit<Args, 'seed'>, Omit<ArgsExtra, 'seed'>>) => TestVariantsCall<Args>;
export declare function createTestVariants<Args extends Obj>(test: TestVariantsTest<Args>): TestVariantsSetArgs<Args>;
