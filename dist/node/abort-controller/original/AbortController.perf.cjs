'use strict';

var rdtsc = require('rdtsc');
require('./AbortSignalImpl.cjs');
require('../test/helpers.cjs');
require('./helpers.cjs');
require('./DOMException.cjs');
require('./DOMExceptionImpl.cjs');
require('./EventTarget.cjs');
require('./EventTargetImpl.cjs');

describe('abort-controller > AbortController', function () {
    this.timeout(600000);
    const onAbort1 = o => o;
    const onAbort2 = o => o;
    const onAbort3 = o => o;
    let set;
    it('constructor', function () {
        const result = rdtsc.calcPerformance(10000, () => {
        }, () => {
            set = new Set();
        }, () => {
            set.add(onAbort1);
            set.add(onAbort2);
            set.add(onAbort3);
            set.forEach(o => o('abort'));
            set.delete(onAbort1);
            set.delete(onAbort2);
            set.delete(onAbort3);
        });
        console.log(result);
    });
});
