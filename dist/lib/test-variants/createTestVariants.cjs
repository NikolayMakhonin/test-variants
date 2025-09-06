'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var tslib = require('tslib');
var testVariants_testVariantsIterable = require('./testVariantsIterable.cjs');
var testVariants_testVariantsCreateTestRun = require('./testVariantsCreateTestRun.cjs');
var testVariants_testVariantsRun = require('./testVariantsRun.cjs');
require('@flemist/async-utils');
require('./argsToString.cjs');
require('@flemist/abort-controller-fast');
require('@flemist/time-limits');
require('../garbage-collect/garbageCollect.cjs');

function createTestVariants(test) {
    return function testVariantsArgs(args) {
        return function testVariantsCall(options) {
            return tslib.__awaiter(this, void 0, void 0, function* () {
                const testRun = testVariants_testVariantsCreateTestRun.testVariantsCreateTestRun(test, {
                    onError: options === null || options === void 0 ? void 0 : options.onError,
                });
                const variants = testVariants_testVariantsIterable.testVariantsIterable({
                    argsTemplates: args,
                });
                return testVariants_testVariantsRun.testVariantsRun(testRun, variants, options);
            });
        };
    };
}
/*
export class TestVariants<Args extends Obj> {
  private readonly _test: TestVariantsTest<Args>
  test(args: Args, abortSignal: IAbortSignalFast) {
    return this._test(args, abortSignal)
  }

  constructor(
    test: TestVariantsTest<Args>,
  ) {
    this.test = test
  }

  createVariants<ArgsExtra extends Obj>(
    argsTemplates: TestVariantsTemplatesExt<Args, ArgsExtra>,
  ): Iterable<Args> {
    return testVariantsIterable<Args, ArgsExtra>(argsTemplates)
  }

  createTestRun(
    options?: null | TestVariantsCreateTestRunOptions<Args>,
  ) {
    return testVariantsCreateTestRun<Args>(this._test, options)
  }

  testAll<ArgsExtra extends Obj>(
    argsTemplates: TestVariantsTemplatesExt<Args, ArgsExtra>,
  ): TestVariantsCall<Args>
  testAll(
    variants: Iterable<Args>,
  ): TestVariantsCall<Args>
  testAll<ArgsExtra extends Obj>(
    variantsOrTemplates: Iterable<Args> | TestVariantsTemplatesExt<Args, ArgsExtra>,
  ): TestVariantsCall<Args> {
    const variants = Symbol.iterator in variantsOrTemplates
      ? variantsOrTemplates as Iterable<Args>
      : this.createVariants(variantsOrTemplates as TestVariantsTemplatesExt<Args, ArgsExtra>)

    const _this = this

    return function testVariantsCall(
      options?: null | TestVariantsRunOptions & TestVariantsCreateTestRunOptions<Args>,
    ) {
      const testRun = _this.createTestRun({
        onError: options?.onError,
      })

      return testVariantsRun<Args>(testRun, variants, options)
    }
  }
}
*/

exports.createTestVariants = createTestVariants;
