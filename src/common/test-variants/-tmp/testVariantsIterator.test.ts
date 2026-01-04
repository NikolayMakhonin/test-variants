import { describe, it } from 'vitest'
import * as assert from 'node:assert'
import type { Obj } from '@flemist/simple-utils'
import type { TestVariantsIteratorOptions } from './types'
import { testVariantsIterator } from './testVariantsIterator'
import { logOptionsDisabled } from './helpers/logOptions'

describe(
  'test-variants > testVariantsIterator',
  { timeout: 10 * 60 * 1000 },
  () => {
    function collectVariants<Args extends Obj>(
      options: TestVariantsIteratorOptions<Args>,
    ): Args[] {
      const iterator = testVariantsIterator<Args>(options)
      const results: Args[] = []
      iterator.start()
      let args: Args | null
      while ((args = iterator.next()) != null) {
        results.push(args)
      }
      return results
    }

    it('base', async () => {
      const results = collectVariants({
        argsTemplates: {
          a: [1, 2],
          b: ['x', 'y', 'z'],
          c: [true, false],
        },
        log: logOptionsDisabled,
      })

      assert.deepStrictEqual(results, [
        { a: 1, b: 'x', c: true },
        { a: 1, b: 'x', c: false },
        { a: 1, b: 'y', c: true },
        { a: 1, b: 'y', c: false },
        { a: 1, b: 'z', c: true },
        { a: 1, b: 'z', c: false },
        { a: 2, b: 'x', c: true },
        { a: 2, b: 'x', c: false },
        { a: 2, b: 'y', c: true },
        { a: 2, b: 'y', c: false },
        { a: 2, b: 'z', c: true },
        { a: 2, b: 'z', c: false },
      ])
    })

    it('index property', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
          b: ['x', 'y'],
        },
      })

      assert.strictEqual(iterator.index, -1)
      iterator.start()
      assert.strictEqual(iterator.index, -1)

      iterator.next()
      assert.strictEqual(iterator.index, 0)

      iterator.next()
      assert.strictEqual(iterator.index, 1)

      iterator.next()
      assert.strictEqual(iterator.index, 2)

      iterator.next()
      assert.strictEqual(iterator.index, 3)

      // After exhaustion
      const result = iterator.next()
      assert.strictEqual(result, null)
      assert.strictEqual(iterator.index, 3)
    })

    it('cycleIndex property', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
        },
      })

      assert.strictEqual(iterator.cycleIndex, -1)

      iterator.start()
      assert.strictEqual(iterator.cycleIndex, 0)

      iterator.next()
      iterator.next()
      assert.strictEqual(iterator.cycleIndex, 0)

      iterator.start()
      assert.strictEqual(iterator.cycleIndex, 1)

      iterator.start()
      assert.strictEqual(iterator.cycleIndex, 2)
    })

    it('count property', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
          b: ['x', 'y'],
        },
      })

      assert.strictEqual(iterator.count, null)

      iterator.start()
      assert.strictEqual(iterator.count, null)

      iterator.next()
      iterator.next()
      iterator.next()
      iterator.next()
      assert.strictEqual(iterator.count, null)

      // After first complete iteration
      iterator.next()
      assert.strictEqual(iterator.count, 4)
    })

    it('addLimit with index', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
          b: ['x', 'y'],
        },
      })

      iterator.addLimit({ index: 2 })
      assert.strictEqual(iterator.count, 2)

      iterator.start()
      const result1 = iterator.next()
      assert.deepStrictEqual(result1, { a: 1, b: 'x' })

      const result2 = iterator.next()
      assert.deepStrictEqual(result2, { a: 1, b: 'y' })

      const result3 = iterator.next()
      assert.strictEqual(result3, null)
    })

    it('throws if next() called before start()', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
        },
      })

      assert.throws(() => {
        iterator.next()
      }, /start\(\) must be called before next\(\)/)
    })

    it('addLimit() uses current args and index', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
          b: ['x', 'y'],
        },
      })

      iterator.start()
      iterator.next() // index 0: {a: 1, b: 'x'}
      iterator.next() // index 1: {a: 1, b: 'y'}
      iterator.next() // index 2: {a: 2, b: 'x'}

      iterator.addLimit()

      assert.strictEqual(iterator.count, 2)
      assert.deepStrictEqual(iterator.limit, { args: { a: 2, b: 'x' } })

      // Should stop at index 2
      const result = iterator.next()
      assert.strictEqual(result, null)
    })

    it('addLimit({error}) stores error in limit', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
        },
      })

      const testError = new Error('test error')

      iterator.start()
      iterator.next() // index 0: {a: 1}

      iterator.addLimit({ error: testError })

      assert.strictEqual(iterator.count, 0)
      assert.deepStrictEqual(iterator.limit?.args, { a: 1 })
      assert.strictEqual(iterator.limit?.error, testError)
    })

    it('addLimit() throws if called before next()', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
        },
      })

      iterator.start()

      assert.throws(() => {
        iterator.addLimit()
      }, /addLimit\(\) requires at least one next\(\) call/)
    })

    it('addLimit keeps earliest limit', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2, 3, 4],
        },
      })

      iterator.start()
      iterator.next() // index 0
      iterator.next() // index 1
      iterator.next() // index 2

      iterator.addLimit() // sets limit at index 2

      assert.strictEqual(iterator.count, 2)
      assert.deepStrictEqual(iterator.limit?.args, { a: 3 })

      // Try to add a later limit - should be ignored
      iterator.addLimit({ index: 3 })

      assert.strictEqual(iterator.count, 2) // unchanged
    })

    it('addLimit({args, index}) sets both count and limit', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
          b: ['x', 'y'],
        },
      })

      const savedArgs = { a: 1, b: 'y', seed: void 0 }
      const testError = new Error('saved error')

      iterator.addLimit({ args: savedArgs, index: 1, error: testError })

      assert.strictEqual(iterator.count, 1)
      assert.deepStrictEqual(iterator.limit?.args, savedArgs)
      assert.strictEqual(iterator.limit?.error, testError)
    })

    it('getSeed adds seed to returned args', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
        },
        getSeed: ({ tests, cycles, repeats }) =>
          `${cycles}-${tests}-${repeats}`,
      })

      iterator.start()

      const result1 = iterator.next()
      assert.deepStrictEqual(result1, { a: 1, seed: '0-0-0' })

      const result2 = iterator.next()
      assert.deepStrictEqual(result2, { a: 2, seed: '0-1-0' })
    })

    it('attemptsPerVariant repeats each variant', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
        },
        getSeed: ({ tests, cycles, repeats }) =>
          `${cycles}-${tests}-${repeats}`,
        iterationModes: [{ mode: 'forward', attemptsPerVariant: 3 }],
      })

      iterator.start()

      // Variant 0, repeats 0-2 (tests=0,1,2 because tests is total tests run, not variant index)
      assert.deepStrictEqual(iterator.next(), { a: 1, seed: '0-0-0' })
      assert.deepStrictEqual(iterator.next(), { a: 1, seed: '0-1-1' })
      assert.deepStrictEqual(iterator.next(), { a: 1, seed: '0-2-2' })

      // Variant 1, repeats 0-2 (tests=3,4,5)
      assert.deepStrictEqual(iterator.next(), { a: 2, seed: '0-3-0' })
      assert.deepStrictEqual(iterator.next(), { a: 2, seed: '0-4-1' })
      assert.deepStrictEqual(iterator.next(), { a: 2, seed: '0-5-2' })

      // Done
      assert.strictEqual(iterator.next(), null)
    })

    it('attemptsPerVariant with external cycles via start()', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
        },
        getSeed: ({ tests, cycles, repeats }) =>
          `${cycles}-${tests}-${repeats}`,
        iterationModes: [{ mode: 'forward', attemptsPerVariant: 2 }],
      })

      // Cycle 0 (tests=0,1,2,3 - testsCount increments per test, including attemptsPerVariant)
      iterator.start()
      assert.deepStrictEqual(iterator.next(), { a: 1, seed: '0-0-0' })
      assert.deepStrictEqual(iterator.next(), { a: 1, seed: '0-1-1' })
      assert.deepStrictEqual(iterator.next(), { a: 2, seed: '0-2-0' })
      assert.deepStrictEqual(iterator.next(), { a: 2, seed: '0-3-1' })
      assert.strictEqual(iterator.next(), null)

      // Cycle 1 (testsCount resets on start(), so tests=0,1,2,3 again)
      iterator.start()
      assert.deepStrictEqual(iterator.next(), { a: 1, seed: '1-0-0' })
      assert.deepStrictEqual(iterator.next(), { a: 1, seed: '1-1-1' })
      assert.deepStrictEqual(iterator.next(), { a: 2, seed: '1-2-0' })
      assert.deepStrictEqual(iterator.next(), { a: 2, seed: '1-3-1' })
      assert.strictEqual(iterator.next(), null)
    })

    it('forward mode cycles iterates variants multiple times', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
        },
        iterationModes: [{ mode: 'forward', cycles: 2 }],
      })

      iterator.start()
      // Cycle 0
      assert.deepStrictEqual(iterator.next(), { a: 1 })
      assert.deepStrictEqual(iterator.next(), { a: 2 })
      // Cycle 1
      assert.deepStrictEqual(iterator.next(), { a: 1 })
      assert.deepStrictEqual(iterator.next(), { a: 2 })
      // Done
      assert.strictEqual(iterator.next(), null)
    })

    it('forward mode cycles with attemptsPerVariant', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
        },
        getSeed: ({ tests, repeats }) => `${tests}-${repeats}`,
        iterationModes: [{ mode: 'forward', cycles: 2, attemptsPerVariant: 2 }],
      })

      iterator.start()
      // Mode cycle 0 (tests counts all tests including attemptsPerVariant)
      assert.deepStrictEqual(iterator.next(), { a: 1, seed: '0-0' })
      assert.deepStrictEqual(iterator.next(), { a: 1, seed: '1-1' })
      assert.deepStrictEqual(iterator.next(), { a: 2, seed: '2-0' })
      assert.deepStrictEqual(iterator.next(), { a: 2, seed: '3-1' })
      // Mode cycle 1 (testsCount continues within same external cycle)
      assert.deepStrictEqual(iterator.next(), { a: 1, seed: '4-0' })
      assert.deepStrictEqual(iterator.next(), { a: 1, seed: '5-1' })
      assert.deepStrictEqual(iterator.next(), { a: 2, seed: '6-0' })
      assert.deepStrictEqual(iterator.next(), { a: 2, seed: '7-1' })
      // Done
      assert.strictEqual(iterator.next(), null)
    })

    it('random mode picks variants within limits', async () => {
      // Use 30 picks to make probability of all same values negligible (~1e-14)
      const pickCount = 30
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2, 3],
        },
        iterationModes: [{ mode: 'random', limitTests: pickCount }],
      })

      iterator.start()
      const seen = new Set<number>()
      for (let i = 0; i < pickCount; i++) {
        const result = iterator.next()
        assert.ok(result !== null)
        assert.ok([1, 2, 3].includes(result.a))
        seen.add(result.a)
      }
      // After 30 random picks, should have seen at least 2 different values
      assert.ok(
        seen.size >= 2,
        `Expected at least 2 different values, got ${seen.size}`,
      )
      // Next pick should return null (limitTests reached)
      assert.strictEqual(iterator.next(), null)
    })

    it('random mode respects limitTime', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2, 3],
        },
        iterationModes: [{ mode: 'random', limitTime: 10 }],
      })

      iterator.start()
      const start = Date.now()
      let count = 0
      while (iterator.next() !== null) {
        count++
        if (count > 1000000) {
          throw new Error('Too many iterations - limitTime not working')
        }
      }
      const elapsed = Date.now() - start
      // Allow 1ms tolerance for timer precision
      assert.ok(elapsed >= 9, `Expected at least 9ms elapsed, got ${elapsed}ms`)
      assert.ok(count > 0, 'Expected at least some iterations')
    })

    it('forward then random mode sequence', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
        },
        iterationModes: [
          { mode: 'forward' },
          { mode: 'random', limitTests: 3 },
        ],
      })

      iterator.start()
      // Forward mode first
      assert.deepStrictEqual(iterator.next(), { a: 1 })
      assert.deepStrictEqual(iterator.next(), { a: 2 })
      // Then random mode - 3 picks
      const result1 = iterator.next()
      assert.ok(result1 !== null, 'Random mode pick 1 should not be null')
      assert.ok([1, 2].includes(result1.a))
      const result2 = iterator.next()
      assert.ok(result2 !== null, 'Random mode pick 2 should not be null')
      assert.ok([1, 2].includes(result2.a))
      const result3 = iterator.next()
      assert.ok(result3 !== null, 'Random mode pick 3 should not be null')
      assert.ok([1, 2].includes(result3.a))
      // Done
      assert.strictEqual(iterator.next(), null)
    })

    it('sequential modes persist position when interrupted by limits', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2, 3, 4],
        },
        iterationModes: [
          { mode: 'forward', limitTests: 2 },
          { mode: 'backward', limitTests: 2 },
        ],
      })

      iterator.start()
      // Forward mode: picks 2 variants (a=1, a=2), interrupted by limit, saves position at a=2
      assert.deepStrictEqual(iterator.next(), { a: 1 })
      assert.deepStrictEqual(iterator.next(), { a: 2 })
      // Backward mode: picks 2 variants from end (a=4, a=3), interrupted by limit, saves position at a=3
      assert.deepStrictEqual(iterator.next(), { a: 4 })
      assert.deepStrictEqual(iterator.next(), { a: 3 })
      // Done for this cycle
      assert.strictEqual(iterator.next(), null)

      // New external cycle - positions persist because modes were interrupted by limits
      iterator.start()
      // Forward mode: continues from saved position (a=2), picks a=3, a=4
      assert.deepStrictEqual(iterator.next(), { a: 3 })
      assert.deepStrictEqual(iterator.next(), { a: 4 })
      // Backward mode: continues from saved position (a=3), picks a=2, a=1
      assert.deepStrictEqual(iterator.next(), { a: 2 })
      assert.deepStrictEqual(iterator.next(), { a: 1 })
      // Done
      assert.strictEqual(iterator.next(), null)
    })

    it('sequential mode position not saved when naturally completed', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
        },
        iterationModes: [
          { mode: 'forward' }, // No limits - will complete naturally
        ],
      })

      iterator.start()
      // Forward mode: completes all variants naturally
      assert.deepStrictEqual(iterator.next(), { a: 1 })
      assert.deepStrictEqual(iterator.next(), { a: 2 })
      assert.strictEqual(iterator.next(), null)

      // Second cycle: starts from beginning (position not saved because naturally completed)
      iterator.start()
      assert.deepStrictEqual(iterator.next(), { a: 1 })
      assert.deepStrictEqual(iterator.next(), { a: 2 })
      assert.strictEqual(iterator.next(), null)
    })

    it('sequential mode position persistence with attemptsPerVariant', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2, 3],
        },
        // Note: tests resets on each start() call, so use cycles to distinguish cycles
        getSeed: ({ tests, cycles, repeats }) =>
          `c${cycles}-v${tests}-r${repeats}`,
        iterationModes: [
          { mode: 'forward', limitTests: 4, attemptsPerVariant: 2 },
        ],
      })

      iterator.start()
      // First cycle: 4 picks = 2 variants * 2 repeats, interrupted by limit
      // Position saved at a=2 (indexes=[1], repeatIndex=1)
      // tests=0,1,2,3 (total tests count, not variant index)
      assert.deepStrictEqual(iterator.next(), { a: 1, seed: 'c0-v0-r0' })
      assert.deepStrictEqual(iterator.next(), { a: 1, seed: 'c0-v1-r1' })
      assert.deepStrictEqual(iterator.next(), { a: 2, seed: 'c0-v2-r0' })
      assert.deepStrictEqual(iterator.next(), { a: 2, seed: 'c0-v3-r1' })
      assert.strictEqual(iterator.next(), null)

      iterator.start()
      // Second cycle: continues from saved position (indexes=[1], a=2)
      // Advances to a=3, gets 2 repeats, then no more variants - mode naturally completes
      // Natural completion clears saved position
      // testsCount resets on start(), so tests=0,1
      assert.deepStrictEqual(iterator.next(), { a: 3, seed: 'c1-v0-r0' })
      assert.deepStrictEqual(iterator.next(), { a: 3, seed: 'c1-v1-r1' })
      // No more variants after a=3, mode naturally completes
      assert.strictEqual(iterator.next(), null)

      iterator.start()
      // Third cycle: no saved position (was cleared), starts fresh from beginning
      // testsCount resets on start(), so tests=0,1,2,3
      assert.deepStrictEqual(iterator.next(), { a: 1, seed: 'c2-v0-r0' })
      assert.deepStrictEqual(iterator.next(), { a: 1, seed: 'c2-v1-r1' })
      assert.deepStrictEqual(iterator.next(), { a: 2, seed: 'c2-v2-r0' })
      assert.deepStrictEqual(iterator.next(), { a: 2, seed: 'c2-v3-r1' })
      assert.strictEqual(iterator.next(), null)
    })

    it('addLimit({args}) applies limit when position reached', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
          b: ['x', 'y'],
        },
      })

      // Add pending limit for {a: 1, b: 'y'} (index 1)
      iterator.addLimit({ args: { a: 1, b: 'y', seed: void 0 } })

      iterator.start()
      const result1 = iterator.next() // index 0: {a: 1, b: 'x'}
      assert.deepStrictEqual(result1, { a: 1, b: 'x' })

      const result2 = iterator.next() // index 1: {a: 1, b: 'y'} - pending limit applies
      assert.strictEqual(result2, null)

      assert.strictEqual(iterator.count, 1)
      assert.deepStrictEqual(iterator.limit, {
        args: { a: 1, b: 'y', seed: void 0 },
      })
    })

    it('addLimit({args, error}) stores pending error', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
          b: ['x', 'y'],
        },
      })

      const testError = new Error('pending error')
      iterator.addLimit({
        args: { a: 2, b: 'x', seed: void 0 },
        error: testError,
      })

      iterator.start()
      iterator.next() // 0
      iterator.next() // 1
      const result = iterator.next() // 2 - pending limit applies
      assert.strictEqual(result, null)

      assert.strictEqual(iterator.count, 2)
      assert.deepStrictEqual(iterator.limit?.args, {
        a: 2,
        b: 'x',
        seed: void 0,
      })
      assert.strictEqual(iterator.limit?.error, testError)
    })

    it('addLimit({args}) discards if keys dont match', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
          b: ['x', 'y'],
        },
      })

      // Extra key 'c' - should be discarded
      iterator.addLimit({ args: { a: 1, b: 'x', c: true } as any })

      iterator.start()
      iterator.next()
      iterator.next()
      iterator.next()
      iterator.next()
      const result = iterator.next() // Should exhaust normally
      assert.strictEqual(result, null)
      assert.strictEqual(iterator.count, 4) // No limit applied
    })

    it('addLimit({args}) extends template with missing value', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
          b: ['x', 'y'],
        },
      })

      // Value 'z' not in template - template should be extended with 'z'
      iterator.addLimit({ args: { a: 1, b: 'z', seed: void 0 } })

      iterator.start()
      // After template extension: a=[1,2], b=['x','y','z']
      // Total variants: 2 * 3 = 6
      // Limit args {a:1, b:'z'} = indexes [0, 2]
      // Pending limit should apply when position [0, 2] is reached
      const results: any[] = []
      let result: any
      while ((result = iterator.next()) !== null) {
        results.push(result)
      }
      // Limit at [0, 2] means count = 2 (index 0 is {a:1,b:'x'}, index 1 is {a:1,b:'y'})
      assert.strictEqual(iterator.count, 2)
      assert.deepStrictEqual(results, [
        { a: 1, b: 'x' },
        { a: 1, b: 'y' },
      ])
    })

    it('addLimit({args}) with seed key is ignored in validation', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
          b: ['x', 'y'],
        },
      })

      // Args with seed key - seed should be ignored in validation
      iterator.addLimit({ args: { a: 1, b: 'y', seed: 'test-seed' } as any })

      iterator.start()
      iterator.next() // 0
      const result = iterator.next() // 1 - pending limit applies
      assert.strictEqual(result, null)

      assert.strictEqual(iterator.count, 1)
      // limit.args preserves original args including seed
      assert.deepStrictEqual(iterator.limit?.args, {
        a: 1,
        b: 'y',
        seed: 'test-seed',
      })
    })

    it('addLimit({args, index}) applies both index and limit with template extension', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2],
          b: ['x', 'y'],
        },
      })

      // Value 'z' not in template - template extended, both index and limit applied
      iterator.addLimit({ args: { a: 1, b: 'z', seed: void 0 }, index: 2 })

      assert.strictEqual(iterator.count, 2) // Index applied
      assert.deepStrictEqual(iterator.limit?.args, {
        a: 1,
        b: 'z',
        seed: void 0,
      }) // Limit set after template extension
    })

    it('multiple pending limits apply at different positions', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2, 3],
          b: ['x', 'y'],
        },
      })

      // Add two pending limits
      iterator.addLimit({ args: { a: 2, b: 'x', seed: void 0 } }) // position 2
      iterator.addLimit({ args: { a: 1, b: 'y', seed: void 0 } }) // position 1 - should win

      iterator.start()
      iterator.next() // 0
      const result = iterator.next() // 1 - earlier pending limit applies
      assert.strictEqual(result, null)

      assert.strictEqual(iterator.count, 1)
      assert.deepStrictEqual(iterator.limit?.args, {
        a: 1,
        b: 'y',
        seed: void 0,
      })
    })

    it('limitArgOnError limits per-arg indexes', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2, 3],
          b: ['x', 'y', 'z'],
        },
        limitArgOnError: true,
      })

      iterator.start()
      // Iterate to {a: 2, b: 'y'} (index 4: a=1 gives 3 variants, a=2,b='y' is index 4)
      iterator.next() // 0: {a: 1, b: 'x'}
      iterator.next() // 1: {a: 1, b: 'y'}
      iterator.next() // 2: {a: 1, b: 'z'}
      iterator.next() // 3: {a: 2, b: 'x'}
      iterator.next() // 4: {a: 2, b: 'y'}

      iterator.addLimit() // Limit at {a: 2, b: 'y'} -> argLimits: [1, 1] (INCLUSIVE)

      // count is set to 4, so this cycle stops immediately
      const result = iterator.next()
      assert.strictEqual(result, null)
      assert.strictEqual(iterator.count, 4)

      // Start new cycle - argLimits persist, pendingLimit applies at error position
      // a <= 1 means a in [1, 2] (indexes 0, 1)
      // b <= 1 means b in ['x', 'y'] (indexes 0, 1)
      // Total: 2 * 2 = 4 variants, error at {a:2, b:'y'} is index 3 in constrained space
      // With includeErrorVariant: false (default), error variant is excluded
      iterator.start()
      const results: any[] = []
      let args: any
      while ((args = iterator.next()) != null) {
        results.push(args)
      }

      assert.deepStrictEqual(results, [
        { a: 1, b: 'x' },
        { a: 1, b: 'y' },
        { a: 2, b: 'x' },
        // {a: 2, b: 'y'} excluded - error variant
      ])
    })

    it('limitArgOnError with index 0 restricts to single value', async () => {
      // When error is at index 0, argLimit = 0 (INCLUSIVE)
      // This restricts the arg to exactly one value (index 0 only)
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2, 3],
          b: ['x', 'y', 'z'],
        },
        limitArgOnError: true,
      })

      iterator.start()
      iterator.next() // 0: {a: 1, b: 'x'}
      iterator.next() // 1: {a: 1, b: 'y'}

      iterator.addLimit() // Limit at {a: 1, b: 'y'} -> argLimits: [0, 1] (INCLUSIVE)

      // count is set to 1, so this cycle stops immediately
      const result = iterator.next()
      assert.strictEqual(result, null)
      assert.strictEqual(iterator.count, 1)

      // Start new cycle - argLimits persist
      // a <= 0 means only a=1 (index 0)
      // b <= 1 means b='x' or b='y' (indexes 0, 1)
      // But error variant {a: 1, b: 'y'} is excluded
      iterator.start()
      const results: any[] = []
      let args: any
      while ((args = iterator.next()) != null) {
        results.push(args)
      }

      // Only {a: 1, b: 'x'} is valid (error variant {a: 1, b: 'y'} is excluded by count)
      assert.deepStrictEqual(results, [{ a: 1, b: 'x' }])
    })

    it('limitArgOnError with callback', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [1, 2, 3],
          b: ['x', 'y', 'z'],
        },
        limitArgOnError: ({ name }) => name === 'b', // Only limit 'b' arg
      })

      iterator.start()
      iterator.next() // 0: {a: 1, b: 'x'}
      iterator.next() // 1: {a: 1, b: 'y'}
      iterator.next() // 2: {a: 1, b: 'z'}
      iterator.next() // 3: {a: 2, b: 'x'}
      iterator.next() // 4: {a: 2, b: 'y'}

      iterator.addLimit() // Limit at {a: 2, b: 'y'} -> only b is limited (argLimit = 1 INCLUSIVE)

      // count is set to 4, so this cycle stops immediately
      assert.strictEqual(iterator.count, 4)
      assert.strictEqual(iterator.next(), null)

      // Start new cycle - argLimits persist
      // a is not limited, b <= 1 (INCLUSIVE) means b in ['x', 'y']
      iterator.start()
      const results: any[] = []
      let args: any
      while ((args = iterator.next()) != null) {
        results.push(args)
      }

      // Should yield variants with b in ['x', 'y'] (index <= 1)
      // a is not limited so all a values are valid
      // Total 6 variants, but count=4 limits to first 4
      assert.deepStrictEqual(results, [
        { a: 1, b: 'x' },
        { a: 1, b: 'y' },
        { a: 2, b: 'x' },
        { a: 2, b: 'y' },
      ])
    })

    it('addLimit({args}) lexicographic comparison - rejects larger combinations', async () => {
      // Lexicographic comparison: compare like numbers (1999 < 2000)
      // First differing position determines order
      //
      // Correct behavior:
      // - Compare lexicographically from first arg to last
      // - Only update if new combination is lexicographically smaller
      // - If new >= current, reject entirely

      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [0, 1, 2, 3],
          b: [0, 1, 2, 3],
        },
        limitArgOnError: true,
      })

      // File 1: a=0, b=2 (indexes: [0, 2])
      iterator.addLimit({
        args: { a: 0, b: 2, seed: void 0 },
        error: new Error('file1'),
      })

      // File 2: a=3, b=1 (indexes: [3, 1])
      // Lexicographic compare: [3, 1] vs [0, 2] -> at position 0: 3 > 0
      // File 2 is lexicographically LARGER, reject
      iterator.addLimit({
        args: { a: 3, b: 1, seed: void 0 },
        error: new Error('file2'),
      })

      iterator.start()
      const results: any[] = []
      let args: any
      while ((args = iterator.next()) != null) {
        results.push({ ...args })
      }

      // argLimits from file1: [0, 2] (INCLUSIVE)
      // a <= 0 means a in [0] (1 value)
      // b <= 2 means b in [0, 1, 2] (3 values)
      // Total: 1 * 3 = 3, minus error variant {a: 0, b: 2} = 2 variants

      assert.strictEqual(results.length, 2)
      assert.strictEqual((iterator.limit?.error as Error).message, 'file1')
    })

    it('addLimit({args}) lexicographic comparison - accepts smaller at earlier position', async () => {
      // Lexicographic: compare like numbers, first differing position decides
      // [0, 1, 1] vs [0, 2, 0]: at position 1: 1 < 2, so [0, 1, 1] wins
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [0, 1, 2, 3],
          b: [0, 1, 2, 3],
          c: [false, true],
        },
        limitArgOnError: true,
      })

      // File 1: a=0, b=2, c=false (indexes: [0, 2, 0])
      iterator.addLimit({
        args: { a: 0, b: 2, c: false, seed: void 0 },
        error: new Error('file1'),
      })

      // File 2: a=0, b=1, c=true (indexes: [0, 1, 1])
      // Lexicographic compare: [0, 1, 1] vs [0, 2, 0]
      // - a: 0 == 0, continue
      // - b: 1 < 2, file2 wins!
      // File 2 is lexicographically SMALLER, accept
      iterator.addLimit({
        args: { a: 0, b: 1, c: true, seed: void 0 },
        error: new Error('file2'),
      })

      iterator.start()
      const results: any[] = []
      let args: any
      while ((args = iterator.next()) != null) {
        results.push({ ...args })
      }

      // argLimits from file2: [0, 1, 1] (INCLUSIVE)
      // a <= 0 means a in [0] (1 value)
      // b <= 1 means b in [0, 1] (2 values)
      // c <= 1 means c in [false, true] (2 values)
      // Total: 1 * 2 * 2 = 4, minus error variant {a: 0, b: 1, c: true} = 3 variants

      assert.strictEqual(results.length, 3)
      assert.strictEqual((iterator.limit?.error as Error).message, 'file2')
    })

    it('addLimit({args}) index 0 is valid limit that restricts to 1 value', async () => {
      // Index 0 is a valid argLimit - it restricts the arg to exactly one value
      // Lexicographic comparison uses all indexes including 0

      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [0, 1, 2, 3],
          b: [0, 1, 2, 3],
        },
        limitArgOnError: true,
      })

      // File 1: a=0, b=2 (indexes: [0, 2])
      // a is at index 0 - argLimits[a] = 0 (restricts to 1 value)
      iterator.addLimit({
        args: { a: 0, b: 2, seed: void 0 },
        error: new Error('file1'),
      })

      // File 2: a=1, b=0 (indexes: [1, 0])
      // Lexicographic compare: [1, 0] vs [0, 2] -> at position 0: 1 > 0
      // File 2 is lexicographically LARGER, reject
      iterator.addLimit({
        args: { a: 1, b: 0, seed: void 0 },
        error: new Error('file2'),
      })

      iterator.start()
      const results: any[] = []
      let args: any
      while ((args = iterator.next()) != null) {
        results.push({ ...args })
      }

      // argLimits from file1: [0, 2] (INCLUSIVE)
      // a <= 0 means a in [0] (1 value)
      // b <= 2 means b in [0, 1, 2] (3 values)
      // Total: 1 * 3 = 3, minus error variant {a: 0, b: 2} = 2 variants

      assert.strictEqual(results.length, 2)
      assert.strictEqual((iterator.limit?.error as Error).message, 'file1')
    })

    it('addLimit({args}) uses limitArgs for dynamic template calculation', async () => {
      // calcTemplateValues uses limitArgs for dynamic template calculation
      // This ensures correct indexes for dynamic templates

      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [false, true],
          b: ({ a }) => (a ? [1, 2] : [3, 4, 5]), // Dynamic: depends on a
        },
        limitArgOnError: true,
      })

      // With a=false, b template is [3, 4, 5]
      // b=4 is at index 1 in [3, 4, 5]
      iterator.addLimit({
        args: { a: false, b: 4, seed: void 0 },
        error: new Error('file1'),
      })

      iterator.start()
      const results: any[] = []
      let args: any
      while ((args = iterator.next()) != null) {
        results.push({ ...args })
      }

      // argLimits: [0 (a at 0), 1 (b at 1)] (INCLUSIVE)
      // a <= 0 means a in [false] (index 0 only)
      // b <= 1 means b in first 2 values of each dynamic template
      // With a=false: b in [3, 4] (indexes 0, 1)
      // Total: 1 * 2 = 2, minus error variant {a: false, b: 4} = 1 variant

      assert.strictEqual(results.length, 1)
      assert.deepStrictEqual(results, [{ a: false, b: 3 }])
    })

    it('addLimit({args}) extends dynamic template with missing value', async () => {
      // Template extension works with dynamic templates
      // Missing value is appended to extraValues and available for all arg combinations

      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [false, true],
          b: ({ a }) => (a ? [1, 2] : [3, 4]), // Dynamic: depends on a
        },
        limitArgOnError: true,
      })

      // With a=false, b template is [3, 4]
      // b=10 is NOT in template - should be extended
      iterator.addLimit({
        args: { a: false, b: 10, seed: void 0 },
        error: new Error('file1'),
      })

      iterator.start()
      const results: any[] = []
      let args: any
      while ((args = iterator.next()) != null) {
        results.push({ ...args })
      }

      // After extension: b template for a=false is [3, 4, 10]
      // argLimits: [0, 2] (a at index 0, b=10 at index 2)
      // a <= 0 means only a=false
      // b <= 2 means b in [3, 4, 10] (indexes 0, 1, 2)
      // Iteration stops before reaching [0, 2] (the error position)
      // Results: [3, 4] (indexes 0, 1)

      assert.strictEqual(results.length, 2)
      assert.deepStrictEqual(results, [
        { a: false, b: 3 },
        { a: false, b: 4 },
      ])
    })

    it('addLimit({args}) lexicographic comparison - accepts smaller and replaces', async () => {
      // New error is accepted if lexicographically smaller
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [0, 1, 2, 3],
          b: [0, 1, 2, 3],
          c: [0, 1, 2, 3],
        },
        limitArgOnError: true,
      })

      // File 1: [2, 2, 2]
      iterator.addLimit({
        args: { a: 2, b: 2, c: 2, seed: void 0 },
        error: new Error('file1'),
      })

      // File 2: [1, 1, 1] - lexicographically smaller (at position 0: 1 < 2)
      // Should be accepted and replace file1
      iterator.addLimit({
        args: { a: 1, b: 1, c: 1, seed: void 0 },
        error: new Error('file2'),
      })

      iterator.start()
      const results: any[] = []
      let args: any
      while ((args = iterator.next()) != null) {
        results.push({ ...args })
      }

      // argLimits from file2: [1, 1, 1] (INCLUSIVE)
      // a <= 1, b <= 1, c <= 1 means indexes 0, 1 for each
      // Total: 2 * 2 * 2 = 8, minus error variant {a: 1, b: 1, c: 1} = 7 variants
      assert.strictEqual(results.length, 7)

      // Verify limit is from file2
      assert.strictEqual((iterator.limit?.error as Error).message, 'file2')
    })

    it('lexicographic comparison with 3 error files', async () => {
      const file1Args = {
        returnReadableResolved: false,
        dependencyFactory: false,
        returnObservable: false,
        injectorInjectionsMax: 3,
        injectorValueStoresMax: 1,
        valueStoresMax: 2,
        changesPerIterationMax: 1,
        dependencyValueStore: true,
        dependencyObservable: true,
        useInjectorDefault: false,
        injectorsMax: 3,
        injectorDependenciesMax: 3,
        injectionsMax: 2,
        factoriesMax: 3,
        injectorFactoriesMax: 2,
        dependencyCountMax: 1,
        checksPerIterationMax: 1,
        iterations: 10,
        seed: void 0,
      }

      const file2Args = {
        returnReadableResolved: false,
        dependencyFactory: false,
        returnObservable: false,
        injectorInjectionsMax: 0,
        injectorValueStoresMax: 1,
        valueStoresMax: 0,
        changesPerIterationMax: 1,
        dependencyValueStore: false,
        dependencyObservable: true,
        useInjectorDefault: false,
        injectorsMax: 3,
        injectorDependenciesMax: 1,
        injectionsMax: 2,
        factoriesMax: 3,
        injectorFactoriesMax: 3,
        dependencyCountMax: 3,
        checksPerIterationMax: 1,
        iterations: 10,
        seed: void 0,
      }

      const file3Args = {
        returnReadableResolved: false,
        dependencyFactory: false,
        returnObservable: false,
        injectorInjectionsMax: 0,
        injectorValueStoresMax: 2,
        valueStoresMax: 3,
        changesPerIterationMax: 1,
        dependencyValueStore: false,
        dependencyObservable: true,
        useInjectorDefault: false,
        injectorsMax: 3,
        injectorDependenciesMax: 1,
        injectionsMax: 1,
        factoriesMax: 3,
        injectorFactoriesMax: 3,
        dependencyCountMax: 1,
        checksPerIterationMax: 1,
        iterations: 10,
        seed: void 0,
      }

      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          returnReadableResolved: [false, true, null],
          dependencyFactory: [false, true],
          returnObservable: ({ dependencyFactory }) => {
            return dependencyFactory ? [true] : [false, true]
          },
          injectorInjectionsMax: [0, 1, 2, 3],
          injectorValueStoresMax: [0, 1, 2, 3],
          valueStoresMax: [0, 1, 2, 3],
          changesPerIterationMax: [0, 1],
          dependencyValueStore: [false, true],
          dependencyObservable: [false, true],
          useInjectorDefault: [false, true, null],
          injectorsMax: [1, 2, 3],
          injectorDependenciesMax: [0, 1, 2, 3],
          injectionsMax: [1, 2, 3],
          factoriesMax: [0, 1, 2, 3],
          injectorFactoriesMax: [0, 1, 2, 3],
          dependencyCountMax: [0, 1, 2, 3],
          checksPerIterationMax: [1],
          iterations: [1, 2, 10],
        },
        limitArgOnError: true,
      })

      // Add all 3 files - order doesn't matter, lexicographically smallest wins
      iterator.addLimit({ args: file1Args, error: new Error('file1') })
      iterator.addLimit({ args: file2Args, error: new Error('file2') })
      iterator.addLimit({ args: file3Args, error: new Error('file3') })

      // File 2 should win (lexicographically smallest)
      // File 1 indexes: [0, 0, 0, 3, 1, 2, 1, 1, 1, 0, 2, 3, 1, 3, 2, 1, 0, 2]
      // File 2 indexes: [0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 2, 1, 1, 3, 3, 3, 0, 2]
      // File 3 indexes: [0, 0, 0, 0, 2, 3, 1, 0, 1, 0, 2, 1, 0, 3, 3, 1, 0, 2]
      // At position 3: File 1 has 3, File 2 has 0, File 3 has 0 -> File 2 or 3 wins over File 1
      // At position 4: File 2 has 1, File 3 has 2 -> File 2 wins
      assert.strictEqual((iterator.limit?.error as Error).message, 'file2')

      // Iterate and count
      iterator.start()
      let count = 0
      while (iterator.next() != null) {
        count++
      }

      // argLimits from File 2 (INCLUSIVE):
      // 1×1×1×1×2×1×2×1×2×1×3×2×2×4×4×4×1×3 = 18432
      // Minus error variant = 18431
      assert.strictEqual(count, 18431)
    })

    it('includeErrorVariant includes error variant in iteration', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [0, 1, 2],
          b: [0, 1, 2],
        },
        limitArgOnError: true,
        includeErrorVariant: true,
      })

      // Error at [1, 1]
      iterator.addLimit({
        args: { a: 1, b: 1, seed: void 0 },
        error: new Error('error'),
      })

      iterator.start()
      const results: any[] = []
      let args: any
      while ((args = iterator.next()) != null) {
        results.push({ ...args })
      }

      // argLimits: [1, 1] (INCLUSIVE)
      // a <= 1, b <= 1 means indexes 0, 1 for each
      // Total: 2 * 2 = 4, WITH error variant included
      assert.strictEqual(results.length, 4)
      assert.deepStrictEqual(results, [
        { a: 0, b: 0 },
        { a: 0, b: 1 },
        { a: 1, b: 0 },
        { a: 1, b: 1 }, // Error variant IS included
      ])
    })

    it('includeErrorVariant with addLimit() during iteration', async () => {
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [0, 1, 2],
          b: [0, 1, 2],
        },
        limitArgOnError: true,
        includeErrorVariant: true,
      })

      iterator.start()
      const results: any[] = []
      let args: any
      while ((args = iterator.next()) != null) {
        results.push({ ...args })
        // Trigger error at {a: 1, b: 1}
        if (args.a === 1 && args.b === 1) {
          iterator.addLimit({ error: new Error('error') })
        }
      }

      // argLimits [1, 1] affect FUTURE variants only
      // Past variants (0,2) already iterated before addLimit() called
      // With includeErrorVariant: true, error variant (1,1) is included
      // Variants: (0,0), (0,1), (0,2), (1,0), (1,1) = 5
      assert.strictEqual(results.length, 5)
      assert.deepStrictEqual(results, [
        { a: 0, b: 0 },
        { a: 0, b: 1 },
        { a: 0, b: 2 }, // Past variant, already iterated
        { a: 1, b: 0 },
        { a: 1, b: 1 }, // Error variant IS included
      ])
    })

    it('addLimit() updates argLimits when lexicographically smaller error found at later index', async () => {
      // This tests the scenario where findBestError finds a lexicographically smaller error
      // at a later variant index (due to different seeds producing different error patterns)
      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [0, 1, 2, 3],
          b: [0, 1, 2, 3],
          c: [0, 1, 2, 3],
          d: [0, 1, 2, 3],
        },
        limitArgOnError: true,
      })

      iterator.start()

      // Simulate: first error found at position with indexes [0, 0, 3, 3]
      // Total variants with these limits: 1 * 1 * 4 * 4 = 16
      let args: any
      while ((args = iterator.next()) != null) {
        if (args.a === 0 && args.b === 0 && args.c === 3 && args.d === 3) {
          iterator.addLimit({ error: new Error('error1') })
          break
        }
      }

      assert.strictEqual((iterator.limit?.error as Error).message, 'error1')

      // Continue iteration to find a "later" variant that is lexicographically smaller
      // [0, 0, 1, 1] is lexicographically smaller than [0, 0, 3, 3] (at position 2: 1 < 3)
      // But [0, 0, 1, 1] was already passed! So we simulate a new cycle where this error occurs
      iterator.start()
      while ((args = iterator.next()) != null) {
        if (args.a === 0 && args.b === 0 && args.c === 1 && args.d === 1) {
          iterator.addLimit({ error: new Error('error2') })
          break
        }
      }

      // error2 should win because [0, 0, 1, 1] < [0, 0, 3, 3] lexicographically
      assert.strictEqual((iterator.limit?.error as Error).message, 'error2')

      // Start new cycle and count variants
      iterator.start()
      let count = 0
      while (iterator.next() != null) {
        count++
      }

      // argLimits from error2: [0, 0, 1, 1] (INCLUSIVE)
      // a <= 0, b <= 0, c <= 1, d <= 1 means 1 * 1 * 2 * 2 = 4 variants
      // Minus error variant = 3
      assert.strictEqual(count, 3)
    })

    it('sequential error reduction like real findBestError scenario', async () => {
      // Simulates the user's real scenario:
      // 1. First error with 18432 variants
      // 2. Second error (lexicographically smaller) should reduce to 4608
      // 3. Third error should reduce to 2304
      //
      // Using smaller numbers for test performance:
      // Template: a[3], b[2], c[4], d[4], e[4], f[4]
      // Full space: 3 * 2 * 4 * 4 * 4 * 4 = 1536

      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          a: [0, 1, 2], // 3 values
          b: [0, 1], // 2 values
          c: [0, 1, 2, 3], // 4 values
          d: [0, 1, 2, 3], // 4 values
          e: [0, 1, 2, 3], // 4 values
          f: [0, 1, 2, 3], // 4 values
        },
        limitArgOnError: true,
      })

      // Error 1: [0, 0, 0, 3, 3, 3]
      // Limits: 1 * 1 * 1 * 4 * 4 * 4 = 64
      iterator.addLimit({
        args: {
          a: 0,
          b: 0,
          c: 0,
          d: 3,
          e: 3,
          f: 3,
          seed: void 0,
        },
        error: new Error('error1'),
      })

      iterator.start()
      let count1 = 0
      while (iterator.next() != null) {
        count1++
      }
      assert.strictEqual(count1, 63) // 64 - 1 error variant
      assert.strictEqual((iterator.limit?.error as Error).message, 'error1')

      // Error 2: [0, 0, 0, 3, 1, 1] - lexicographically smaller at position 4 (1 < 3)
      // Limits: 1 * 1 * 1 * 4 * 2 * 2 = 16
      iterator.addLimit({
        args: {
          a: 0,
          b: 0,
          c: 0,
          d: 3,
          e: 1,
          f: 1,
          seed: void 0,
        },
        error: new Error('error2'),
      })

      iterator.start()
      let count2 = 0
      while (iterator.next() != null) {
        count2++
      }
      // Should be 16 - 1 = 15, NOT 63!
      assert.strictEqual(count2, 15)
      assert.strictEqual((iterator.limit?.error as Error).message, 'error2')

      // Error 3: [0, 0, 0, 1, 1, 1] - lexicographically smaller at position 3 (1 < 3)
      // Limits: 1 * 1 * 1 * 2 * 2 * 2 = 8
      iterator.addLimit({
        args: {
          a: 0,
          b: 0,
          c: 0,
          d: 1,
          e: 1,
          f: 1,
          seed: void 0,
        },
        error: new Error('error3'),
      })

      iterator.start()
      let count3 = 0
      while (iterator.next() != null) {
        count3++
      }
      // Should be 8 - 1 = 7
      assert.strictEqual(count3, 7)
      assert.strictEqual((iterator.limit?.error as Error).message, 'error3')
    })

    it('real findBestError scenario with saved error files and sequential reduction', async () => {
      // Replicates the user's real-world bug scenario:
      // 1. Three saved error files loaded via addLimit({args})
      // 2. File 2 wins lexicographically and becomes the initial limit
      // 3. Initial variants: 18432
      // 4. First new error reduces injectorFactoriesMax (4→2) and dependencyCountMax (4→2)
      //    Expected: 18432 / 4 = 4608
      // 5. Second new error reduces injectionsMax (2→1)
      //    Expected: 4608 / 2 = 2304

      const iterator = testVariantsIterator({
        log: logOptionsDisabled,
        argsTemplates: {
          returnReadableResolved: [false, true, null],
          dependencyFactory: [false, true],
          returnObservable: ({ dependencyFactory }) => {
            return dependencyFactory ? [true] : [false, true]
          },
          injectorInjectionsMax: [0, 1, 2, 3],
          injectorValueStoresMax: [0, 1, 2, 3],
          valueStoresMax: [0, 1, 2, 3],
          changesPerIterationMax: [0, 1],
          dependencyValueStore: [false, true],
          dependencyObservable: [false, true],
          useInjectorDefault: [false, true, null],
          injectorsMax: [1, 2, 3],
          injectorDependenciesMax: [0, 1, 2, 3],
          injectionsMax: [1, 2, 3],
          factoriesMax: [0, 1, 2, 3],
          injectorFactoriesMax: [0, 1, 2, 3],
          dependencyCountMax: [0, 1, 2, 3],
          checksPerIterationMax: [1],
          iterations: [1, 2, 10],
        },
        limitArgOnError: true,
      })

      // Load three saved error files via addLimit({args})
      // File 1 args
      iterator.addLimit({
        args: {
          returnReadableResolved: false,
          dependencyFactory: false,
          returnObservable: false,
          injectorInjectionsMax: 3,
          injectorValueStoresMax: 1,
          valueStoresMax: 2,
          changesPerIterationMax: 1,
          dependencyValueStore: true,
          dependencyObservable: true,
          useInjectorDefault: false,
          injectorsMax: 3,
          injectorDependenciesMax: 3,
          injectionsMax: 2,
          factoriesMax: 3,
          injectorFactoriesMax: 2,
          dependencyCountMax: 1,
          checksPerIterationMax: 1,
          iterations: 10,
          seed: void 0,
        },
        error: new Error('error1'),
      })

      // File 2 args - lexicographically smallest at injectorInjectionsMax (0 < 3)
      iterator.addLimit({
        args: {
          returnReadableResolved: false,
          dependencyFactory: false,
          returnObservable: false,
          injectorInjectionsMax: 0,
          injectorValueStoresMax: 1,
          valueStoresMax: 0,
          changesPerIterationMax: 1,
          dependencyValueStore: false,
          dependencyObservable: true,
          useInjectorDefault: false,
          injectorsMax: 3,
          injectorDependenciesMax: 1,
          injectionsMax: 2,
          factoriesMax: 3,
          injectorFactoriesMax: 3,
          dependencyCountMax: 3,
          checksPerIterationMax: 1,
          iterations: 10,
          seed: void 0,
        },
        error: new Error('error2'),
      })

      // File 3 args
      iterator.addLimit({
        args: {
          returnReadableResolved: false,
          dependencyFactory: false,
          returnObservable: false,
          injectorInjectionsMax: 0,
          injectorValueStoresMax: 2,
          valueStoresMax: 3,
          changesPerIterationMax: 1,
          dependencyValueStore: false,
          dependencyObservable: true,
          useInjectorDefault: false,
          injectorsMax: 3,
          injectorDependenciesMax: 1,
          injectionsMax: 1,
          factoriesMax: 3,
          injectorFactoriesMax: 3,
          dependencyCountMax: 1,
          checksPerIterationMax: 1,
          iterations: 10,
          seed: void 0,
        },
        error: new Error('error3'),
      })

      // File 2 should be the limit (lexicographically smallest)
      assert.strictEqual((iterator.limit?.error as Error).message, 'error2')

      // Count initial variants with file 2's limits
      // argLimits from file 2:
      // - 1-value args: returnReadableResolved, dependencyFactory, returnObservable,
      //   injectorInjectionsMax, valueStoresMax, dependencyValueStore, useInjectorDefault,
      //   checksPerIterationMax
      // - 2-value args: injectorValueStoresMax, changesPerIterationMax, dependencyObservable,
      //   injectorDependenciesMax, injectionsMax
      // - 3-value args: injectorsMax, iterations
      // - 4-value args: factoriesMax, injectorFactoriesMax, dependencyCountMax
      // Total: 2^5 * 3^2 * 4^3 = 32 * 9 * 64 = 18432
      iterator.start()
      let count1 = 0
      while (iterator.next() != null) {
        count1++
      }
      // 18432 - 1 (error variant excluded)
      assert.strictEqual(count1, 18431)

      // Simulate findBestError: first new error with smaller injectorFactoriesMax and dependencyCountMax
      // injectorFactoriesMax: 3→1 (indexes 0,1,2,3 → 0,1) = 4→2 values
      // dependencyCountMax: 3→1 (indexes 0,1,2,3 → 0,1) = 4→2 values
      // Reduction: 4/2 * 4/2 = 4x smaller
      iterator.addLimit({
        args: {
          returnReadableResolved: false,
          dependencyFactory: false,
          returnObservable: false,
          injectorInjectionsMax: 0,
          injectorValueStoresMax: 1,
          valueStoresMax: 0,
          changesPerIterationMax: 1,
          dependencyValueStore: false,
          dependencyObservable: true,
          useInjectorDefault: false,
          injectorsMax: 3,
          injectorDependenciesMax: 1,
          injectionsMax: 2,
          factoriesMax: 3,
          injectorFactoriesMax: 1, // Reduced from 3 to 1
          dependencyCountMax: 1, // Reduced from 3 to 1
          checksPerIterationMax: 1,
          iterations: 10,
          seed: void 0,
        },
        error: new Error('error4'),
      })

      iterator.start()
      let count2 = 0
      while (iterator.next() != null) {
        count2++
      }
      // 18432 / 4 - 1 = 4608 - 1 = 4607
      assert.strictEqual(count2, 4607)
      assert.strictEqual((iterator.limit?.error as Error).message, 'error4')

      // Second new error with smaller injectionsMax
      // injectionsMax: 2→1 (value 2→1 in [1,2,3], index 1→0) = 2→1 values
      // Reduction: 2x smaller
      iterator.addLimit({
        args: {
          returnReadableResolved: false,
          dependencyFactory: false,
          returnObservable: false,
          injectorInjectionsMax: 0,
          injectorValueStoresMax: 1,
          valueStoresMax: 0,
          changesPerIterationMax: 1,
          dependencyValueStore: false,
          dependencyObservable: true,
          useInjectorDefault: false,
          injectorsMax: 3,
          injectorDependenciesMax: 1,
          injectionsMax: 1, // Reduced from 2 to 1
          factoriesMax: 3,
          injectorFactoriesMax: 1,
          dependencyCountMax: 1,
          checksPerIterationMax: 1,
          iterations: 10,
          seed: void 0,
        },
        error: new Error('error5'),
      })

      iterator.start()
      let count3 = 0
      while (iterator.next() != null) {
        count3++
      }
      // 4608 / 2 - 1 = 2304 - 1 = 2303
      assert.strictEqual(count3, 2303)
      assert.strictEqual((iterator.limit?.error as Error).message, 'error5')
    })
  },
)
