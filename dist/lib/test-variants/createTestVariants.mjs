/* eslint-disable @typescript-eslint/no-shadow */
function createTestVariants(test) {
    return function testVariantsArgs(args) {
        return function testVariantsCall({ pauseIterationsAsync = 10000, pauseInterval = 1000, pauseTime = 10, logInterval = 10000, logCompleted = true, } = {}) {
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
                console.error(JSON.stringify(variantArgs, null, 2));
                console.error(err);
                // rerun failed variant 5 times for debug
                const time0 = Date.now();
                // eslint-disable-next-line no-debugger
                debugger;
                if (Date.now() - time0 > 50 && debugIteration < 5) {
                    console.log('DEBUG ITERATION: ' + debugIteration);
                    debug = true;
                    next(0);
                    debugIteration++;
                }
                throw err;
            }
            function onCompleted() {
                if (logCompleted) {
                    console.log('variants: ' + iterations);
                }
            }
            let prevLogTime = Date.now();
            let prevPauseTime = prevLogTime;
            let prevPauseIterationsAsync = iterationsAsync;
            function next(value) {
                const newIterations = typeof value === 'number' ? value : 1;
                iterationsAsync += newIterations;
                iterations += typeof value === 'number' ? value : 1;
                while (debug || nextVariant()) {
                    try {
                        const now = (logInterval || pauseInterval) && Date.now();
                        if (logInterval && now - prevLogTime >= logInterval) {
                            // the log is required to prevent the karma browserNoActivityTimeout
                            console.log(iterations);
                            prevLogTime = now;
                        }
                        if (pauseIterationsAsync && iterationsAsync - prevPauseIterationsAsync >= pauseIterationsAsync
                            || pauseInterval && now - prevPauseTime >= pauseInterval) {
                            prevPauseTime = now;
                            prevPauseIterationsAsync = iterationsAsync;
                            const pausePromise = pauseTime
                                ? new Promise(resolve => {
                                    setTimeout(() => {
                                        resolve(0);
                                    }, pauseTime);
                                })
                                : Promise.resolve(0);
                            return pausePromise.then(next);
                        }
                        const promiseOrIterations = test(variantArgs);
                        if (typeof promiseOrIterations === 'object'
                            && promiseOrIterations
                            && typeof promiseOrIterations.then === 'function') {
                            return promiseOrIterations.then(next, onError);
                        }
                        iterations += typeof promiseOrIterations === 'number' ? promiseOrIterations : 1;
                    }
                    catch (err) {
                        onError(err);
                    }
                }
                onCompleted();
                return iterations;
            }
            return next(0);
        };
    };
}

export { createTestVariants };
