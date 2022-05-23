'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var abortController_original_DOMExceptionImpl = require('./DOMExceptionImpl.cjs');

const _DOMException = (() => {
    try {
        if (typeof DOMException !== 'undefined') {
            new DOMException();
            return DOMException;
        }
    }
    catch (_a) { }
    return abortController_original_DOMExceptionImpl.DOMExceptionImpl;
})();

exports.DOMException = _DOMException;
