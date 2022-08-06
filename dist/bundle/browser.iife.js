var testVariants = (function (exports) {
    'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    /** Wait for garbage collection and return 0. It may be required for very long calculations. */
    function garbageCollect(iterations) {
        if (iterations == null || iterations <= 0) {
            throw new Error("Iterations = ".concat(iterations));
        }
        iterations--;
        // const time0 = Date.now()
        var promise = new Promise(function (resolve) {
            setTimeout(function () {
                resolve(iterations);
            }, 1);
        });
        return iterations <= 0
            ? promise
            : promise.then(garbageCollect);
        // : promise.then(o => {
        //   const gcTime = Date.now() - time0
        //   if (gcTime > 50) {
        //     console.log('GC time: ' + gcTime)
        //     o++
        //   }
        //   return garbageCollect(o)
        // })
    }

    /* eslint-disable @typescript-eslint/no-shadow */
    function createTestVariants(test) {
        return function testVariantsArgs(args) {
            return function testVariantsCall(_a) {
                var _b = _a === void 0 ? {} : _a, _c = _b.GC_Iterations, GC_Iterations = _c === void 0 ? 1000000 : _c, _d = _b.GC_IterationsAsync, GC_IterationsAsync = _d === void 0 ? 10000 : _d, _e = _b.GC_Interval, GC_Interval = _e === void 0 ? 1000 : _e, _f = _b.logInterval, logInterval = _f === void 0 ? 5000 : _f, _g = _b.logCompleted, logCompleted = _g === void 0 ? true : _g, _h = _b.onError, onErrorCallback = _h === void 0 ? null : _h, abortSignal = _b.abortSignal;
                var argsKeys = Object.keys(args);
                var argsValues = Object.values(args);
                var argsLength = argsKeys.length;
                var variantArgs = {};
                function getArgValues(nArg) {
                    var argValues = argsValues[nArg];
                    if (typeof argValues === 'function') {
                        argValues = argValues(variantArgs);
                    }
                    return argValues;
                }
                var indexes = [];
                var values = [];
                for (var nArg = 0; nArg < argsLength; nArg++) {
                    indexes[nArg] = -1;
                    values[nArg] = [];
                }
                values[0] = getArgValues(0);
                function nextVariant() {
                    for (var nArg = argsLength - 1; nArg >= 0; nArg--) {
                        var index = indexes[nArg] + 1;
                        if (index < values[nArg].length) {
                            indexes[nArg] = index;
                            variantArgs[argsKeys[nArg]] = values[nArg][index];
                            for (nArg++; nArg < argsLength; nArg++) {
                                var argValues = getArgValues(nArg);
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
                var iterations = 0;
                var iterationsAsync = 0;
                var debug = false;
                var debugIteration = 0;
                function onError(error) {
                    return __awaiter(this, void 0, void 0, function () {
                        var time0;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    console.error("error variant: ".concat(iterations, "\r\n").concat(JSON.stringify(variantArgs, null, 2)));
                                    console.error(error);
                                    time0 = Date.now();
                                    // eslint-disable-next-line no-debugger
                                    debugger;
                                    if (!(Date.now() - time0 > 50 && debugIteration < 5)) return [3 /*break*/, 2];
                                    console.log('DEBUG ITERATION: ' + debugIteration);
                                    debug = true;
                                    return [4 /*yield*/, next()];
                                case 1:
                                    _a.sent();
                                    debugIteration++;
                                    _a.label = 2;
                                case 2:
                                    if (onErrorCallback) {
                                        onErrorCallback({
                                            iteration: iterations,
                                            variant: variantArgs,
                                            error: error,
                                        });
                                    }
                                    throw error;
                            }
                        });
                    });
                }
                function onCompleted() {
                    if (logCompleted) {
                        console.log('variants: ' + iterations);
                    }
                }
                var prevLogTime = Date.now();
                var prevGC_Time = prevLogTime;
                var prevGC_Iterations = iterations;
                var prevGC_IterationsAsync = iterationsAsync;
                function next() {
                    return __awaiter(this, void 0, void 0, function () {
                        var now, promiseOrIterations, value, newIterations, err_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 7, , 9]);
                                    _a.label = 1;
                                case 1:
                                    if (!(!(abortSignal === null || abortSignal === void 0 ? void 0 : abortSignal.aborted) && (debug || nextVariant()))) return [3 /*break*/, 6];
                                    now = (logInterval || GC_Interval) && Date.now();
                                    if (logInterval && now - prevLogTime >= logInterval) {
                                        // the log is required to prevent the karma browserNoActivityTimeout
                                        console.log(iterations);
                                        prevLogTime = now;
                                    }
                                    if (!(GC_Iterations && iterations - prevGC_Iterations >= GC_Iterations
                                        || GC_IterationsAsync && iterationsAsync - prevGC_IterationsAsync >= GC_IterationsAsync
                                        || GC_Interval && now - prevGC_Time >= GC_Interval)) return [3 /*break*/, 3];
                                    prevGC_Iterations = iterations;
                                    prevGC_IterationsAsync = iterationsAsync;
                                    prevGC_Time = now;
                                    return [4 /*yield*/, garbageCollect(1)];
                                case 2:
                                    _a.sent();
                                    return [3 /*break*/, 1];
                                case 3:
                                    promiseOrIterations = test(variantArgs);
                                    if (!(typeof promiseOrIterations === 'object'
                                        && promiseOrIterations
                                        && typeof promiseOrIterations.then === 'function')) return [3 /*break*/, 5];
                                    return [4 /*yield*/, promiseOrIterations];
                                case 4:
                                    value = _a.sent();
                                    newIterations = typeof value === 'number' ? value : 1;
                                    iterationsAsync += newIterations;
                                    iterations += newIterations;
                                    return [3 /*break*/, 1];
                                case 5:
                                    iterations += typeof promiseOrIterations === 'number' ? promiseOrIterations : 1;
                                    return [3 /*break*/, 1];
                                case 6: return [3 /*break*/, 9];
                                case 7:
                                    err_1 = _a.sent();
                                    return [4 /*yield*/, onError(err_1)];
                                case 8:
                                    _a.sent();
                                    return [3 /*break*/, 9];
                                case 9:
                                    if (abortSignal === null || abortSignal === void 0 ? void 0 : abortSignal.aborted) {
                                        throw abortSignal.reason;
                                    }
                                    onCompleted();
                                    return [4 /*yield*/, garbageCollect(1)];
                                case 10:
                                    _a.sent();
                                    return [2 /*return*/, iterations];
                            }
                        });
                    });
                }
                return next();
            };
        };
    }

    exports.createTestVariants = createTestVariants;

    Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: 'Module' } });

    return exports;

})({});
