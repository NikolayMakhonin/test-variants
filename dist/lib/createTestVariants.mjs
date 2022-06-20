/* eslint-disable @typescript-eslint/no-shadow */
function createTestVariants(test) {
    return function testVariantsArgs(args) {
        return function testVariantsCall({ forceAwaitInterval, } = {}) {
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
                    debug = true;
                    next(0);
                    debugIteration++;
                }
                throw err;
            }
            function next(value) {
                iterations += typeof value === 'number' ? value : 1;
                const time0 = forceAwaitInterval && Date.now();
                while (debug || nextVariant()) {
                    try {
                        const promiseOrIterations = test(variantArgs);
                        if (typeof promiseOrIterations === 'object'
                            && promiseOrIterations
                            && typeof promiseOrIterations.then === 'function') {
                            return promiseOrIterations.then(next).catch(onError);
                        }
                        if (forceAwaitInterval && Date.now() - time0 >= forceAwaitInterval) {
                            return Promise.resolve(promiseOrIterations).then(next);
                        }
                        iterations += typeof promiseOrIterations === 'number' ? promiseOrIterations : 1;
                    }
                    catch (err) {
                        onError(err);
                    }
                }
                return iterations;
            }
            return next(0);
        };
    };
}

export { createTestVariants as c };
