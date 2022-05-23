'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var abortController_fast_AbortSignalFast = require('./AbortSignalFast.cjs');
var abortController_fast_AbortError = require('./AbortError.cjs');

class AbortControllerFast {
    constructor() {
        this.signal = new abortController_fast_AbortSignalFast.AbortSignalFast();
    }
    abort(reason) {
        if (this.signal.aborted) {
            return;
        }
        if (!(reason instanceof Error)) {
            reason = new abortController_fast_AbortError.AbortError('Aborted' + (typeof reason === 'undefined' ? '' : ' with reason: ' + (reason === null || reason === void 0 ? void 0 : reason.toString())), reason);
        }
        this.signal.abort(reason);
    }
}

exports.AbortControllerFast = AbortControllerFast;
