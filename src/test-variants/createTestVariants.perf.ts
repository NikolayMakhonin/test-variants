import { calcPerformance } from 'rdtsc'
import {createTestVariants, createTestVariantsSync} from './createTestVariants'

describe('test > testVariants perf', function () {
	this.timeout(300000)

	it('sync/async', function () {
		let value = 0
		const testVariantsAsync = createTestVariants(({a, b, c}: {a: number, b: string, c: boolean}) => {
			if (a === 1 && b === '4' && c === false) {
				value++
			}
		})
		const testVariantsSync = createTestVariantsSync(({a, b, c}: {a: number, b: string, c: boolean}) => {
			if (a === 1 && b === '4' && c === false) {
				value++
			}
		})

		const args = {
			a: [1, 2],
			b: ['3', '4'],
			c: [true, false],
		}

		const result = calcPerformance(
			10000,
			() => {

			},
			() => {
				testVariantsSync(args)
			},
			() => {
				testVariantsAsync(args)
			},
		)

		const count = testVariantsSync(args)

		result.absoluteDiff = result.absoluteDiff.map(o => o / count)

		console.log('testVariants perf:', result)
	})
})
