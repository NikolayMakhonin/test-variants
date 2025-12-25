import { __awaiter } from 'tslib';
import { AbortControllerFast } from '@flemist/abort-controller-fast';
import { isPromiseLike, combineAbortSignals } from '@flemist/async-utils';
import { Pool } from '@flemist/time-limits';
import { garbageCollect } from '../garbage-collect/garbageCollect.mjs';
import { generateErrorVariantFilePath, readErrorVariantFiles, parseErrorVariantFile, saveErrorVariantFile } from './saveErrorVariants.mjs';
import * as path from 'path';
import 'fs';

function testVariantsRun(testRun, variants, options = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    return __awaiter(this, void 0, void 0, function* () {
        const saveErrorVariants = options.saveErrorVariants;
        const retriesPerVariant = (_a = saveErrorVariants === null || saveErrorVariants === void 0 ? void 0 : saveErrorVariants.retriesPerVariant) !== null && _a !== void 0 ? _a : 1;
        const sessionDate = new Date();
        const errorVariantFilePath = saveErrorVariants
            ? path.resolve(saveErrorVariants.dir, (_c = (_b = saveErrorVariants.getFilePath) === null || _b === void 0 ? void 0 : _b.call(saveErrorVariants, { sessionDate })) !== null && _c !== void 0 ? _c : generateErrorVariantFilePath({ sessionDate }))
            : null;
        // Replay phase: run previously saved error variants before normal iteration
        if (saveErrorVariants) {
            const files = yield readErrorVariantFiles(saveErrorVariants.dir);
            for (const filePath of files) {
                const args = yield parseErrorVariantFile(filePath, saveErrorVariants.jsonToArgs);
                for (let retry = 0; retry < retriesPerVariant; retry++) {
                    const promiseOrResult = testRun(args, -1, null);
                    if (isPromiseLike(promiseOrResult)) {
                        yield promiseOrResult;
                    }
                }
            }
        }
        const GC_Iterations = (_d = options.GC_Iterations) !== null && _d !== void 0 ? _d : 1000000;
        const GC_IterationsAsync = (_e = options.GC_IterationsAsync) !== null && _e !== void 0 ? _e : 10000;
        const GC_Interval = (_f = options.GC_Interval) !== null && _f !== void 0 ? _f : 1000;
        const logInterval = (_g = options.logInterval) !== null && _g !== void 0 ? _g : 5000;
        const logCompleted = (_h = options.logCompleted) !== null && _h !== void 0 ? _h : true;
        const abortSignalExternal = options.abortSignal;
        const findBestError = options.findBestError;
        const parallel = options.parallel === true
            ? Math.pow(2, 31)
            : !options.parallel || options.parallel <= 0
                ? 1
                : options.parallel;
        const limitVariantsCount = (_j = options.limitVariantsCount) !== null && _j !== void 0 ? _j : null;
        let cycleIndex = 0;
        let repeatIndex = 0;
        let seed = void 0;
        let bestError = null;
        let index = -1;
        let args = {};
        let variantsIterator = variants[Symbol.iterator]();
        function nextVariant() {
            while (true) {
                // Try next repeat for current variant
                if (findBestError && index >= 0 && (bestError == null || index < bestError.index)) {
                    repeatIndex++;
                    if (repeatIndex < findBestError.repeatsPerVariant) {
                        seed = findBestError.getSeed({
                            variantIndex: index,
                            cycleIndex,
                            repeatIndex,
                            totalIndex: cycleIndex * findBestError.repeatsPerVariant + repeatIndex,
                        });
                        return true;
                    }
                }
                repeatIndex = 0;
                index++;
                if (findBestError && cycleIndex >= findBestError.cycles) {
                    return false;
                }
                if ((limitVariantsCount == null || index < limitVariantsCount)
                    && (bestError == null || index < bestError.index)) {
                    const result = variantsIterator.next();
                    if (!result.done) {
                        args = result.value;
                        if (findBestError) {
                            seed = findBestError.getSeed({
                                variantIndex: index,
                                cycleIndex,
                                repeatIndex,
                                totalIndex: cycleIndex * findBestError.repeatsPerVariant + repeatIndex,
                            });
                        }
                        return true;
                    }
                }
                if (!findBestError) {
                    return false;
                }
                cycleIndex++;
                if (cycleIndex >= findBestError.cycles) {
                    return false;
                }
                index = -1;
                variantsIterator = variants[Symbol.iterator]();
            }
        }
        const abortControllerParallel = new AbortControllerFast();
        const abortSignalParallel = combineAbortSignals(abortSignalExternal, abortControllerParallel.signal);
        const abortSignalAll = abortSignalParallel;
        let debug = false;
        let iterations = 0;
        let iterationsAsync = 0;
        let prevLogTime = Date.now();
        let prevGC_Time = prevLogTime;
        let prevGC_Iterations = iterations;
        let prevGC_IterationsAsync = iterationsAsync;
        const pool = parallel <= 1
            ? null
            : new Pool(parallel);
        function onCompleted() {
            if (logCompleted) {
                console.log(`[test-variants] variants: ${index}, iterations: ${iterations}, async: ${iterationsAsync}`);
            }
        }
        function next() {
            return __awaiter(this, void 0, void 0, function* () {
                while (!(abortSignalExternal === null || abortSignalExternal === void 0 ? void 0 : abortSignalExternal.aborted) && (debug || nextVariant())) {
                    const _index = index;
                    const _args = Object.assign(Object.assign({}, args), { seed });
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
                    }
                    if (abortSignalExternal === null || abortSignalExternal === void 0 ? void 0 : abortSignalExternal.aborted) {
                        continue;
                    }
                    if (!pool || abortSignalParallel.aborted) {
                        try {
                            let promiseOrIterations = testRun(_args, _index, abortSignalParallel);
                            if (isPromiseLike(promiseOrIterations)) {
                                promiseOrIterations = yield promiseOrIterations;
                            }
                            if (!promiseOrIterations) {
                                debug = true;
                                abortControllerParallel.abort();
                                continue;
                            }
                            const { iterationsAsync: _iterationsAsync, iterationsSync: _iterationsSync } = promiseOrIterations;
                            iterationsAsync += _iterationsAsync;
                            iterations += _iterationsSync + _iterationsAsync;
                        }
                        catch (err) {
                            if (errorVariantFilePath) {
                                yield saveErrorVariantFile(_args, errorVariantFilePath, saveErrorVariants.argsToJson);
                            }
                            if (findBestError) {
                                bestError = {
                                    error: err,
                                    args: _args,
                                    index: _index,
                                };
                                debug = false;
                            }
                            else {
                                throw err;
                            }
                        }
                    }
                    else {
                        if (!pool.hold(1)) {
                            yield pool.holdWait(1);
                        }
                        // eslint-disable-next-line @typescript-eslint/no-loop-func
                        void (() => __awaiter(this, void 0, void 0, function* () {
                            try {
                                if (abortSignalParallel === null || abortSignalParallel === void 0 ? void 0 : abortSignalParallel.aborted) {
                                    return;
                                }
                                let promiseOrIterations = testRun(_args, _index, abortSignalParallel);
                                if (isPromiseLike(promiseOrIterations)) {
                                    promiseOrIterations = yield promiseOrIterations;
                                }
                                if (!promiseOrIterations) {
                                    debug = true;
                                    abortControllerParallel.abort();
                                    return;
                                }
                                const { iterationsAsync: _iterationsAsync, iterationsSync: _iterationsSync } = promiseOrIterations;
                                iterationsAsync += _iterationsAsync;
                                iterations += _iterationsSync + _iterationsAsync;
                            }
                            catch (err) {
                                if (errorVariantFilePath) {
                                    yield saveErrorVariantFile(_args, errorVariantFilePath, saveErrorVariants.argsToJson);
                                }
                                if (findBestError) {
                                    bestError = {
                                        error: err,
                                        args: _args,
                                        index: _index,
                                    };
                                    debug = false;
                                }
                                else {
                                    throw err;
                                }
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
        const result = yield next();
        return {
            iterations: result,
            bestError,
        };
    });
}

export { testVariantsRun };
