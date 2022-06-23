'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/** Wait for garbage collection and return 0. It may be required for very long calculations. */
function garbageCollect(iterations) {
    if (iterations == null || iterations <= 0) {
        throw new Error(`Iterations = ${iterations}`);
    }
    iterations--;
    const promise = new Promise(resolve => {
        setTimeout(() => {
            resolve(iterations);
        }, 100);
    });
    return iterations <= 0
        ? promise
        : promise.then(garbageCollect);
}

exports.garbageCollect = garbageCollect;
