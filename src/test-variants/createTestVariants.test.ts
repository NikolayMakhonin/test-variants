/* eslint-disable @typescript-eslint/no-shadow */
import {createTestVariants} from './createTestVariants'
import {delay} from '@flemist/async-utils'

describe('test-variants > createTestVariants', function () {
  describe('sync', function () {
    it('base', async function () {
      const results = []
      const result = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        results.push([a, b, c])
      })({
        a: [1, 2],
        b: ['3', '4'],
        c: [true, false],
      })()

      assert.deepStrictEqual(results, [
        [1, '3', true],
        [1, '3', false],
        [1, '4', true],
        [1, '4', false],
        [2, '3', true],
        [2, '3', false],
        [2, '4', true],
        [2, '4', false],
      ])
      assert.strictEqual(result.iterations, results.length)
    })

    it('empty end', async function () {
      const results = []
      const result = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        results.push([a, b, c])
      })({
        a: [1, 2],
        b: ['3', '4'],
        c: [],
      })()

      assert.deepStrictEqual(results, [])
      assert.strictEqual(result.iterations, results.length)
    })

    it('empty middle', async function () {
      const results = []
      const test = createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        results.push([a, b, c])
      })
      const result = await test({
        a: [1, 2],
        b: [],
        d: [2, 3],
        c: [false, true],
      })()

      assert.deepStrictEqual(results, [])
      assert.strictEqual(result.iterations, results.length)
    })

    it('empty start', async function () {
      const results = []
      const result = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        results.push([a, b, c])
      })({
        a: [],
        b: ['3', '4'],
        c: [false, true],
      })()

      assert.deepStrictEqual(results, [])
      assert.strictEqual(result.iterations, results.length)
    })

    it('calculated', async function () {
      const results = []
      const result = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        results.push([a, b, c])
      })({
        a: () => [1, 2],
        b: ({a}) => a === 1 ? ['2', '3', '4'] : ['2'],
        c: ({b}) => b === '2' ? [false, true]
          : b === '3' ? []
            : [true],
      })()

      assert.deepStrictEqual(results, [
        [1, '2', false],
        [1, '2', true],
        [1, '4', true],
        [2, '2', false],
        [2, '2', true],
      ])
      assert.strictEqual(result.iterations, results.length)
    })
  })

  describe('async as sync', function () {
    it('base', async function () {
      const results = []
      const result = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        results.push([a, b, c])
      })({
        a: [1, 2],
        b: ['3', '4'],
        c: [true, false],
      })()

      assert.deepStrictEqual(results, [
        [1, '3', true],
        [1, '3', false],
        [1, '4', true],
        [1, '4', false],
        [2, '3', true],
        [2, '3', false],
        [2, '4', true],
        [2, '4', false],
      ])
      assert.strictEqual(result.iterations, results.length)
    })

    it('empty end', async function () {
      const results = []
      const result = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        results.push([a, b, c])
      })({
        a: [1, 2],
        b: ['3', '4'],
        c: [],
      })()

      assert.deepStrictEqual(results, [])
      assert.strictEqual(result.iterations, results.length)
    })

    it('empty middle', async function () {
      const results = []
      const test = createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        results.push([a, b, c])
      })
      const result = await test({
        a: [1, 2],
        b: [],
        d: [2, 3],
        c: [false, true],
      })()

      assert.deepStrictEqual(results, [])
      assert.strictEqual(result.iterations, results.length)
    })

    it('empty start', async function () {
      const results = []
      const result = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        results.push([a, b, c])
      })({
        a: [],
        b: ['3', '4'],
        c: [false, true],
      })()

      assert.deepStrictEqual(results, [])
      assert.strictEqual(result.iterations, results.length)
    })

    it('calculated', async function () {
      const results = []
      const result = await createTestVariants(({a, b, c}: { a: number, b: string, c: boolean }) => {
        results.push([a, b, c])
      })({
        a: () => [1, 2],
        b: ({a}) => a === 1 ? ['2', '3', '4'] : ['2'],
        c: ({b}) => b === '2' ? [false, true]
          : b === '3' ? []
            : [true],
      })()

      assert.deepStrictEqual(results, [
        [1, '2', false],
        [1, '2', true],
        [1, '4', true],
        [2, '2', false],
        [2, '2', true],
      ])
      assert.strictEqual(result.iterations, results.length)
    })
  })

  describe('async', async function () {
    it('base', async function () {
      const results = []
      const result = await createTestVariants(async ({a, b, c}: { a: number, b: string, c: boolean }) => {
        await delay(100)
        results.push([a, b, c])
      })({
        a: [1, 2],
        b: ['3', '4'],
        c: [true, false],
      })()

      assert.deepStrictEqual(results, [
        [1, '3', true],
        [1, '3', false],
        [1, '4', true],
        [1, '4', false],
        [2, '3', true],
        [2, '3', false],
        [2, '4', true],
        [2, '4', false],
      ])
      assert.strictEqual(result.iterations, results.length)
    })

    it('empty end', async function () {
      const results = []
      const result = await createTestVariants(async ({a, b, c}: { a: number, b: string, c: boolean }) => {
        await delay(100)
        results.push([a, b, c])
      })({
        a: [1, 2],
        b: ['3', '4'],
        c: [],
      })()

      assert.deepStrictEqual(results, [])
      assert.strictEqual(result.iterations, results.length)
    })

    it('empty middle', async function () {
      const results = []
      const test = createTestVariants(async ({a, b, c}: { a: number, b: string, c: boolean }) => {
        await delay(100)
        results.push([a, b, c])
      })
      const result = await test({
        a: [1, 2],
        b: [],
        d: [2, 3],
        c: [false, true],
      })()

      assert.deepStrictEqual(results, [])
      assert.strictEqual(result.iterations, results.length)
    })

    it('empty start', async function () {
      const results = []
      const result = await createTestVariants(async ({a, b, c}: { a: number, b: string, c: boolean }) => {
        await delay(100)
        results.push([a, b, c])
      })({
        a: [],
        b: ['3', '4'],
        c: [false, true],
      })()

      assert.deepStrictEqual(results, [])
      assert.strictEqual(result.iterations, results.length)
    })

    it('calculated', async function () {
      const results = []
      const result = await createTestVariants(async ({a, b, c}: { a: number, b: string, c: boolean }) => {
        await delay(100)
        results.push([a, b, c])
      })({
        a: () => [1, 2],
        b: ({a}) => a === 1 ? ['2', '3', '4'] : ['2'],
        c: ({b}) => b === '2' ? [false, true]
          : b === '3' ? []
            : [true],
      })()

      assert.deepStrictEqual(results, [
        [1, '2', false],
        [1, '2', true],
        [1, '4', true],
        [2, '2', false],
        [2, '2', true],
      ])
      assert.strictEqual(result.iterations, results.length)
    })

    it('complex', async function () {
      this.timeout(5 * 60 * 1000)

      const results = []
      const result = await createTestVariants(async (args: {
        op: number
        a0: boolean
        a1: boolean
        a2: boolean
        a3: boolean
        a4: boolean
        a5: boolean
        b: number
        c: number
      }) => {
        await delay(100)
        results.push(args)
      })({
        op: [1, 2, 3, 4, 5],
        a0: ({ op }) => [op === 0],
        a1: ({ op }) => [op === 1],
        a2: ({ op }) => [op === 2],
        a3: ({ op }) => [op === 3],
        a4: ({ op }) => [op === 4],
        a5: ({ op }) => [op === 5],
        b : [1, 2, 3],
        c : [1, 2, 3, 4, 5],
      })()

      assert.strictEqual(result.iterations, 75)
      // assert.deepStrictEqual(results, arr.map(a => [a]))
    })

    it('long', async function () {
      this.timeout(5 * 60 * 1000)

      const results = []
      const result = await createTestVariants(async ({a}: { a: number }) => {
        await delay(3000)
        results.push([a])
      })({
        a: [1, 2],
      })()

      assert.strictEqual(result.iterations, 2)
      assert.deepStrictEqual(results, [
        [1],
        [2],
      ])
    })
  })

  describe('async with sync parallel', async function () {
    it('base', async function () {
      const countParallel = 3
      let countInProcess = 0
      const results = []
      const result = await createTestVariants(async ({a, b, c}: {
        a: number,
        b: string,
        c: boolean
      }, abortSignal) => {
        countInProcess++
        console.log(`${a} ${b} ${c} ${countInProcess} START`)
        assert.ok(countInProcess <= countParallel)
        if (c) {
          await delay(100, abortSignal)
        }
        results.push([a, b, c])

        countInProcess--
        console.log(`${a} ${b} ${c} ${countInProcess} END`)
      })({
        a: [1, 2, 3],
        b: ['3', '4'],
        c: [true, false],
      })({
        parallel: countParallel,
      })

      assert.deepStrictEqual(results, [
        [1, '3', false], // 1
        [1, '4', false], // 3
        [1, '3', true], // 0
        [2, '3', false], // 5
        [1, '4', true], // 2
        [2, '4', false], // 7
        [2, '3', true], // 4
        [3, '3', false], // 8
        [2, '4', true], // 6
        [3, '4', false], // 10
        [3, '3', true], // 9
        [3, '4', true], // 11
      ])
      assert.strictEqual(result.iterations, results.length)
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
      g: [0],
      // g: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    })()

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
