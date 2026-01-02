import { testVariantsRun } from 'src/common/test-variants/testVariantsRun'
import { testVariantsIterator } from 'src/common/test-variants/testVariantsIterator'
import { TestVariantsTestRun } from './testVariantsCreateTestRun'

describe('test-variants > testVariantsRun', function () {
  this.timeout(10 * 60 * 1000)

  it('findBestError with limitArgOnError should constrain second cycle', async function () {
    // Bug reproduction test:
    // When limitArgOnError is enabled, the second cycle should iterate
    // through a constrained number of variants based on argLimits,
    // not all variants up to state.count

    const cycles = 3
    const errorAtVariantIndex = 150 // Error at variant index 150

    // Create a large parameter space: 100 * 100 = 10000 variants
    // Error at index 150 means a=1, b=50
    // With limitArgOnError, argLimits should be [1, 50]
    // Constrained space: (1+1) * (50+1) = 2 * 51 = 102 variants
    // Second cycle should iterate at most 102 variants, not 10000

    const cycleVariants: number[] = []
    let errorCount = 0

    const variants = testVariantsIterator({
      argsTemplates: {
        a: Array.from({ length: 100 }).map((_, i) => i),
        b: Array.from({ length: 100 }).map((_, i) => i),
      },
      limitArgOnError: true,
    })

    const testRun = (_args: { a: number; b: number }, index: number) => {
      const cycleIndex = variants.cycleIndex
      if (cycleVariants[cycleIndex] == null) {
        cycleVariants[cycleIndex] = 0
      }
      cycleVariants[cycleIndex]++

      if (index === errorAtVariantIndex) {
        errorCount++
        throw new Error(`Error at index ${index}`)
      }
      return {
        iterationsSync: 1,
        iterationsAsync: 0,
      }
    }

    const result = await testVariantsRun(testRun, variants, {
      cycles,
      findBestError: {
        dontThrowIfError: true,
      },
      log: false,
    })

    // Verify error was found
    assert.ok(result.bestError, 'bestError should not be null')
    assert.strictEqual(
      result.bestError.error.message,
      `Error at index ${errorAtVariantIndex}`,
    )

    console.log({
      cycleVariants,
      errorCount,
      count: variants.count,
    })

    // First cycle: iterates through all 10000 variants (or up to error if no other errors later)
    // In findBestError mode with no other errors, it stops at error index

    // Second and third cycles should be MUCH smaller than 10000 due to argLimits
    // They should iterate at most 102 variants (constrained by argLimits)
    // Actually with count=150, and argLimits constraining to 102, we get min(150, 102) = 102

    // The key assertion: cycles after first should NOT iterate all 10000 variants
    for (let i = 1; i < cycleVariants.length; i++) {
      assert.ok(
        cycleVariants[i] < 200,
        `Cycle ${i} should iterate fewer than 200 variants due to argLimits, but got ${cycleVariants[i]}`,
      )
    }
  })

  it('findBestError with limitArgOnError and dynamic templates', async function () {
    // Test with dynamic templates (functions) to verify argLimits work correctly
    // when template values depend on previous args

    const cycles = 3
    const errorAtA = 1
    const errorAtB = 5

    const cycleVariants: number[] = []
    let errorCount = 0

    // Dynamic template: b's values depend on a
    // Total variants without limits: sum of (a+10) for a in 0..9 = 10+11+...+19 = 145
    const variants = testVariantsIterator({
      argsTemplates: {
        a: Array.from({ length: 10 }).map((_, i) => i), // 0-9
        b: (args: { a: number }) =>
          Array.from({ length: args.a + 10 }).map((_, i) => i), // 0 to (a+9)
      },
      limitArgOnError: true,
    })

    const testRun = (args: { a: number; b: number }) => {
      const cycleIndex = variants.cycleIndex
      if (cycleVariants[cycleIndex] == null) {
        cycleVariants[cycleIndex] = 0
      }
      cycleVariants[cycleIndex]++

      if (args.a === errorAtA && args.b === errorAtB) {
        errorCount++
        throw new Error(`Error at a=${args.a}, b=${args.b}`)
      }
      return {
        iterationsSync: 1,
        iterationsAsync: 0,
      }
    }

    const result = await testVariantsRun(testRun, variants, {
      cycles,
      findBestError: {
        dontThrowIfError: true,
      },
      log: false,
    })

    // Verify error was found
    assert.ok(result.bestError, 'bestError should not be null')
    assert.strictEqual(
      result.bestError.error.message,
      `Error at a=${errorAtA}, b=${errorAtB}`,
    )

    console.log({
      cycleVariants,
      errorCount,
      count: variants.count,
      limit: variants.limit,
    })

    // With argLimits [1, 5]:
    // a can be 0 or 1
    // For a=0: b can be 0..5 (but b template gives 0..9, limited to 0..5) = 6 values
    // For a=1: b can be 0..5 (b template gives 0..10, limited to 0..5) = 6 values
    // Total: 12 variants max

    // Second and third cycles should be constrained
    for (let i = 1; i < cycleVariants.length; i++) {
      assert.ok(
        cycleVariants[i] < 50,
        `Cycle ${i} should iterate fewer than 50 variants due to argLimits, but got ${cycleVariants[i]}`,
      )
    }
  })

  it('findBestError with limitArgOnError and getSeed', async function () {
    // Test with getSeed to verify argLimits work correctly when seeds are involved
    // This tests the scenario where:
    // 1. Error is found at some seed in cycle 1
    // 2. Subsequent cycles should be constrained by argLimits

    const cycles = 3
    const errorAtA = 1
    const errorAtB = 50

    const cycleVariants: number[] = []
    let errorCount = 0

    // Large parameter space: 100 * 100 = 10000 variants
    const variants = testVariantsIterator({
      argsTemplates: {
        a: Array.from({ length: 100 }).map((_, i) => i),
        b: Array.from({ length: 100 }).map((_, i) => i),
      },
      limitArgOnError: true,
      getSeed: ({ cycles, tests }) => cycles * 10000 + tests,
    })

    const testRun = (args: { a: number; b: number; seed: number }) => {
      const cycleIndex = variants.cycleIndex
      if (cycleVariants[cycleIndex] == null) {
        cycleVariants[cycleIndex] = 0
      }
      cycleVariants[cycleIndex]++

      if (args.a === errorAtA && args.b === errorAtB) {
        errorCount++
        throw new Error(`Error at a=${args.a}, b=${args.b}, seed=${args.seed}`)
      }
      return {
        iterationsSync: 1,
        iterationsAsync: 0,
      }
    }

    const result = await testVariantsRun(testRun, variants, {
      cycles,
      findBestError: {
        dontThrowIfError: true,
      },
      log: false,
    })

    // Verify error was found
    assert.ok(result.bestError, 'bestError should not be null')

    console.log({
      cycleVariants,
      errorCount,
      count: variants.count,
      limit: variants.limit?.args,
    })

    // With argLimits [1, 50]:
    // a can be 0 or 1
    // b can be 0..50 (51 values)
    // Total: 2 * 51 = 102 variants max

    // Second and third cycles should be constrained
    for (let i = 1; i < cycleVariants.length; i++) {
      assert.ok(
        cycleVariants[i] < 200,
        `Cycle ${i} should iterate fewer than 200 variants due to argLimits, but got ${cycleVariants[i]}`,
      )
    }
  })

  it('findBestError with limitArgOnError and object values', async function () {
    // Test with object values to verify reference comparison doesn't break argLimits
    // Objects are compared by reference with ===, which could fail if templates
    // create new objects on each call

    const cycles = 3

    const cycleVariants: number[] = []
    let errorCount = 0

    // Object values - these are the SAME references across calls
    const objA1 = { id: 'a1' }
    const objA2 = { id: 'a2' }
    const objB1 = { id: 'b1' }
    const objB2 = { id: 'b2' }
    const objB3 = { id: 'b3' }

    const variants = testVariantsIterator({
      argsTemplates: {
        a: [objA1, objA2],
        b: [objB1, objB2, objB3],
      },
      limitArgOnError: true,
    })

    const testRun = (args: { a: { id: string }; b: { id: string } }) => {
      const cycleIndex = variants.cycleIndex
      if (cycleVariants[cycleIndex] == null) {
        cycleVariants[cycleIndex] = 0
      }
      cycleVariants[cycleIndex]++

      // Error at a=objA2, b=objB2 (index 4: 3 + 1)
      if (args.a === objA2 && args.b === objB2) {
        errorCount++
        throw new Error(`Error at a=${args.a.id}, b=${args.b.id}`)
      }
      return {
        iterationsSync: 1,
        iterationsAsync: 0,
      }
    }

    const result = await testVariantsRun(testRun, variants, {
      cycles,
      findBestError: {
        dontThrowIfError: true,
      },
      log: false,
    })

    // Verify error was found
    assert.ok(result.bestError, 'bestError should not be null')

    console.log({
      cycleVariants,
      errorCount,
      count: variants.count,
    })

    // argLimits should be [1, 1] (objA2 at index 1, objB2 at index 1)
    // Total constrained: 2 * 2 = 4 variants

    // Second and third cycles should be constrained
    for (let i = 1; i < cycleVariants.length; i++) {
      assert.ok(
        cycleVariants[i] <= 4,
        `Cycle ${i} should iterate at most 4 variants due to argLimits, but got ${cycleVariants[i]}`,
      )
    }
  })

  it('findBestError with limitArgOnError and dynamic object values - BUG REPRODUCTION', async function () {
    // BUG REPRODUCTION TEST
    // When dynamic templates create NEW object instances on each call,
    // the === comparison fails and argLimits may not work correctly

    const cycles = 3

    const cycleVariants: number[] = []
    let errorCount = 0

    // Dynamic template that creates NEW objects on each call
    const variants = testVariantsIterator({
      argsTemplates: {
        a: Array.from({ length: 10 }).map((_, i) => i),
        // This creates NEW object instances on each call!
        b: () => Array.from({ length: 10 }).map((_, i) => ({ value: i })),
      },
      limitArgOnError: true,
    })

    const testRun = (args: { a: number; b: { value: number } }) => {
      const cycleIndex = variants.cycleIndex
      if (cycleVariants[cycleIndex] == null) {
        cycleVariants[cycleIndex] = 0
      }
      cycleVariants[cycleIndex]++

      // Error at a=1, b.value=5 (index 15)
      if (args.a === 1 && args.b.value === 5) {
        errorCount++
        throw new Error(`Error at a=${args.a}, b.value=${args.b.value}`)
      }
      return {
        iterationsSync: 1,
        iterationsAsync: 0,
      }
    }

    const result = await testVariantsRun(testRun, variants, {
      cycles,
      findBestError: {
        dontThrowIfError: true,
      },
      log: false,
    })

    // Verify error was found
    assert.ok(result.bestError, 'bestError should not be null')

    console.log({
      cycleVariants,
      errorCount,
      count: variants.count,
    })

    // With proper argLimits [1, 5]:
    // a can be 0 or 1 (2 values)
    // b can be 0..5 (6 values)
    // Total: 2 * 6 = 12 variants

    // If bug exists: second cycle would iterate all 100 variants
    // If fixed: second cycle would iterate ~12 variants

    // This test may FAIL if the bug exists
    for (let i = 1; i < cycleVariants.length; i++) {
      assert.ok(
        cycleVariants[i] < 20,
        `Cycle ${i} should iterate fewer than 20 variants due to argLimits, but got ${cycleVariants[i]}`,
      )
    }
  })

  it('findBestError', async function () {
    const cycles = 10
    const variantsCount = 1000

    for (
      let expectedIndex = 0;
      expectedIndex <= variantsCount;
      expectedIndex++
    ) {
      const expectedArgs =
        expectedIndex < variantsCount ? { i: expectedIndex } : null

      const testRun: TestVariantsTestRun<typeof expectedArgs> = (args: {
        i: number
      }) => {
        if (
          (expectedArgs != null && args.i === expectedArgs.i) ||
          args.i > (expectedIndex + variantsCount) / 2
        ) {
          throw new Error(`Error at index ${expectedIndex}`)
        }
        return {
          iterationsSync: 1,
          iterationsAsync: 0,
        }
      }

      const variants = testVariantsIterator({
        argsTemplates: {
          i: Array.from({ length: variantsCount }).map((_, i) => i),
        },
        getSeed: ({ cycles }) => cycles,
        iterationModes: [{ mode: 'forward', attemptsPerVariant: 1 }],
      })

      const result = await testVariantsRun(testRun, variants, {
        cycles,
        findBestError: {
          dontThrowIfError: true,
        },
        log: false,
      })

      try {
        if (expectedIndex >= variantsCount) {
          assert.ok(result.bestError == null)
        } else {
          assert.ok(result.bestError)
          assert.strictEqual(result.bestError.args.i, expectedArgs.i)
          assert.strictEqual(
            result.bestError.error.message,
            `Error at index ${expectedIndex}`,
          )
        }
        // assert.ok(result.iterations >= 5)
        // console.log(result.iterations)
      } catch (err) {
        console.error({
          expectedIndex,
          result,
        })
        throw err
      }
    }
  })
})
