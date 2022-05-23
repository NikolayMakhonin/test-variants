'use strict';

var rdtsc = require('rdtsc');
var testVariants_createTestVariants = require('./createTestVariants.cjs');

describe('test > testVariants perf', function () {
    this.timeout(300000);
    it('sync/async', function () {
        const testVariantsAsync = testVariants_createTestVariants.createTestVariants(({ a, b, c }) => {
        });
        const testVariantsSync = testVariants_createTestVariants.createTestVariantsSync(({ a, b, c }) => {
        });
        const args = {
            a: [1, 2],
            b: ['3', '4'],
            c: [true, false],
        };
        const result = rdtsc.calcPerformance(10000, () => {
        }, () => {
            testVariantsSync(args);
        }, () => {
            testVariantsAsync(args);
        });
        const count = testVariantsSync(args);
        result.absoluteDiff = result.absoluteDiff.map(o => o / count);
        console.log('testVariants perf:', result);
    });
});
