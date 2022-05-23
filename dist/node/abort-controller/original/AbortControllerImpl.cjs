'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var abortController_original_AbortSignalImpl = require('./AbortSignalImpl.cjs');
var abortController_original_helpers = require('./helpers.cjs');
require('./DOMException.cjs');
require('./DOMExceptionImpl.cjs');
require('./EventTarget.cjs');
require('./EventTargetImpl.cjs');

const kSignal = Symbol('kSignal');
class AbortController {
    constructor() {
        // @ts-ignore
        this[kSignal] = abortController_original_AbortSignalImpl.createAbortSignal();
    }
    get signal() {
        abortController_original_helpers.assertThis(this, AbortController);
        return this[kSignal];
    }
    abort(reason) {
        abortController_original_helpers.assertThis(this, AbortController);
        // @ts-ignore
        abortController_original_AbortSignalImpl.abortSignalAbort(this.signal, reason);
    }
}

exports.AbortControllerImpl = AbortController;
