'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var abortController_fast_wrappers = require('./wrappers.cjs');
var abortController_fast_AbortControllerFast = require('./AbortControllerFast.cjs');
require('./AbortError.cjs');
require('../original/AbortControllerImpl.cjs');
require('../original/AbortSignalImpl.cjs');
require('../original/helpers.cjs');
require('../original/DOMException.cjs');
require('../original/DOMExceptionImpl.cjs');
require('../original/EventTarget.cjs');
require('../original/EventTargetImpl.cjs');
require('./AbortSignalFast.cjs');



exports.toAbortController = abortController_fast_wrappers.toAbortController;
exports.toAbortControllerFast = abortController_fast_wrappers.toAbortControllerFast;
exports.toAbortSignal = abortController_fast_wrappers.toAbortSignal;
exports.toAbortSignalFast = abortController_fast_wrappers.toAbortSignalFast;
exports.AbortControllerFast = abortController_fast_AbortControllerFast.AbortControllerFast;
