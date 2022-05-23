'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var abortController_contracts = require('./abort-controller/contracts.cjs');
var abortController_original_AbortControllerImpl = require('./abort-controller/original/AbortControllerImpl.cjs');
var abortController_fast_wrappers = require('./abort-controller/fast/wrappers.cjs');
var abortController_fast_AbortControllerFast = require('./abort-controller/fast/AbortControllerFast.cjs');
require('./abort-controller/original/AbortSignalImpl.cjs');
require('./abort-controller/original/helpers.cjs');
require('./abort-controller/original/DOMException.cjs');
require('./abort-controller/original/DOMExceptionImpl.cjs');
require('./abort-controller/original/EventTarget.cjs');
require('./abort-controller/original/EventTargetImpl.cjs');
require('./abort-controller/fast/AbortError.cjs');
require('./abort-controller/fast/AbortSignalFast.cjs');



exports.AbortControllerClass = abortController_contracts.AbortControllerClass;
exports.AbortSignalClass = abortController_contracts.AbortSignalClass;
exports.AbortControllerImpl = abortController_original_AbortControllerImpl.AbortControllerImpl;
exports.toAbortController = abortController_fast_wrappers.toAbortController;
exports.toAbortControllerFast = abortController_fast_wrappers.toAbortControllerFast;
exports.toAbortSignal = abortController_fast_wrappers.toAbortSignal;
exports.toAbortSignalFast = abortController_fast_wrappers.toAbortSignalFast;
exports.AbortControllerFast = abortController_fast_AbortControllerFast.AbortControllerFast;
