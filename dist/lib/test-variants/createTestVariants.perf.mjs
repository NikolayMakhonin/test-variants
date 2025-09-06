import { __awaiter } from 'tslib';
import { calcPerformance } from 'rdtsc/node';
import { createTestVariants } from './createTestVariants.mjs';
import './testVariantsIterable.mjs';
import './testVariantsCreateTestRun.mjs';
import '@flemist/async-utils';
import './argsToString.mjs';
import './testVariantsRun.mjs';
import '@flemist/abort-controller-fast';
import '@flemist/time-limits';
import '../garbage-collect/garbageCollect.mjs';

describe('test > testVariants perf', function () {
    this.timeout(300000);
    it('sync', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const testVariantsSync = createTestVariants(({ a, b, c }) => {
            });
            const args = {
                a: [1, 2],
                b: ['3', '4'],
                c: [true, false],
            };
            const perfResult = calcPerformance({
                time: 10000,
                funcs: [
                    () => {
                    },
                    () => {
                        testVariantsSync(args)();
                    },
                ],
            });
            const result = yield testVariantsSync(args)();
            perfResult.absoluteDiff = perfResult.absoluteDiff.map(o => o / result.iterations);
            console.log('testVariants perf:', result);
        });
    });
});
