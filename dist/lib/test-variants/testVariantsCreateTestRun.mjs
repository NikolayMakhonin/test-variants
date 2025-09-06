import { __awaiter } from 'tslib';
import { isPromiseLike } from '@flemist/async-utils';
import { argsToString } from './argsToString.mjs';

function testVariantsCreateTestRun(test, options) {
    let debugIteration = 0;
    let errorEvent = null;
    function onError(error, args, index) {
        return __awaiter(this, void 0, void 0, function* () {
            errorEvent = {
                error,
                args,
                index: index,
            };
            console.error(`[test-variants] error variant: ${index}\n${argsToString(args)}`);
            console.error(error);
            // Rerun failed variant 5 times for debug
            const time0 = Date.now();
            // Will stop execution right before next error iteration for step-by-step debugging
            // eslint-disable-next-line no-debugger
            debugger;
            if (Date.now() - time0 > 50 && debugIteration < 5) {
                console.log('[test-variants] DEBUG ITERATION: ' + debugIteration);
                debugIteration++;
                return;
            }
            if (options.onError) {
                yield options.onError(errorEvent);
            }
            throw errorEvent.error;
        });
    }
    return function testRun(args, index, abortSignal) {
        try {
            const promiseOrIterations = test(args, abortSignal);
            if (isPromiseLike(promiseOrIterations)) {
                return promiseOrIterations.then(value => {
                    if (typeof value === 'number') {
                        return {
                            iterationsAsync: value,
                            iterationsSync: 0,
                        };
                    }
                    if (value !== null && typeof value === 'object') {
                        return value;
                    }
                    return {
                        iterationsAsync: 1,
                        iterationsSync: 0,
                    };
                }, err => {
                    return onError(err, args, index);
                });
            }
            const value = promiseOrIterations;
            if (typeof value === 'number') {
                return {
                    iterationsAsync: 0,
                    iterationsSync: value,
                };
            }
            if (value !== null && typeof value === 'object') {
                return value;
            }
            return {
                iterationsAsync: 0,
                iterationsSync: 1,
            };
        }
        catch (err) {
            return onError(err, args, index);
        }
    };
}

export { testVariantsCreateTestRun };
