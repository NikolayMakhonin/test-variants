/* eslint-disable @typescript-eslint/no-shadow */
import {createTestVariants} from './createTestVariants'
import {delay} from '../helpers/test/delay'

describe('test-variants > createTestVariants', function () {
  describe('sync', function () {
    it('base', async function () {
      const result = []
      const count = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        result.push([a, b, c])
      })({
        a: [1, 2],
        b: ['3', '4'],
        c: [true, false],
      })()

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
      const count = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        result.push([a, b, c])
      })({
        a: [1, 2],
        b: ['3', '4'],
        c: [],
      })()

      assert.deepStrictEqual(result, [])
      assert.strictEqual(count, result.length)
    })

    it('empty middle', async function () {
      const result = []
      const test = createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        result.push([a, b, c])
      })
      const count = await test({
        a: [1, 2],
        b: [],
        d: [2, 3],
        c: [false, true],
      })()

      assert.deepStrictEqual(result, [])
      assert.strictEqual(count, result.length)
    })

    it('empty start', async function () {
      const result = []
      const count = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        result.push([a, b, c])
      })({
        a: [],
        b: ['3', '4'],
        c: [false, true],
      })()

      assert.deepStrictEqual(result, [])
      assert.strictEqual(count, result.length)
    })

    it('calculated', async function () {
      const result = []
      const count = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        result.push([a, b, c])
      })({
        a: () => [1, 2],
        b: ({a}) => a === 1 ? ['2', '3', '4'] : ['2'],
        c: ({b}) => b === '2' ? [false, true]
          : b === '3' ? []
            : [true],
      })()

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
    it('base', async function () {
      const result = []
      const count = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        result.push([a, b, c])
      })({
        a: [1, 2],
        b: ['3', '4'],
        c: [true, false],
      })()

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
      const count = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        result.push([a, b, c])
      })({
        a: [1, 2],
        b: ['3', '4'],
        c: [],
      })()

      assert.deepStrictEqual(result, [])
      assert.strictEqual(count, result.length)
    })

    it('empty middle', async function () {
      const result = []
      const test = createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        result.push([a, b, c])
      })
      const count = await test({
        a: [1, 2],
        b: [],
        d: [2, 3],
        c: [false, true],
      })()

      assert.deepStrictEqual(result, [])
      assert.strictEqual(count, result.length)
    })

    it('empty start', async function () {
      const result = []
      const count = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        result.push([a, b, c])
      })({
        a: [],
        b: ['3', '4'],
        c: [false, true],
      })()

      assert.deepStrictEqual(result, [])
      assert.strictEqual(count, result.length)
    })

    it('calculated', async function () {
      const result = []
      const count = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        result.push([a, b, c])
      })({
        a: () => [1, 2],
        b: ({a}) => a === 1 ? ['2', '3', '4'] : ['2'],
        c: ({b}) => b === '2' ? [false, true]
          : b === '3' ? []
            : [true],
      })()

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

  describe('async', async function () {
    it('base', async function () {
      const result = []
      const count = await createTestVariants(async ({a, b, c}: { a: number, b: string, c: boolean }) => {
        await delay(100)
        result.push([a, b, c])
      })({
        a: [1, 2],
        b: ['3', '4'],
        c: [true, false],
      })()

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
      })()

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
      })()

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
      })()

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
      })()

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

describe('test-variants > million of Promise reject', function () {
  let millionRejectTime = 0
  it('million of Promise reject', async function () {
    this.timeout(1800000)

    // console.log('wait 5 sec')
    // await new Promise((resolve) => {
    //   setTimeout(resolve, 5000)
    // })
    console.log('start')
    // await new Promise((resolve) => {
    //   setTimeout(resolve, 1000)
    // })

    await createTestVariants(async ({
      a,
      b,
      c,
      d,
      e,
      f,
      g,
    }: {
      a: number,
      b: number,
      c: number,
      d: number,
      e: number,
      f: number,
      g: number,
    }) => {
      await Promise.resolve({
        then(resolve, reject) {
          reject('err')
        },
      })
        .then(o => {}, o => {})

      // await Promise.reject('err')
      //   .then(o => {}, o => {})
    })({
      a: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      b: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      c: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      d: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      e: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      f: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      g: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    })({
      GC_IterationsAsync: 0,
      GC_Interval       : 0,
      GC_Iterations     : 0,
    })

    console.log('try delay')
    for (let i = 0; i < 100; i++) {
      const time0 = Date.now()
      await new Promise(resolve => {
        setTimeout(resolve, 0)
      })
      const time = Date.now() - time0
      assert.ok(time < 1000, 'delay real time: ' + time)
    }

    millionRejectTime = Date.now()
  })

  it('after million of Promise reject', function () {
    const now = Date.now()
    assert.ok(millionRejectTime > 0)
    assert.ok(now - millionRejectTime < 500, (now - millionRejectTime) + '')
    console.log('millionRejectTime: ' + (now - millionRejectTime))
  })
})
