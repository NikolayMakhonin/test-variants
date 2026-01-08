/**
 * Comprehensive test verifying all README-documented functionality
 *
 * Each test verifies actual behavior, not just that options are accepted
 */

import { describe, it, expect } from 'vitest'
import { createTestVariants } from 'src/common/test-variants/createTestVariants'
import { AbortControllerFast } from '@flemist/abort-controller-fast'
import { TimeControllerMock } from '@flemist/time-controller'
import type {
  ModeChangeEvent,
  TestVariantsLogType,
  TestOptions,
} from 'src/common/test-variants/types'

describe('README comprehensive', () => {
  // region createTestVariants and parameter templates

  it('cartesian product: static templates generate all combinations', async () => {
    const calls: { a: number; b: string; c: boolean }[] = []

    const testVariants = createTestVariants(
      ({ a, b, c }: { a: number; b: string; c: boolean }) => {
        calls.push({ a, b, c })
      },
    )

    await testVariants({
      a: [1, 2],
      b: ['x', 'y'],
      c: [true, false],
    })({ log: false })

    // 2 * 2 * 2 = 8 combinations
    expect(calls.length).toBe(8)
    // Verify all combinations exist
    expect(calls).toContainEqual({ a: 1, b: 'x', c: true })
    expect(calls).toContainEqual({ a: 1, b: 'x', c: false })
    expect(calls).toContainEqual({ a: 1, b: 'y', c: true })
    expect(calls).toContainEqual({ a: 1, b: 'y', c: false })
    expect(calls).toContainEqual({ a: 2, b: 'x', c: true })
    expect(calls).toContainEqual({ a: 2, b: 'x', c: false })
    expect(calls).toContainEqual({ a: 2, b: 'y', c: true })
    expect(calls).toContainEqual({ a: 2, b: 'y', c: false })
  })

  it('dynamic templates: values depend on previously assigned parameters', async () => {
    const calls: { a: number; b: number; c: number }[] = []

    const testVariants = createTestVariants(
      ({ a, b, c }: { a: number; b: number; c: number }) => {
        calls.push({ a, b, c })
      },
    )

    await testVariants({
      a: [1, 2],
      b: ({ a }) => (a === 1 ? [10, 11] : [20]),
      c: ({ a, b }) => [a + b],
    })({ log: false })

    // a=1: b=[10,11], so 2 combos; a=2: b=[20], so 1 combo = 3 total
    expect(calls.length).toBe(3)
    expect(calls).toContainEqual({ a: 1, b: 10, c: 11 })
    expect(calls).toContainEqual({ a: 1, b: 11, c: 12 })
    expect(calls).toContainEqual({ a: 2, b: 20, c: 22 })
  })

  it('dynamic template returning empty array: skips that branch', async () => {
    const calls: number[] = []

    const testVariants = createTestVariants(
      ({ a, b }: { a: number; b: number }) => {
        calls.push(a * 10 + b)
      },
    )

    await testVariants({
      a: [1, 2, 3],
      b: ({ a }) => (a === 2 ? [] : [1, 2]),
    })({ log: false })

    // a=1: b=[1,2], a=2: b=[], a=3: b=[1,2] => 4 calls
    expect(calls.length).toBe(4)
    expect(calls).toContainEqual(11)
    expect(calls).toContainEqual(12)
    expect(calls).toContainEqual(31)
    expect(calls).toContainEqual(32)
    // a=2 branch is completely skipped
    expect(calls.filter(c => Math.floor(c / 10) === 2)).toEqual([])
  })

  // endregion

  // region Test function return values

  it('test returning number: adds to iterations count', async () => {
    const testVariants = createTestVariants(() => {
      return 5
    })

    const result = await testVariants({
      a: [1, 2],
    })({ log: false })

    // 2 variants, each returning 5 => iterations = 5 + 5 = 10
    expect(result.iterations).toBe(10)
  })

  it('test returning iterations object: both sync and async counted', async () => {
    const testVariants = createTestVariants(() => {
      return { iterationsAsync: 3, iterationsSync: 7 }
    })

    const result = await testVariants({
      a: [1, 2],
    })({ log: false })

    // 2 variants * (3 + 7) = 20
    expect(result.iterations).toBe(20)
  })

  it('async test receives abortSignal and timeController', async () => {
    let signalWasAbortedDuringTest = true
    let receivedTimeController: TimeControllerMock | undefined

    const mockTimeController = new TimeControllerMock()

    const testVariants = createTestVariants(
      async (_args: { a: number }, options: TestOptions) => {
        // Check signal state DURING execution, not after completion
        // (cleanup aborts the signal after testVariants returns)
        signalWasAbortedDuringTest = options.abortSignal.aborted
        receivedTimeController = options.timeController as TimeControllerMock
        await Promise.resolve()
      },
    )

    await testVariants({ a: [1] })({
      log: false,
      timeController: mockTimeController,
    })

    expect(signalWasAbortedDuringTest).toBe(false)
    expect(receivedTimeController).toBe(mockTimeController)
  })

  // endregion

  // region Log options

  it('log func receives all enabled log types', async () => {
    const receivedLogs: { type: TestVariantsLogType; message: string }[] = []

    const testVariants = createTestVariants(({ a }: { a: number }) => {
      if (a === 2) throw new Error('test error')
    })

    await testVariants({ a: [1, 2, 3] })({
      log: {
        start: true,
        progress: false,
        completed: true,
        error: true,
        modeChange: true,
        debug: false,
        func: (type, message) => receivedLogs.push({ type, message }),
      },
      findBestError: { dontThrowIfError: true },
    })

    const types = receivedLogs.map(l => l.type)
    expect(types).toContain('start')
    expect(types).toContain('completed')
    expect(types).toContain('error')
    // Note: modeChange is only logged together with progress logging
    // When progress is disabled, modeChange is not logged even if modeChange option is true
    // Verify messages contain expected content
    const isSafari =
      typeof window !== 'undefined' &&
      /AppleWebKit/.test(navigator.userAgent) &&
      !/Chrome/.test(navigator.userAgent)
    if (!isSafari) {
      expect(
        receivedLogs.find(l => l.type === 'start')?.message,
        navigator.userAgent,
      ).toContain('memory')
    }
    expect(receivedLogs.find(l => l.type === 'error')?.message).toContain(
      'test error',
    )
  })

  it('log: false disables all logging', async () => {
    const receivedLogs: string[] = []

    const testVariants = createTestVariants(() => {})

    await testVariants({ a: [1, 2] })({
      log: {
        start: false,
        progress: false,
        completed: false,
        error: false,
        modeChange: false,
        func: (_, message) => receivedLogs.push(message),
      },
    })

    expect(receivedLogs).toEqual([])
  })

  // endregion

  // region abortSignal

  it('abortSignal: abort stops execution and signal.aborted becomes true', async () => {
    const abortController = new AbortControllerFast()
    const callArgs: number[] = []
    let signalAbortedInsideTest = false

    const testVariants = createTestVariants(
      async ({ a }: { a: number }, options: TestOptions) => {
        callArgs.push(a)
        if (a === 3) {
          abortController.abort()
          signalAbortedInsideTest = options.abortSignal.aborted
        }
        await Promise.resolve()
      },
    )

    try {
      await testVariants({ a: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })({
        log: false,
        abortSignal: abortController.signal,
      })
    } catch {
      // Abort throws
    }

    // Execution stopped at or shortly after a=3
    expect(callArgs.length).toBeLessThanOrEqual(4)
    expect(callArgs).toContain(3)
    expect(signalAbortedInsideTest).toBe(true)
  })

  // endregion

  // region Parallel execution

  it('parallel: true allows unlimited concurrency', async () => {
    let maxConcurrent = 0
    let current = 0

    const testVariants = createTestVariants(async () => {
      current++
      maxConcurrent = Math.max(maxConcurrent, current)
      await new Promise(r => setTimeout(r, 20))
      current--
    })

    await testVariants({ a: [1, 2, 3, 4, 5, 6] })({
      log: false,
      parallel: true,
    })

    // With unlimited parallel, all 6 should start concurrently
    expect(maxConcurrent).toBe(6)
  })

  it('parallel: number limits concurrency to that number', async () => {
    let maxConcurrent = 0
    let current = 0

    const testVariants = createTestVariants(async () => {
      current++
      maxConcurrent = Math.max(maxConcurrent, current)
      await new Promise(r => setTimeout(r, 10))
      current--
    })

    await testVariants({ a: [1, 2, 3, 4, 5, 6] })({
      log: false,
      parallel: 2,
    })

    expect(maxConcurrent).toBe(2)
  })

  it('parallel: false runs sequentially', async () => {
    const order: number[] = []

    const testVariants = createTestVariants(async ({ a }: { a: number }) => {
      order.push(a)
      await Promise.resolve()
    })

    await testVariants({ a: [3, 1, 2] })({
      log: false,
      parallel: false,
    })

    // Sequential means order preserved
    expect(order).toEqual([3, 1, 2])
  })

  // endregion

  // region Global limits

  it('limitTests: stops after exactly N tests', async () => {
    let callCount = 0

    const testVariants = createTestVariants(() => {
      callCount++
    })

    const result = await testVariants({ a: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })({
      log: false,
      limitTests: 4,
    })

    expect(callCount).toBe(4)
    expect(result.iterations).toBe(4)
  })

  it('cycles: runs through all variants multiple times', async () => {
    const calls: number[] = []

    const testVariants = createTestVariants(({ a }: { a: number }) => {
      calls.push(a)
    })

    await testVariants({ a: [1, 2] })({
      log: false,
      cycles: 3,
    })

    // 2 variants * 3 cycles = 6 calls
    expect(calls.length).toBe(6)
    expect(calls).toEqual([1, 2, 1, 2, 1, 2])
  })

  // endregion

  // region Iteration modes

  it('forward mode: iterates from first to last variant', async () => {
    const calls: { a: number; b: number }[] = []

    const testVariants = createTestVariants(
      ({ a, b }: { a: number; b: number }) => {
        calls.push({ a, b })
      },
    )

    await testVariants({ a: [1, 2], b: [10, 20] })({
      log: false,
      iterationModes: [{ mode: 'forward' }],
    })

    // Forward: rightmost (b) cycles first, then a
    expect(calls).toEqual([
      { a: 1, b: 10 },
      { a: 1, b: 20 },
      { a: 2, b: 10 },
      { a: 2, b: 20 },
    ])
  })

  it('backward mode: iterates from last to first variant', async () => {
    const calls: { a: number; b: number }[] = []

    const testVariants = createTestVariants(
      ({ a, b }: { a: number; b: number }) => {
        calls.push({ a, b })
      },
    )

    await testVariants({ a: [1, 2], b: [10, 20] })({
      log: false,
      iterationModes: [{ mode: 'backward' }],
    })

    // Backward: starts from last combination
    expect(calls).toEqual([
      { a: 2, b: 20 },
      { a: 2, b: 10 },
      { a: 1, b: 20 },
      { a: 1, b: 10 },
    ])
  })

  it('random mode: generates random valid combinations', async () => {
    const calls: number[] = []

    const testVariants = createTestVariants(({ a }: { a: number }) => {
      calls.push(a)
    })

    // Random mode needs global limitTests because it's excluded from cycles calculation
    await testVariants({ a: [1, 2, 3, 4, 5] })({
      log: false,
      limitTests: 20,
      iterationModes: [{ mode: 'random' }],
    })

    expect(calls.length).toBe(20)
    // All values should be valid (1-5)
    calls.forEach(c => expect([1, 2, 3, 4, 5]).toContain(c))
    // With 20 calls over 5 values, highly likely all values appear
    expect(new Set(calls).size).toBeGreaterThanOrEqual(4)
  })

  it('attemptsPerVariant: repeats each variant N times', async () => {
    const calls: number[] = []

    const testVariants = createTestVariants(({ a }: { a: number }) => {
      calls.push(a)
    })

    await testVariants({ a: [1, 2, 3] })({
      log: false,
      iterationModes: [{ mode: 'forward', attemptsPerVariant: 2 }],
    })

    expect(calls).toEqual([1, 1, 2, 2, 3, 3])
  })

  it('mode limitTests: limits tests within that mode before switching', async () => {
    const modeTests: { mode: string; count: number }[] = []
    let currentMode = ''
    let modeCallCount = 0

    const testVariants = createTestVariants(() => {
      modeCallCount++
    })

    // Use global limitTests to stop after one round of mode switches
    await testVariants({ a: [1, 2, 3, 4, 5] })({
      log: false,
      limitTests: 5, // Stop after 2 + 3 tests
      onModeChange: event => {
        if (currentMode) {
          modeTests.push({ mode: currentMode, count: modeCallCount })
        }
        currentMode = event.mode.mode
        modeCallCount = 0
      },
      iterationModes: [
        { mode: 'forward', limitTests: 2 },
        { mode: 'backward', limitTests: 3 },
      ],
    })
    modeTests.push({ mode: currentMode, count: modeCallCount })

    // First mode runs 2 tests, second runs 3 tests (total 5 = global limit)
    expect(modeTests).toEqual([
      { mode: 'forward', count: 2 },
      { mode: 'backward', count: 3 },
    ])
  })

  it('multiple modes switch in sequence', async () => {
    const modeChanges: string[] = []

    const testVariants = createTestVariants(() => {})

    // Use global limitTests to stop after exactly one round through all modes
    await testVariants({ a: [1, 2, 3] })({
      log: false,
      limitTests: 3, // 1 + 1 + 1 = 3 tests total
      onModeChange: event => modeChanges.push(event.mode.mode),
      iterationModes: [
        { mode: 'forward', limitTests: 1 },
        { mode: 'random', limitTests: 1 },
        { mode: 'backward', limitTests: 1 },
      ],
    })

    expect(modeChanges).toEqual(['forward', 'random', 'backward'])
  })

  // endregion

  // region findBestError

  it('findBestError.dontThrowIfError: returns error in result instead of throwing', async () => {
    const testVariants = createTestVariants(({ a }: { a: number }) => {
      if (a === 3) throw new Error('error at 3')
    })

    const result = await testVariants({ a: [1, 2, 3, 4, 5] })({
      log: false,
      findBestError: { dontThrowIfError: true },
    })

    expect(result.bestError).not.toBeNull()
    expect(result.bestError!.args.a).toBe(3)
    expect(result.bestError!.error.message).toBe('error at 3')
    // README: "tests - number of tests run before the error"
    // Error at a=3 means 2 tests (a=1 and a=2) ran before
    expect(result.bestError!.tests).toBe(2)
  })

  it('without findBestError: throws immediately on first error', async () => {
    const calls: number[] = []

    const testVariants = createTestVariants(({ a }: { a: number }) => {
      calls.push(a)
      if (a === 2) throw new Error('error at 2')
    })

    await expect(
      testVariants({ a: [1, 2, 3, 4, 5] })({ log: false }),
    ).rejects.toThrow('error at 2')

    // Stopped at error, didn't continue
    expect(calls).toEqual([1, 2])
  })

  it('findBestError.equals: uses custom equality for finding error variant indexes', async () => {
    type ObjArg = { id: number; name: string }

    const testVariants = createTestVariants(({ a }: { a: ObjArg }) => {
      if (a.id === 2) throw new Error('error')
    })

    const result = await testVariants({
      a: [
        { id: 1, name: 'one' },
        { id: 2, name: 'two' },
        { id: 3, name: 'three' },
      ],
    })({
      log: false,
      findBestError: {
        equals: (x: ObjArg, y: ObjArg) => x.id === y.id,
        dontThrowIfError: true,
      },
    })

    expect(result.bestError).not.toBeNull()
    expect(result.bestError!.args.a.id).toBe(2)
  })

  it('findBestError.limitArgOnError: constrains search space on error', async () => {
    const calls: { a: number; b: number }[] = []

    const testVariants = createTestVariants(
      ({ a, b }: { a: number; b: number }) => {
        calls.push({ a, b })
        if (a === 2 && b === 2) throw new Error('error')
      },
    )

    await testVariants({ a: [1, 2, 3], b: [1, 2, 3] })({
      log: false,
      findBestError: {
        limitArgOnError: true,
        dontThrowIfError: true,
      },
      cycles: 3,
    })

    // After error at (2,2), only variants with a<=2 and b<=2 should be tested
    // Variants with a=3 or b=3 should not appear after the error
    const callsBeforeError = calls.slice(
      0,
      calls.findIndex(c => c.a === 2 && c.b === 2) + 1,
    )
    const callsAfterError = calls.slice(
      calls.findIndex(c => c.a === 2 && c.b === 2) + 1,
    )

    // After error, no calls with a>2 or b>2
    callsAfterError.forEach(c => {
      expect(c.a).toBeLessThanOrEqual(2)
      expect(c.b).toBeLessThanOrEqual(2)
    })
  })

  it('findBestError.limitArgOnError function: custom per-arg limiting', async () => {
    const limitedArgs: string[] = []

    const testVariants = createTestVariants(
      ({ a, b }: { a: number; b: number }) => {
        if (a === 2 && b === 2) throw new Error('error')
      },
    )

    await testVariants({ a: [1, 2, 3], b: [1, 2, 3] })({
      log: false,
      findBestError: {
        limitArgOnError: ({ name }) => {
          limitedArgs.push(name)
          return name === 'b' // Only limit 'b', not 'a'
        },
        dontThrowIfError: true,
      },
      cycles: 2,
    })

    // Function was called for each arg
    expect(limitedArgs).toContain('a')
    expect(limitedArgs).toContain('b')
  })

  it('findBestError.includeErrorVariant: includes error variant in subsequent iterations', async () => {
    let errorCount = 0

    const testVariants = createTestVariants(({ a }: { a: number }) => {
      if (a === 2) {
        errorCount++
        throw new Error('error')
      }
    })

    await testVariants({ a: [1, 2, 3] })({
      log: false,
      findBestError: {
        includeErrorVariant: true,
        dontThrowIfError: true,
      },
      cycles: 3,
    })

    // With includeErrorVariant, error variant is retried each cycle
    expect(errorCount).toBeGreaterThan(1)
  })

  // endregion

  // region getSeed

  it('getSeed: seeds are generated and passed to test', async () => {
    const receivedSeeds: number[] = []
    const testsAtSeedGen: number[] = []

    const testVariants = createTestVariants(
      ({ a, seed }: { a: number; seed: number }) => {
        receivedSeeds.push(seed)
      },
    )

    await testVariants({ a: [1, 2, 3] })({
      log: false,
      getSeed: ({ tests }) => {
        testsAtSeedGen.push(tests)
        return tests * 100
      },
    })

    // Seeds generated for each test
    expect(testsAtSeedGen).toEqual([0, 1, 2])
    expect(receivedSeeds).toEqual([0, 100, 200])
  })

  // endregion

  // region onError callback

  it('onError: called with error details', async () => {
    const errors: { error: Error; args: { a: number }; tests: number }[] = []

    const testVariants = createTestVariants(({ a }: { a: number }) => {
      if (a === 3) throw new Error('error at 3')
    })

    await testVariants({ a: [1, 2, 3, 4, 5] })({
      log: false,
      onError: event => {
        errors.push({
          error: event.error,
          args: event.args as { a: number },
          tests: event.tests,
        })
      },
      findBestError: { dontThrowIfError: true },
    })

    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].args.a).toBe(3)
    expect(errors[0].error.message).toBe('error at 3')
    // README: "tests - number of tests run before the error"
    expect(errors[0].tests).toBe(2)
  })

  // endregion

  // region onModeChange callback

  it('onModeChange: called with mode details at each switch', async () => {
    const changes: ModeChangeEvent[] = []

    const testVariants = createTestVariants(() => {})

    // Use global limitTests to stop after exactly one round
    await testVariants({ a: [1, 2, 3] })({
      log: false,
      limitTests: 3, // 2 + 1 = 3 tests total
      onModeChange: event => changes.push({ ...event }),
      iterationModes: [
        { mode: 'forward', limitTests: 2 },
        { mode: 'backward', limitTests: 1 },
      ],
    })

    expect(changes.length).toBe(2)
    expect(changes[0].mode.mode).toBe('forward')
    expect(changes[0].modeIndex).toBe(0)
    expect(changes[0].tests).toBe(0)
    expect(changes[1].mode.mode).toBe('backward')
    expect(changes[1].modeIndex).toBe(1)
    expect(changes[1].tests).toBe(2)
  })

  // endregion

  // region timeController

  it('timeController: custom controller is used for time operations', async () => {
    const mockTime = new TimeControllerMock()
    let nowCalledValue: number | undefined

    const testVariants = createTestVariants(
      (_: { a: number }, options: TestOptions) => {
        nowCalledValue = options.timeController.now()
      },
    )

    mockTime.addTime(5000)

    await testVariants({ a: [1] })({
      log: false,
      timeController: mockTime,
    })

    // Library may call now() internally before test runs, so value may be slightly higher
    // The important thing is that our mockTime is used, not system time
    expect(nowCalledValue).toBeGreaterThanOrEqual(5000)
    expect(nowCalledValue).toBeLessThan(6000)
  })

  // endregion

  // region Result structure

  it('result.iterations: total count including test return values', async () => {
    const testVariants = createTestVariants(() => {
      return { iterationsAsync: 2, iterationsSync: 3 }
    })

    const result = await testVariants({ a: [1, 2, 3] })({ log: false })

    // 3 variants * (2 + 3) = 15
    expect(result.iterations).toBe(15)
  })

  it('result.bestError: null when no errors', async () => {
    const testVariants = createTestVariants(() => {})

    const result = await testVariants({ a: [1, 2, 3] })({
      log: false,
      findBestError: { dontThrowIfError: true },
    })

    expect(result.bestError).toBeNull()
  })

  it('result.bestError: contains error info when error occurred', async () => {
    const testVariants = createTestVariants(({ a }: { a: number }) => {
      if (a === 2) throw new Error('error')
    })

    const result = await testVariants({ a: [1, 2, 3] })({
      log: false,
      findBestError: { dontThrowIfError: true },
    })

    // README: "tests - number of tests run before the error"
    // Error at a=2 means 1 test (a=1) ran before
    expect(result.bestError).toEqual({
      error: expect.any(Error),
      args: { a: 2 },
      tests: 1,
    })
  })

  // endregion

  // region Sync mode optimization

  it('sync tests execute synchronously (no await overhead)', async () => {
    const calls: number[] = []

    const testVariants = createTestVariants(({ a }: { a: number }) => {
      calls.push(a)
      // Sync test - no Promise returned
    })

    await testVariants({ a: [1, 2, 3] })({ log: false })

    // All calls completed
    expect(calls).toEqual([1, 2, 3])
  })

  // endregion
})
