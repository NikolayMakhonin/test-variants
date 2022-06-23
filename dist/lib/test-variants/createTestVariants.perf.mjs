import { calcPerformance } from 'rdtsc';
import { createTestVariants } from './createTestVariants.mjs';
import 'tslib';
import '../garbage-collect/garbageCollect.mjs';

describe('test > testVariants perf', function () {
    this.timeout(300000);
    it('sync', function () {
        let value = 0;
        const testVariantsSync = createTestVariants(({ a, b, c }) => {
            if (a === 1 && b === '4' && c === false) {
                value++;
            }
        });
        const args = {
            a: [1, 2],
            b: ['3', '4'],
            c: [true, false],
        };
        const result = calcPerformance(10000, () => {
        }, () => {
        });
        const count = testVariantsSync(args)();
        result.absoluteDiff = result.absoluteDiff.map(o => o / count);
        console.log('testVariants perf:', result);
    });
});
