'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var tslib = require('tslib');
var garbageCollect_garbageCollect = require('../garbage-collect/garbageCollect.cjs');

/* eslint-disable @typescript-eslint/no-shadow */
function createTestVariants(test) {
    return function testVariantsArgs(args) {
        return function testVariantsCall({ GC_Iterations = 1000000, GC_IterationsAsync = 10000, GC_Interval = 1000, logInterval = 5000, logCompleted = true, } = {}) {
            const argsKeys = Object.keys(args);
            const argsValues = Object.values(args);
            const argsLength = argsKeys.length;
            const variantArgs = {};
            function getArgValues(nArg) {
                let argValues = argsValues[nArg];
                if (typeof argValues === 'function') {
                    argValues = argValues(variantArgs);
                }
                return argValues;
            }
            const indexes = [];
            const values = [];
            for (let nArg = 0; nArg < argsLength; nArg++) {
                indexes[nArg] = -1;
                values[nArg] = [];
            }
            values[0] = getArgValues(0);
            function nextVariant() {
                for (let nArg = argsLength - 1; nArg >= 0; nArg--) {
                    const index = indexes[nArg] + 1;
                    if (index < values[nArg].length) {
                        indexes[nArg] = index;
                        variantArgs[argsKeys[nArg]] = values[nArg][index];
                        for (nArg++; nArg < argsLength; nArg++) {
                            const argValues = getArgValues(nArg);
                            if (argValues.length === 0) {
                                break;
                            }
                            indexes[nArg] = 0;
                            values[nArg] = argValues;
                            variantArgs[argsKeys[nArg]] = argValues[0];
                        }
                        if (nArg >= argsLength) {
                            return true;
                        }
                    }
                }
                return false;
            }
            let iterations = 0;
            let iterationsAsync = 0;
            let debug = false;
            let debugIteration = 0;
            function onError(err) {
                return tslib.__awaiter(this, void 0, void 0, function* () {
                    console.error(JSON.stringify(variantArgs, null, 2));
                    console.error(err);
                    // rerun failed variant 5 times for debug
                    const time0 = Date.now();
                    // eslint-disable-next-line no-debugger
                    debugger;
                    if (Date.now() - time0 > 50 && debugIteration < 5) {
                        console.log('DEBUG ITERATION: ' + debugIteration);
                        debug = true;
                        yield next();
                        debugIteration++;
                    }
                    throw err;
                });
            }
            function onCompleted() {
                if (logCompleted) {
                    console.log('variants: ' + iterations);
                }
            }
            let prevLogTime = Date.now();
            let prevGC_Time = prevLogTime;
            let prevGC_Iterations = iterations;
            let prevGC_IterationsAsync = iterationsAsync;
            function next() {
                return tslib.__awaiter(this, void 0, void 0, function* () {
                    try {
                        while (debug || nextVariant()) {
                            const now = (logInterval || GC_Interval) && Date.now();
                            if (logInterval && now - prevLogTime >= logInterval) {
                                // the log is required to prevent the karma browserNoActivityTimeout
                                console.log(iterations);
                                prevLogTime = now;
                            }
                            if (GC_Iterations && iterations - prevGC_Iterations >= GC_Iterations
                                || GC_IterationsAsync && iterationsAsync - prevGC_IterationsAsync >= GC_IterationsAsync
                                || GC_Interval && now - prevGC_Time >= GC_Interval) {
                                prevGC_Iterations = iterations;
                                prevGC_IterationsAsync = iterationsAsync;
                                prevGC_Time = now;
                                yield garbageCollect_garbageCollect.garbageCollect(1);
                                continue;
                            }
                            const promiseOrIterations = test(variantArgs);
                            if (typeof promiseOrIterations === 'object'
                                && promiseOrIterations
                                && typeof promiseOrIterations.then === 'function') {
                                const value = yield promiseOrIterations;
                                const newIterations = typeof value === 'number' ? value : 1;
                                iterationsAsync += newIterations;
                                iterations += newIterations;
                                continue;
                            }
                            iterations += typeof promiseOrIterations === 'number' ? promiseOrIterations : 1;
                        }
                    }
                    catch (err) {
                        yield onError(err);
                    }
                    onCompleted();
                    yield garbageCollect_garbageCollect.garbageCollect(1);
                    return iterations;
                });
            }
            return next();
        };
    };
}

exports.createTestVariants = createTestVariants;
