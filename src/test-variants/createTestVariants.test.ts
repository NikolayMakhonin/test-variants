/* eslint-disable @typescript-eslint/no-shadow */
import {createTestVariants, createTestVariantsSync} from './createTestVariants'
import {delay} from '../helpers/test/delay'

describe('test > testVariants', function () {
	describe('sync', function () {
		it('base', function () {
			const result = []
			const count = createTestVariantsSync(({a, b, c}: { a: number, b: string, c: boolean }) => {
				result.push([a, b, c])
			})({
				a: [1, 2],
				b: ['3', '4'],
				c: [true, false],
			})

			assert.deepStrictEqual(result, [
				[1, '3', true],
				[1, '3', false],
				[1, '4', true],
				[1, '4', false],
				[2, '3', true],
				[2, '3', false],
				[2, '4', true],
				[2, '4', false],
			])
			assert.strictEqual(count, result.length)
		})

		it('empty end', function () {
			const result = []
			const count = createTestVariantsSync(({a, b, c}: { a: number, b: string, c: boolean }) => {
				result.push([a, b, c])
			})({
				a: [1, 2],
				b: ['3', '4'],
				c: [],
			})

			assert.deepStrictEqual(result, [])
			assert.strictEqual(count, result.length)
		})

		it('empty middle', function () {
			const result = []
			const test = createTestVariantsSync(({a, b, c}: { a: number, b: string, c: boolean }) => {
				result.push([a, b, c])
			})
			const count = test({
				a: [1, 2],
				b: [],
				d: [2, 3],
				c: [false, true],
			})

			assert.deepStrictEqual(result, [])
			assert.strictEqual(count, result.length)
		})

		it('empty start', function () {
			const result = []
			const count = createTestVariantsSync(({a, b, c}: { a: number, b: string, c: boolean }) => {
				result.push([a, b, c])
			})({
				a: [],
				b: ['3', '4'],
				c: [false, true],
			})

			assert.deepStrictEqual(result, [])
			assert.strictEqual(count, result.length)
		})

		it('calculated', function () {
			const result = []
			const count = createTestVariantsSync(({a, b, c}: { a: number, b: string, c: boolean }) => {
				result.push([a, b, c])
			})({
				a: () => [1, 2],
				b: ({a}) => a === 1 ? ['2', '3', '4'] : ['2'],
				c: ({b}) => b === '2' ? [false, true]
					: b === '3' ? []
						: [true],
			})

			assert.deepStrictEqual(result, [
				[1, '2', false],
				[1, '2', true],
				[1, '4', true],
				[2, '2', false],
				[2, '2', true],
			])
			assert.strictEqual(count, result.length)
		})
	})

	describe('async as sync', function () {
		it('base', function () {
			const result = []
			const count = createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
				result.push([a, b, c])
			})({
				a: [1, 2],
				b: ['3', '4'],
				c: [true, false],
			})

			assert.deepStrictEqual(result, [
				[1, '3', true],
				[1, '3', false],
				[1, '4', true],
				[1, '4', false],
				[2, '3', true],
				[2, '3', false],
				[2, '4', true],
				[2, '4', false],
			])
			assert.strictEqual(count, result.length)
		})

		it('empty end', function () {
			const result = []
			const count = createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
				result.push([a, b, c])
			})({
				a: [1, 2],
				b: ['3', '4'],
				c: [],
			})

			assert.deepStrictEqual(result, [])
			assert.strictEqual(count, result.length)
		})

		it('empty middle', function () {
			const result = []
			const test = createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
				result.push([a, b, c])
			})
			const count = test({
				a: [1, 2],
				b: [],
				d: [2, 3],
				c: [false, true],
			})

			assert.deepStrictEqual(result, [])
			assert.strictEqual(count, result.length)
		})

		it('empty start', function () {
			const result = []
			const count = createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
				result.push([a, b, c])
			})({
				a: [],
				b: ['3', '4'],
				c: [false, true],
			})

			assert.deepStrictEqual(result, [])
			assert.strictEqual(count, result.length)
		})

		it('calculated', function () {
			const result = []
			const count = createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
				result.push([a, b, c])
			})({
				a: () => [1, 2],
				b: ({a}) => a === 1 ? ['2', '3', '4'] : ['2'],
				c: ({b}) => b === '2' ? [false, true]
					: b === '3' ? []
						: [true],
			})

			assert.deepStrictEqual(result, [
				[1, '2', false],
				[1, '2', true],
				[1, '4', true],
				[2, '2', false],
				[2, '2', true],
			])
			assert.strictEqual(count, result.length)
		})
	})

	describe('async', function () {
		it('base', async function () {
			const result = []
			const count = await createTestVariants(async ({a, b, c}: { a: number, b: string, c: boolean }) => {
				await delay(100)
				result.push([a, b, c])
			})({
				a: [1, 2],
				b: ['3', '4'],
				c: [true, false],
			})

			assert.deepStrictEqual(result, [
				[1, '3', true],
				[1, '3', false],
				[1, '4', true],
				[1, '4', false],
				[2, '3', true],
				[2, '3', false],
				[2, '4', true],
				[2, '4', false],
			])
			assert.strictEqual(count, result.length)
		})

		it('empty end', async function () {
			const result = []
			const count = await createTestVariants(async ({a, b, c}: { a: number, b: string, c: boolean }) => {
				await delay(100)
				result.push([a, b, c])
			})({
				a: [1, 2],
				b: ['3', '4'],
				c: [],
			})

			assert.deepStrictEqual(result, [])
			assert.strictEqual(count, result.length)
		})

		it('empty middle', async function () {
			const result = []
			const test = createTestVariants(async ({a, b, c}: { a: number, b: string, c: boolean }) => {
				await delay(100)
				result.push([a, b, c])
			})
			const count = await test({
				a: [1, 2],
				b: [],
				d: [2, 3],
				c: [false, true],
			})

			assert.deepStrictEqual(result, [])
			assert.strictEqual(count, result.length)
		})

		it('empty start', async function () {
			const result = []
			const count = await createTestVariants(async ({a, b, c}: { a: number, b: string, c: boolean }) => {
				await delay(100)
				result.push([a, b, c])
			})({
				a: [],
				b: ['3', '4'],
				c: [false, true],
			})

			assert.deepStrictEqual(result, [])
			assert.strictEqual(count, result.length)
		})

		it('calculated', async function () {
			const result = []
			const count = await createTestVariants(async ({a, b, c}: { a: number, b: string, c: boolean }) => {
				await delay(100)
				result.push([a, b, c])
			})({
				a: () => [1, 2],
				b: ({a}) => a === 1 ? ['2', '3', '4'] : ['2'],
				c: ({b}) => b === '2' ? [false, true]
					: b === '3' ? []
						: [true],
			})

			assert.deepStrictEqual(result, [
				[1, '2', false],
				[1, '2', true],
				[1, '4', true],
				[2, '2', false],
				[2, '2', true],
			])
			assert.strictEqual(count, result.length)
		})
	})
})
