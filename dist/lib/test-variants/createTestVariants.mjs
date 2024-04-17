import { __awaiter } from 'tslib';
import { garbageCollect } from '../garbage-collect/garbageCollect.mjs';
import { AbortControllerFast } from '@flemist/abort-controller-fast';
import { Pool } from '@flemist/time-limits';
import { combineAbortSignals } from '@flemist/async-utils';

/* eslint-disable @typescript-eslint/no-shadow */
function isPromiseLike(value) {
    return typeof value === 'object'
        && value
        && typeof value.then === 'function';
}
function createTestVariants(test) {
    return function testVariantsArgs(args) {
        return function testVariantsCall({ GC_Iterations = 1000000, GC_IterationsAsync = 10000, GC_Interval = 1000, logInterval = 5000, logCompleted = true, onError: onErrorCallback = null, abortSignal: abortSignalExternal = null, parallel: _parallel, } = {}) {
            const abortControllerParallel = new AbortControllerFast();
            const abortSignalParallel = combineAbortSignals(abortSignalExternal, abortControllerParallel.signal);
            const abortSignalAll = abortSignalParallel;
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
            function onError(error, iterations, variantArgs) {
                return __awaiter(this, void 0, void 0, function* () {
                    abortControllerParallel.abort(error);
                    console.error(`error variant: ${iterations}\r\n${JSON.stringify(variantArgs, (_, value) => {
                        if (value
                            && typeof value === 'object'
                            && !Array.isArray(value)
                            && value.constructor !== Object) {
                            return value + '';
                        }
                        return value;
                    }, 2)}`);
                    console.error(error);
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
                    if (onErrorCallback) {
                        onErrorCallback({
                            iteration: iterations,
                            variant: variantArgs,
                            error,
                        });
                    }
                    throw error;
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
            const parallel = _parallel === true
                ? Math.pow(2, 31)
                : !_parallel || _parallel <= 0
                    ? 1
                    : _parallel;
            const pool = parallel <= 1
                ? null
                : new Pool(parallel);
            function runTest(_iterations, variantArgs, abortSignal) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        const promiseOrIterations = test(variantArgs, abortSignal);
                        if (isPromiseLike(promiseOrIterations)) {
                            const value = yield promiseOrIterations;
                            const newIterations = typeof value === 'number' ? value : 1;
                            iterationsAsync += newIterations;
                            iterations += newIterations;
                            return;
                        }
                        iterations += typeof promiseOrIterations === 'number' ? promiseOrIterations : 1;
                    }
                    catch (err) {
                        yield onError(err, _iterations, variantArgs);
                    }
                });
            }
            function next() {
                return __awaiter(this, void 0, void 0, function* () {
                    while (!(abortSignalExternal === null || abortSignalExternal === void 0 ? void 0 : abortSignalExternal.aborted) && (debug || nextVariant())) {
                        const _iterations = iterations;
                        const _variantArgs = !pool
                            ? variantArgs
                            : Object.assign({}, variantArgs);
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
                            yield garbageCollect(1);
                            continue;
                        }
                        if (abortSignalExternal === null || abortSignalExternal === void 0 ? void 0 : abortSignalExternal.aborted) {
                            continue;
                        }
                        if (!pool || abortSignalParallel.aborted) {
                            yield runTest(_iterations, _variantArgs, abortSignalExternal);
                        }
                        else {
                            if (!pool.hold(1)) {
                                yield pool.holdWait(1);
                            }
                            void (() => __awaiter(this, void 0, void 0, function* () {
                                try {
                                    if (abortSignalParallel === null || abortSignalParallel === void 0 ? void 0 : abortSignalParallel.aborted) {
                                        return;
                                    }
                                    yield runTest(_iterations, _variantArgs, abortSignalParallel);
                                }
                                finally {
                                    void pool.release(1);
                                }
                            }))();
                        }
                    }
                    if (pool) {
                        yield pool.holdWait(parallel);
                        void pool.release(parallel);
                    }
                    if (abortSignalAll === null || abortSignalAll === void 0 ? void 0 : abortSignalAll.aborted) {
                        throw abortSignalAll.reason;
                    }
                    onCompleted();
                    yield garbageCollect(1);
                    return iterations;
                });
            }
            return next();
        };
    };
}

export { createTestVariants };
