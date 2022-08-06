'use strict';

Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: 'Module' } });

const testVariants_createTestVariants = require('./test-variants/createTestVariants.cjs');
require('./garbage-collect/garbageCollect.cjs');



exports.createTestVariants = testVariants_createTestVariants.createTestVariants;
