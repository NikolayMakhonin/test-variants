'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var abortController_fast_AbortControllerFast = require('./AbortControllerFast.cjs');
var abortController_fast_AbortError = require('./AbortError.cjs');
var abortController_original_AbortControllerImpl = require('../original/AbortControllerImpl.cjs');
require('./AbortSignalFast.cjs');
require('../original/AbortSignalImpl.cjs');
require('../original/helpers.cjs');
require('../original/DOMException.cjs');
require('../original/DOMExceptionImpl.cjs');
require('../original/EventTarget.cjs');
require('../original/EventTargetImpl.cjs');

function toAbortSignal(abortSignalFast) {
    const abortController = new abortController_original_AbortControllerImpl.AbortControllerImpl();
    abortSignalFast.subscribe((reason) => {
        abortController.abort(reason);
    });
    return abortController.signal;
}
function toAbortSignalFast(abortSignal) {
    const abortControllerFast = new abortController_fast_AbortControllerFast.AbortControllerFast();
    function onAbort(reason) {
        abortControllerFast.abort(reason);
    }
    abortSignal.addEventListener('abort', onAbort);
    return abortControllerFast.signal;
}
function toAbortController(abortControllerFast) {
    const abortController = new abortController_original_AbortControllerImpl.AbortControllerImpl();
    abortControllerFast.signal.subscribe((reason) => {
        if (reason instanceof abortController_fast_AbortError.AbortError) {
            reason = reason.reason;
        }
        abortController.abort(reason);
    });
    return abortController;
}
function toAbortControllerFast(abortController) {
    const abortControllerFast = new abortController_fast_AbortControllerFast.AbortControllerFast();
    function onAbort(event) {
        abortControllerFast.abort(this.reason);
    }
    abortController.signal.addEventListener('abort', onAbort);
    return abortControllerFast;
}

exports.toAbortController = toAbortController;
exports.toAbortControllerFast = toAbortControllerFast;
exports.toAbortSignal = toAbortSignal;
exports.toAbortSignalFast = toAbortSignalFast;
