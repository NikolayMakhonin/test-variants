/* eslint-disable @typescript-eslint/no-shadow */
import {Obj} from '~/src'
import {testVariantsIterator, TestVariantsIteratorOptions} from './testVariantsIterator'

describe('test-variants > testVariantsIterator', function () {
  this.timeout(10 * 60 * 1000)

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

  it('base', async function () {
    const results = collectVariants({
      argsTemplates: {
        a: [1, 2],
        b: ['x', 'y', 'z'],
        c: [true, false],
      },
    })

    assert.deepStrictEqual(results, [
      {a: 1, b: 'x', c: true},
      {a: 1, b: 'x', c: false},
      {a: 1, b: 'y', c: true},
      {a: 1, b: 'y', c: false},
      {a: 1, b: 'z', c: true},
      {a: 1, b: 'z', c: false},
      {a: 2, b: 'x', c: true},
      {a: 2, b: 'x', c: false},
      {a: 2, b: 'y', c: true},
      {a: 2, b: 'y', c: false},
      {a: 2, b: 'z', c: true},
      {a: 2, b: 'z', c: false},
    ])
  })

  it('index property', async function () {
    const iterator = testVariantsIterator({
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

  it('cycleIndex property', async function () {
    const iterator = testVariantsIterator({
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

  it('count property', async function () {
    const iterator = testVariantsIterator({
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

  it('addLimit with index', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2],
        b: ['x', 'y'],
      },
    })

    iterator.addLimit({index: 2})
    assert.strictEqual(iterator.count, 2)

    iterator.start()
    const result1 = iterator.next()
    assert.deepStrictEqual(result1, {a: 1, b: 'x'})

    const result2 = iterator.next()
    assert.deepStrictEqual(result2, {a: 1, b: 'y'})

    const result3 = iterator.next()
    assert.strictEqual(result3, null)
  })

  it('throws if next() called before start()', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2],
      },
    })

    assert.throws(() => {
      iterator.next()
    }, /start\(\) must be called before next\(\)/)
  })

  it('addLimit() uses current args and index', async function () {
    const iterator = testVariantsIterator({
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
    assert.deepStrictEqual(iterator.limit, {args: {a: 2, b: 'x'}})

    // Should stop at index 2
    const result = iterator.next()
    assert.strictEqual(result, null)
  })

  it('addLimit({error}) stores error in limit', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2],
      },
    })

    const testError = new Error('test error')

    iterator.start()
    iterator.next() // index 0: {a: 1}

    iterator.addLimit({error: testError})

    assert.strictEqual(iterator.count, 0)
    assert.deepStrictEqual(iterator.limit?.args, {a: 1})
    assert.strictEqual(iterator.limit?.error, testError)
  })

  it('addLimit() throws if called before next()', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2],
      },
    })

    iterator.start()

    assert.throws(() => {
      iterator.addLimit()
    }, /addLimit\(\) requires at least one next\(\) call/)
  })

  it('addLimit keeps earliest limit', async function () {
    const iterator = testVariantsIterator({
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
    assert.deepStrictEqual(iterator.limit?.args, {a: 3})

    // Try to add a later limit - should be ignored
    iterator.addLimit({index: 3})

    assert.strictEqual(iterator.count, 2) // unchanged
  })

  it('addLimit({args, index}) sets both count and limit', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2],
        b: ['x', 'y'],
      },
    })

    const savedArgs = {a: 1, b: 'y'}
    const testError = new Error('saved error')

    iterator.addLimit({args: savedArgs, index: 1, error: testError})

    assert.strictEqual(iterator.count, 1)
    assert.deepStrictEqual(iterator.limit?.args, savedArgs)
    assert.strictEqual(iterator.limit?.error, testError)
  })

  it('getSeed adds seed to returned args', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2],
      },
      getSeed: ({variantIndex, cycleIndex, repeatIndex}) => `${cycleIndex}-${variantIndex}-${repeatIndex}`,
    })

    iterator.start()

    const result1 = iterator.next()
    assert.deepStrictEqual(result1, {a: 1, seed: '0-0-0'})

    const result2 = iterator.next()
    assert.deepStrictEqual(result2, {a: 2, seed: '0-1-0'})
  })

  it('repeatsPerVariant repeats each variant', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2],
      },
      getSeed          : ({variantIndex, cycleIndex, repeatIndex}) => `${cycleIndex}-${variantIndex}-${repeatIndex}`,
      repeatsPerVariant: 3,
    })

    iterator.start()

    // Variant 0, repeats 0-2
    assert.deepStrictEqual(iterator.next(), {a: 1, seed: '0-0-0'})
    assert.deepStrictEqual(iterator.next(), {a: 1, seed: '0-0-1'})
    assert.deepStrictEqual(iterator.next(), {a: 1, seed: '0-0-2'})

    // Variant 1, repeats 0-2
    assert.deepStrictEqual(iterator.next(), {a: 2, seed: '0-1-0'})
    assert.deepStrictEqual(iterator.next(), {a: 2, seed: '0-1-1'})
    assert.deepStrictEqual(iterator.next(), {a: 2, seed: '0-1-2'})

    // Done
    assert.strictEqual(iterator.next(), null)
  })

  it('repeatsPerVariant with multiple cycles', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2],
      },
      getSeed          : ({variantIndex, cycleIndex, repeatIndex}) => `${cycleIndex}-${variantIndex}-${repeatIndex}`,
      repeatsPerVariant: 2,
    })

    // Cycle 0
    iterator.start()
    assert.deepStrictEqual(iterator.next(), {a: 1, seed: '0-0-0'})
    assert.deepStrictEqual(iterator.next(), {a: 1, seed: '0-0-1'})
    assert.deepStrictEqual(iterator.next(), {a: 2, seed: '0-1-0'})
    assert.deepStrictEqual(iterator.next(), {a: 2, seed: '0-1-1'})
    assert.strictEqual(iterator.next(), null)

    // Cycle 1
    iterator.start()
    assert.deepStrictEqual(iterator.next(), {a: 1, seed: '1-0-0'})
    assert.deepStrictEqual(iterator.next(), {a: 1, seed: '1-0-1'})
    assert.deepStrictEqual(iterator.next(), {a: 2, seed: '1-1-0'})
    assert.deepStrictEqual(iterator.next(), {a: 2, seed: '1-1-1'})
    assert.strictEqual(iterator.next(), null)
  })

  it('addLimit({args}) applies limit when position reached', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2],
        b: ['x', 'y'],
      },
    })

    // Add pending limit for {a: 1, b: 'y'} (index 1)
    iterator.addLimit({args: {a: 1, b: 'y'}})

    iterator.start()
    const result1 = iterator.next() // index 0: {a: 1, b: 'x'}
    assert.deepStrictEqual(result1, {a: 1, b: 'x'})

    const result2 = iterator.next() // index 1: {a: 1, b: 'y'} - pending limit applies
    assert.strictEqual(result2, null)

    assert.strictEqual(iterator.count, 1)
    assert.deepStrictEqual(iterator.limit, {args: {a: 1, b: 'y'}})
  })

  it('addLimit({args, error}) stores pending error', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2],
        b: ['x', 'y'],
      },
    })

    const testError = new Error('pending error')
    iterator.addLimit({args: {a: 2, b: 'x'}, error: testError})

    iterator.start()
    iterator.next() // 0
    iterator.next() // 1
    const result = iterator.next() // 2 - pending limit applies
    assert.strictEqual(result, null)

    assert.strictEqual(iterator.count, 2)
    assert.deepStrictEqual(iterator.limit?.args, {a: 2, b: 'x'})
    assert.strictEqual(iterator.limit?.error, testError)
  })

  it('addLimit({args}) discards if keys dont match', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2],
        b: ['x', 'y'],
      },
    })

    // Extra key 'c' - should be discarded
    iterator.addLimit({args: {a: 1, b: 'x', c: true} as any})

    iterator.start()
    iterator.next()
    iterator.next()
    iterator.next()
    iterator.next()
    const result = iterator.next() // Should exhaust normally
    assert.strictEqual(result, null)
    assert.strictEqual(iterator.count, 4) // No limit applied
  })

  it('addLimit({args}) discards if value not in static template', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2],
        b: ['x', 'y'],
      },
    })

    // Value 'z' not in template - should be discarded
    iterator.addLimit({args: {a: 1, b: 'z'}})

    iterator.start()
    iterator.next()
    iterator.next()
    iterator.next()
    iterator.next()
    const result = iterator.next()
    assert.strictEqual(result, null)
    assert.strictEqual(iterator.count, 4) // No limit applied
  })

  it('addLimit({args}) with seed key is ignored in validation', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2],
        b: ['x', 'y'],
      },
    })

    // Args with seed key - seed should be ignored in validation
    iterator.addLimit({args: {a: 1, b: 'y', seed: 'test-seed'} as any})

    iterator.start()
    iterator.next() // 0
    const result = iterator.next() // 1 - pending limit applies
    assert.strictEqual(result, null)

    assert.strictEqual(iterator.count, 1)
    // limit.args preserves original args including seed
    assert.deepStrictEqual(iterator.limit?.args, {a: 1, b: 'y', seed: 'test-seed'})
  })

  it('addLimit({args, index}) always applies index even if args invalid', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2],
        b: ['x', 'y'],
      },
    })

    // Invalid args (value 'z' not in template) but valid index
    iterator.addLimit({args: {a: 1, b: 'z'}, index: 2})

    assert.strictEqual(iterator.count, 2) // Index applied
    assert.strictEqual(iterator.limit, null) // But limit not set (args invalid)
  })

  it('multiple pending limits apply at different positions', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2, 3],
        b: ['x', 'y'],
      },
    })

    // Add two pending limits
    iterator.addLimit({args: {a: 2, b: 'x'}}) // position 2
    iterator.addLimit({args: {a: 1, b: 'y'}}) // position 1 - should win

    iterator.start()
    iterator.next() // 0
    const result = iterator.next() // 1 - earlier pending limit applies
    assert.strictEqual(result, null)

    assert.strictEqual(iterator.count, 1)
    assert.deepStrictEqual(iterator.limit?.args, {a: 1, b: 'y'})
  })

  it('limitArgOnError limits per-arg indexes', async function () {
    const iterator = testVariantsIterator({
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

    iterator.addLimit() // Limit at {a: 2, b: 'y'} -> argLimits: a < 2, b < 2

    // Next valid variants should only use a in [1] (index 0) and b in ['x'] (index 0)
    // Since all combinations with a < 2 and b < 2 are already past, should return null
    const result = iterator.next()
    assert.strictEqual(result, null)
  })

  it('limitArgOnError skips arg at index 0', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2, 3],
        b: ['x', 'y', 'z'],
      },
      limitArgOnError: true,
    })

    iterator.start()
    iterator.next() // 0: {a: 1, b: 'x'}
    iterator.next() // 1: {a: 1, b: 'y'}

    iterator.addLimit() // Limit at {a: 1, b: 'y'} -> a index 0 (skip), b index 1 (limit)

    // count is set to 1, so this cycle stops immediately
    const result = iterator.next()
    assert.strictEqual(result, null)
    assert.strictEqual(iterator.count, 1)

    // Start new cycle - argLimits persist, only b='x' variants are valid
    iterator.start()
    const results: any[] = []
    let args: any
    while ((args = iterator.next()) != null) {
      results.push(args)
    }

    // Should only yield variants with b='x' (index 0 < 1) since a is not limited (index 0)
    assert.deepStrictEqual(results, [
      {a: 1, b: 'x'},
    ])
  })

  it('limitArgOnError with callback', async function () {
    const iterator = testVariantsIterator({
      argsTemplates: {
        a: [1, 2, 3],
        b: ['x', 'y', 'z'],
      },
      limitArgOnError: ({name}) => name === 'b', // Only limit 'b' arg
    })

    iterator.start()
    iterator.next() // 0: {a: 1, b: 'x'}
    iterator.next() // 1: {a: 1, b: 'y'}
    iterator.next() // 2: {a: 1, b: 'z'}
    iterator.next() // 3: {a: 2, b: 'x'}
    iterator.next() // 4: {a: 2, b: 'y'}

    iterator.addLimit() // Limit at {a: 2, b: 'y'} -> only b is limited (index 1)

    // count is set to 4, so this cycle stops immediately
    assert.strictEqual(iterator.count, 4)
    assert.strictEqual(iterator.next(), null)

    // Start new cycle - argLimits persist, only b in ['x'] variants are valid
    iterator.start()
    const results: any[] = []
    let args: any
    while ((args = iterator.next()) != null) {
      results.push(args)
    }

    // Should yield variants with b in ['x'] (index 0 < 1)
    // a is not limited so all a values are valid
    assert.deepStrictEqual(results, [
      {a: 1, b: 'x'},
      {a: 2, b: 'x'},
      {a: 3, b: 'x'},
    ])
  })
})
