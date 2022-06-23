'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var testVariants_createTestVariants = require('./test-variants/createTestVariants.cjs');
require('tslib');
require('./garbage-collect/garbageCollect.cjs');



exports.createTestVariants = testVariants_createTestVariants.createTestVariants;
