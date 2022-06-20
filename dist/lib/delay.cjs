'use strict';

function delay(milliseconds, abortSignal) {
    return new Promise(resolve => {
        if (abortSignal && abortSignal.aborted) {
            resolve();
            return;
        }
        const timer = setTimeout(resolve, milliseconds);
        if (abortSignal) {
            abortSignal.addEventListener('abort', () => {
                clearTimeout(timer);
                resolve();
            });
        }
    });
}

exports.delay = delay;
