'use strict';

var tslib = require('tslib');
var node = require('rdtsc/node');
var testVariants_createTestVariants = require('./createTestVariants.cjs');
require('./testVariantsIterable.cjs');
require('./testVariantsCreateTestRun.cjs');
require('@flemist/async-utils');
require('./argsToString.cjs');
require('./testVariantsRun.cjs');
require('@flemist/abort-controller-fast');
require('@flemist/time-limits');
require('../garbage-collect/garbageCollect.cjs');

describe('test > testVariants perf', function () {
    this.timeout(300000);
    it('sync', function () {
        return tslib.__awaiter(this, void 0, void 0, function* () {
            const testVariantsSync = testVariants_createTestVariants.createTestVariants(({ a, b, c }) => {
            });
            const args = {
                a: [1, 2],
                b: ['3', '4'],
                c: [true, false],
            };
            const perfResult = node.calcPerformance({
                time: 10000,
                funcs: [
                    () => {
                    },
                    () => {
                        testVariantsSync(args)();
                    },
                ],
            });
            const result = yield testVariantsSync(args)();
            perfResult.absoluteDiff = perfResult.absoluteDiff.map(o => o / result.iterations);
            console.log('testVariants perf:', result);
        });
    });
});
