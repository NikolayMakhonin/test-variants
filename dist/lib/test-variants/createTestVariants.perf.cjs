'use strict';

var rdtsc = require('rdtsc');
var testVariants_createTestVariants = require('./createTestVariants.cjs');
require('tslib');
require('../garbage-collect/garbageCollect.cjs');
require('@flemist/abort-controller-fast');
require('@flemist/time-limits');
require('@flemist/async-utils');

describe('test > testVariants perf', function () {
    this.timeout(300000);
    it('sync', function () {
        let value = 0;
        const testVariantsSync = testVariants_createTestVariants.createTestVariants(({ a, b, c }) => {
            if (a === 1 && b === '4' && c === false) {
                value++;
            }
        });
        const args = {
            a: [1, 2],
            b: ['3', '4'],
            c: [true, false],
        };
        const result = rdtsc.calcPerformance(10000, () => {
        }, () => {
        });
        const count = testVariantsSync(args)();
        result.absoluteDiff = result.absoluteDiff.map(o => o / count);
        console.log('testVariants perf:', result);
    });
});
