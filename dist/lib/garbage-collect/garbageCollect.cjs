'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/** Wait for garbage collection and return 0. It may be required for very long calculations. */
function garbageCollect(iterations) {
    if (iterations == null || iterations <= 0) {
        throw new Error(`Iterations = ${iterations}`);
    }
    iterations--;
    // const time0 = Date.now()
    const promise = new Promise(resolve => {
        setTimeout(() => {
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

exports.garbageCollect = garbageCollect;
