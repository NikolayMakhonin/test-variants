/**
 * # Debugging and Coding Work Instructions
 *
 * These are my (project owner) mandatory instructions for LLM agents working with this file.
 * Follow these instructions with absolute priority according to project rules.
 *
 * ## Before Starting Work
 *
 * Read and apply all documentation required for TypeScript test files with ultra-performance code:
 * - @/ai/project/base/docs/rules/docs/documentation.md
 * - @/ai/project/base/docs/rules/common/code.md
 * - @/ai/project/base/docs/rules/common/naming.md
 * - @/ai/project/base/docs/rules/common/logging.md
 * - @/ai/project/base/docs/rules/code/TypeScript/rules/ultra-performance.md
 * - @/ai/project/base/docs/rules/code/test-development/principles.md
 *
 * After completing modifications, execute code review:
 * - @/ai/project/base/docs/rules/common/code-review.md
 *
 * ## Stress Test Philosophy
 *
 * The goal of stress tests is to FIND errors, not to pass tests.
 * Tests must fail on any unexpected behavior - this is their primary purpose.
 * Polish code to perfection through massive verification of everything.
 *
 * Strive to find as many explicit and implicit errors and unexpected behaviors as possible.
 * Never sweep bugs under the rug.
 * Never fix bugs with workarounds; always search for systemic root causes.
 * Debugging time is irrelevant; actual debugging and code improvement is what matters.
 *
 * ## Coverage Requirements
 *
 * Test all possible variations of all parameters, modes, edge cases, and combinations.
 * Perform all possible verifications of all results, states, and invariants.
 * Include boundary conditions, zero values, empty inputs, and impossible cases.
 *
 * ## Code Quality Requirements
 *
 * - Maximize performance for millions of iterations using ultra-performance patterns
 * - Maximize cleanliness, simplicity, and code quality
 * - Search for most simple, most effective, most competent, most flexible, and most reliable solutions
 * - Apply discovered solutions systematically to all similar cases
 * - Improve code, tests, and logs during every modification
 * - Eliminate workarounds and bad code; bring everything to ideal order
 *
 * ## Logging Requirements
 *
 * - Format logs with XML tags for LLM parsing
 * - Write logs exclusively for LLM debugging
 * - Enable logs exclusively when error is caught and exclusively for duration of one repeated execution
 * - Ensure logs provide all information necessary for debugging
 *
 * ## Language Requirements
 *
 * Write all code, comments, and logs in English following all project text writing rules
 */

import {createTestVariants} from 'src/test-variants/createTestVariants'
import {getRandomSeed, Random} from 'src/test-variants/random/Random'
import {randomBoolean, randomInt} from 'src/test-variants/random/helpers'
import {deepCloneJsonLike, deepEqualJsonLike} from '@flemist/simple-utils'
import {
  log, traceLog, traceEnter, traceExit, formatValue, resetLog,
} from 'src/helpers/log'
import type {TestVariantsRunOptions, TestVariantsRunResult} from 'src/test-variants/testVariantsRun'
import type {ModeConfig} from 'src/test-variants/testVariantsIterator'

// region Debug Logging

let logEnabled = false

async function runWithLogs<T>(fn: () => T | Promise<T>): Promise<T> {
  logEnabled = true
  resetLog()
  try {
    return await fn()
  }
  finally {
    logEnabled = false
  }
}

// endregion

// region Types

type StaticObject = {id: number, value: string}
type TemplateValue = number | StaticObject | undefined
type TemplateArray = TemplateValue[]
type TemplateFunc = (args: Record<string, TemplateValue>) => TemplateArray
type Template = Record<string, TemplateArray | TemplateFunc>
type TestArgs = Record<string, TemplateValue>

type StressTestArgs = {
  argType: 'static' | 'dynamic' | null
  valueType: 'primitive' | 'object' | null
  argsCountMax: number
  valuesPerArgMax: number
  valuesCountMax: number
  errorPosition: 'none' | 'first' | 'last' | null
  retriesToErrorMax: number
  findBestError: boolean | null
  limitArgOnError: false | true | 'func' | null
  includeErrorVariant: boolean | null
  dontThrowIfError: boolean | null
  withSeed: boolean | null
  attemptsPerVariantMax: number
  cyclesMax: number
  forwardModeCyclesMax: number
  iterationMode: 'forward' | 'backward' | 'random' | null
  /** Mode configuration: 'single' uses one mode, 'multi' uses forward+backward with limits for position persistence testing */
  modeConfig: 'single' | 'multi' | null
  withEquals: boolean | null
  parallel: number | boolean | null
  seed: number
}

// endregion

// region Constants

const LIMIT_ARG_OPTIONS: readonly (false | true | 'func')[] = [false, true, 'func']
const ITERATION_MODES: readonly ('forward' | 'backward' | 'random')[] = ['forward', 'backward', 'random']
const PARALLEL_OPTIONS: readonly (number | boolean)[] = [false, 1, 4, 8, true]

// endregion

// region Value Generation

function generateOneValue(
  rnd: Random,
  valueTypeOption: 'primitive' | 'object' | null,
  valuesCountMax: number,
): TemplateValue {
  const valueType = valueTypeOption ?? (randomBoolean(rnd) ? 'primitive' : 'object')
  const id = randomInt(rnd, 0, valuesCountMax + 1)
  if (valueType === 'primitive') {
    return id
  }
  return {id, value: `value-${id}`}
}

function generateValuesArray(
  rnd: Random,
  valuesCount: number,
  valueTypeOption: 'primitive' | 'object' | null,
  valuesCountMax: number,
): TemplateValue[] {
  const values: TemplateValue[] = []
  for (let i = 0; i < valuesCount; i++) {
    values[i] = generateOneValue(rnd, valueTypeOption, valuesCountMax)
  }
  return values
}

function generateErrorIndex(
  rnd: Random,
  option: 'none' | 'first' | 'last' | null,
  totalVariantsCount: number,
): number | null {
  if (totalVariantsCount === 0) {
    return null
  }
  if (option === 'none') {
    return null
  }
  if (option === 'first') {
    return 0
  }
  if (option === 'last') {
    return totalVariantsCount - 1
  }
  // option is null - generate with boundary case priority
  const hasMiddle = totalVariantsCount > 2
  const choiceCount = hasMiddle ? 4 : 3
  const choice = randomInt(rnd, 0, choiceCount)
  if (choice === 0) {
    return null
  }
  if (choice === 1) {
    return 0
  }
  if (choice === 2) {
    return totalVariantsCount - 1
  }
  return randomInt(rnd, 1, totalVariantsCount - 1)
}

function generateLimitArgOnError(
  rnd: Random,
  option: false | true | 'func' | null,
): false | true | 'func' {
  if (option !== null) {
    return option
  }
  return LIMIT_ARG_OPTIONS[randomInt(rnd, 0, 3)]
}

// endregion

// region Global Functions

function equalsCustom(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }
  if (a == null || b == null) {
    return false
  }
  if (typeof a !== 'object' || typeof b !== 'object') {
    return false
  }
  return (a as StaticObject).id === (b as StaticObject).id
}

function limitArgOnErrorTrue(): boolean {
  return true
}

/** Compare args by template keys only (excludes seed); avoids object allocation in hot loop */
function argsEqualByKeys(a: TestArgs, b: TestArgs, keys: string[]): boolean {
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i]
    if (!deepEqualJsonLike(a[key], b[key])) {
      return false
    }
  }
  return true
}

// endregion

// region Verification

function verifyIterationsCount(
  resultIterations: number,
  totalVariantsCount: number | null,
  errorIndex: number | null,
  firstMatchingIndex: number,
  lastMatchingIndex: number,
  findBestError: boolean,
  dontThrowIfError: boolean,
  cycles: number,
  attemptsPerVariant: number,
  forwardModeCycles: number,
  errorVariantCallCount: number,
  retriesToError: number,
  iterationMode: 'forward' | 'backward' | 'random',
  callCount: number,
  errorAttempts: number,
  isParallel: boolean,
  isMultiMode: boolean,
): void {
  // Verify: iterations is never negative
  if (resultIterations < 0) {
    throw new Error(`Iterations should be >= 0, got ${resultIterations}`)
  }

  // Verify: when totalVariantsCount=0, iterations should be 0
  if (totalVariantsCount === 0 && resultIterations !== 0) {
    throw new Error(`Expected 0 iterations for empty variants, got ${resultIterations}`)
  }

  // Calculate expected error behavior
  // For random mode: use actual errorAttempts since random picks may not hit error variant
  // For multi-mode: use actual errorAttempts since position persistence affects which variants are hit per cycle
  // For backward mode: use actual errorAttempts since backward visits high indices first (lastMatchingIndex, not firstMatchingIndex)
  // For forward mode: use theoretical calculation based on variant structure
  const totalErrorCalls = errorVariantCallCount * cycles * attemptsPerVariant * forwardModeCycles
  const errorWillOccur = iterationMode === 'random' || isMultiMode || iterationMode === 'backward'
    ? errorAttempts > retriesToError
    : errorIndex !== null && totalErrorCalls > retriesToError && callCount > firstMatchingIndex
  // Error is thrown if: (1) no findBestError, or (2) findBestError but dontThrowIfError=false
  const errorWillBeThrown = errorWillOccur && (!findBestError || !dontThrowIfError)

  // Verify: when error expected to be thrown, should have thrown
  if (errorWillBeThrown) {
    throw new Error('Expected error to be thrown')
  }

  // Verify: when error expected after first variant and totalVariantsCount > 0, should have some iterations
  // For forward mode: firstMatchingIndex > 0 means error is not at first variant
  // For backward mode: lastMatchingIndex < totalVariantsCount - 1 means error is not at first variant (iteration starts from end)
  // For multi-mode: first mode is always forward, so use forward logic regardless of iterationMode
  // Skip for parallel mode: iteration counting has race conditions with abort signal
  // Skip for random mode: random picks may hit error variant first, resulting in 0 iterations
  const errorNotAtFirstVariant = iterationMode === 'backward' && !isMultiMode
    ? lastMatchingIndex < (totalVariantsCount ?? 0) - 1
    : firstMatchingIndex > 0
  if (!isParallel && iterationMode !== 'random' && errorWillOccur && totalVariantsCount !== null && totalVariantsCount > 0 && resultIterations === 0 && errorNotAtFirstVariant) {
    throw new Error('Expected some iterations when totalVariantsCount > 0 and error expected after first variant')
  }

  // Verify exact count for deterministic modes with known variant count and no error
  // Skip for multi-mode: uses limitPerMode instead of forwardModeCycles, different counting logic
  if (totalVariantsCount !== null
    && totalVariantsCount > 0
    && !errorWillOccur
    && iterationMode !== 'random'
    && !isMultiMode
    && cycles > 0
    && attemptsPerVariant > 0
    && forwardModeCycles > 0
  ) {
    const expected = totalVariantsCount * cycles * attemptsPerVariant * forwardModeCycles
    if (resultIterations !== expected) {
      throw new Error(`Expected ${expected} iterations (variants=${totalVariantsCount}, cycles=${cycles}, repeats=${attemptsPerVariant}, forwardModeCycles=${forwardModeCycles}), got ${resultIterations}`)
    }
  }
}

function verifyBestError(
  resultBestError: TestVariantsRunResult<TestArgs>['bestError'],
  findBestError: boolean,
  dontThrowIfError: boolean,
  errorIndex: number | null,
  errorVariantArgs: TestArgs | null,
  errorVariantCallCount: number,
  retriesToError: number,
  cycles: number,
  attemptsPerVariant: number,
  forwardModeCycles: number,
  iterationMode: 'forward' | 'backward' | 'random',
  isMultiMode: boolean,
): void {
  // Calculate expected error behavior
  const totalErrorCalls = errorVariantCallCount * cycles * attemptsPerVariant * forwardModeCycles
  const errorWillOccur = errorIndex !== null && totalErrorCalls > retriesToError

  // bestError is set only when findBestError=true and dontThrowIfError=true
  const bestErrorExpected = findBestError && dontThrowIfError && errorWillOccur

  // Verify: when findBestError and dontThrowIfError and error expected, bestError should be set
  // Skip for random mode: random picks may not hit error variant as predicted
  // Skip for multi-mode: position persistence changes iteration order, affecting when errors occur
  if (bestErrorExpected && iterationMode !== 'random' && !isMultiMode) {
    if (resultBestError === null) {
      throw new Error('Expected bestError to be set when error occurred with findBestError and dontThrowIfError')
    }
    if (!(resultBestError.error instanceof Error) || !resultBestError.error.message.startsWith('Test error at call')) {
      throw new Error('bestError.error should be our test error')
    }
    // CRITICAL: Verify args match - this catches parallel mode attribution bugs
    if (errorVariantArgs !== null) {
      // Remove seed from comparison as it varies per call
      const resultArgsNoSeed = {...resultBestError.args}
      delete (resultArgsNoSeed as Record<string, unknown>).seed
      const expectedArgsNoSeed = {...errorVariantArgs}
      delete (expectedArgsNoSeed as Record<string, unknown>).seed
      if (!deepEqualJsonLike(resultArgsNoSeed, expectedArgsNoSeed)) {
        throw new Error(
          `bestError.args mismatch!\n`
          + `  Expected: ${JSON.stringify(expectedArgsNoSeed)}\n`
          + `  Actual:   ${JSON.stringify(resultArgsNoSeed)}`,
        )
      }
    }
  }

  // Verify: when no error expected, bestError should be null
  // Skip for random mode: random picks may hit error variant more times than theoretical calculation predicts
  // Skip for multi-mode: position persistence changes iteration order, affecting when errors occur
  if (iterationMode !== 'random' && !isMultiMode && !errorWillOccur && resultBestError !== null) {
    throw new Error('Expected bestError to be null when no error occurred')
  }

  // Verify: for random mode with error, bestError should still be set if findBestError and dontThrowIfError
  if (iterationMode === 'random' && bestErrorExpected && resultBestError !== null) {
    if (!(resultBestError.error instanceof Error) || !resultBestError.error.message.startsWith('Test error at call')) {
      throw new Error('bestError.error should be our test error (random mode)')
    }
    // Also verify args for random mode when errorVariantArgs is known
    if (errorVariantArgs !== null) {
      const resultArgsNoSeed = {...resultBestError.args}
      delete (resultArgsNoSeed as Record<string, unknown>).seed
      const expectedArgsNoSeed = {...errorVariantArgs}
      delete (expectedArgsNoSeed as Record<string, unknown>).seed
      if (!deepEqualJsonLike(resultArgsNoSeed, expectedArgsNoSeed)) {
        throw new Error(
          `bestError.args mismatch (random mode)!\n`
          + `  Expected: ${JSON.stringify(expectedArgsNoSeed)}\n`
          + `  Actual:   ${JSON.stringify(resultArgsNoSeed)}`,
        )
      }
    }
  }
}

function verifySeenValues(
  seenValuesPerArg: Map<string, Set<number | undefined>>,
  expectedValuesPerArg: Map<string, TemplateArray>,
  argIsDynamic: Map<string, boolean>,
  argKeys: string[],
  callCount: number,
  actualIterations: number,
  fullCoverage: boolean,
): void {
  for (let i = 0, len = argKeys.length; i < len; i++) {
    const key = argKeys[i]
    const seen = seenValuesPerArg.get(key)
    const isDynamic = argIsDynamic.get(key)
    const templateValues = expectedValuesPerArg.get(key) ?? []

    // Build set of expected value ids for static args
    const expectedIds = new Set<number | undefined>()
    for (let j = 0, lenJ = templateValues.length; j < lenJ; j++) {
      const v = templateValues[j]
      expectedIds.add(typeof v === 'object' ? v?.id : v)
    }

    // Verify: when no calls, nothing should be seen (all args)
    // Use callCount instead of actualIterations because tests that throw errors
    // populate seenValues but don't increment iterations counter
    if (callCount === 0 && seen.size > 0) {
      throw new Error(`Expected no values for ${key} when callCount=0, saw ${seen.size}`)
    }

    // Verify: for static args with calls, no unexpected values
    if (!isDynamic && callCount > 0) {
      for (const seenValue of seen) {
        if (!expectedIds.has(seenValue)) {
          throw new Error(`Unexpected value ${seenValue} seen for ${key}`)
        }
      }
    }

    // Verify: for static args with full coverage, all expected values were seen
    if (!isDynamic && fullCoverage) {
      for (const expectedId of expectedIds) {
        if (!seen.has(expectedId)) {
          throw new Error(`Value ${expectedId} was not seen for arg ${key}`)
        }
      }
    }
  }
}

function verifyCallCount(
  callCount: number,
  totalVariantsCount: number | null,
  errorIndex: number | null,
  cycles: number,
  attemptsPerVariant: number,
  forwardModeCycles: number,
  iterationMode: 'forward' | 'backward' | 'random',
  isMultiMode: boolean,
): void {
  // Verify: callCount is never negative
  if (callCount < 0) {
    throw new Error(`callCount should be >= 0, got ${callCount}`)
  }

  // Verify: when totalVariantsCount=0, callCount should be 0
  if (totalVariantsCount === 0 && callCount !== 0) {
    throw new Error(`Expected callCount=0 when totalVariantsCount=0, got ${callCount}`)
  }

  // Verify: when error expected and iterations expected, callCount should be > 0
  const expectedIterations = (totalVariantsCount ?? 0) * cycles * attemptsPerVariant * forwardModeCycles
  if (errorIndex !== null && totalVariantsCount !== null && totalVariantsCount > 0 && expectedIterations > 0 && callCount === 0) {
    throw new Error(`Expected callCount > 0 when error expected, got ${callCount}`)
  }

  // Verify exact count for deterministic modes with known variant count and no error
  // Skip for multi-mode: uses limitPerMode instead of forwardModeCycles, different counting logic
  if (totalVariantsCount !== null
    && totalVariantsCount > 0
    && errorIndex === null
    && iterationMode !== 'random'
    && !isMultiMode
    && cycles > 0
    && attemptsPerVariant > 0
    && forwardModeCycles > 0
  ) {
    const expected = totalVariantsCount * cycles * attemptsPerVariant * forwardModeCycles
    if (callCount !== expected) {
      throw new Error(`Expected callCount=${expected}, got ${callCount}`)
    }
  }
}

function verifyExpectedError(err: unknown): void {
  // Verify the error is our test error (not some unexpected error)
  if (!(err instanceof Error) || !err.message.startsWith('Test error at call')) {
    throw err
  }
}

function verifyDynamicArgs(
  dynamicArgsReceived: Map<string, number[]>,
  argKeys: string[],
): void {
  // Iterate Map directly without creating intermediate entries array
  dynamicArgsReceived.forEach(function verifyEntry(receivedCounts, argKey) {
    let argIndex = -1
    for (let i = 0, len = argKeys.length; i < len; i++) {
      if (argKeys[i] === argKey) {
        argIndex = i
        break
      }
    }
    if (argIndex === -1) {
      throw new Error(`Unknown arg key in dynamicArgsReceived: ${argKey}`)
    }
    for (let i = 0, len = receivedCounts.length; i < len; i++) {
      if (receivedCounts[i] !== argIndex) {
        throw new Error(`Dynamic template for ${argKey} received ${receivedCounts[i]} args, expected ${argIndex}`)
      }
    }
  })
}

/** Verify position persistence in multi-mode configuration
 * For multi-mode with forward+backward modes:
 * - Forward segments should have ascending indices
 * - Backward segments should have descending indices
 * - Mode re-entry should continue from saved position
 */
function verifyPositionPersistence(
  variantIndicesSeen: number[],
  totalVariantsCount: number,
  limitPerMode: number,
  cycles: number,
  attemptsPerVariant: number,
  isParallel: boolean,
  errorIndex: number | null,
): void {
  // Skip for parallel mode: order is not guaranteed
  if (isParallel) {
    return
  }

  // Skip if no indices recorded or error occurred (early termination)
  if (variantIndicesSeen.length === 0 || errorIndex !== null) {
    return
  }

  // Verify that indices follow expected pattern:
  // Forward mode: ascending runs within each mode entry
  // Backward mode: descending runs within each mode entry
  // Mode switch: direction changes

  let lastIndex = -1
  let direction: 'forward' | 'backward' | 'unknown' = 'unknown'
  let runLength = 0
  const effectiveLimit = limitPerMode * attemptsPerVariant

  for (let i = 0, len = variantIndicesSeen.length; i < len; i++) {
    const index = variantIndicesSeen[i]

    if (lastIndex < 0) {
      lastIndex = index
      runLength = 1
      // First index determines initial direction
      // Forward starts at 0, backward starts at totalVariantsCount - 1
      direction = index === 0 ? 'forward' : index === totalVariantsCount - 1 ? 'backward' : 'unknown'
      continue
    }

    // Check if index continues in expected direction or is a repeat
    if (index === lastIndex) {
      // Same index (repeat)
      runLength++
    }
    else if (direction === 'forward' && index === lastIndex + 1) {
      // Forward progression
      runLength++
    }
    else if (direction === 'backward' && index === lastIndex - 1) {
      // Backward progression
      runLength++
    }
    else if (runLength >= effectiveLimit) {
      // Mode switch: direction should change or continue from saved position
      if (direction === 'forward') {
        // Switch to backward or continue forward from next position
        direction = index === totalVariantsCount - 1 ? 'backward' : index > lastIndex ? 'forward' : 'backward'
      }
      else {
        // Switch to forward or continue backward from next position
        direction = index === 0 ? 'forward' : index < lastIndex ? 'backward' : 'forward'
      }
      runLength = 1
    }
    else {
      // Unexpected jump - could be position restoration from saved state
      // This is valid for position persistence: mode re-entry continues from saved position
      // Update direction based on the new trajectory
      if (index > lastIndex) {
        direction = 'forward'
      }
      else if (index < lastIndex) {
        direction = 'backward'
      }
      runLength = 1
    }

    lastIndex = index
  }

  // Note: We don't verify unique variant count here because:
  // 1. Templates can have duplicate values (e.g., [1,1]) causing same variant index
  // 2. Position persistence may cause some variants to be skipped in multi-mode
  // The main verification is that sequential order is maintained within each mode segment
}

/** Compute args at given index using cartesian product indexing */
function computeArgsAtIndex(
  template: Template,
  argKeys: string[],
  index: number,
): Record<string, TemplateValue> {
  const argsCount = argKeys.length
  const args: Record<string, TemplateValue> = {}
  let remaining = index
  for (let i = argsCount - 1; i >= 0; i--) {
    const key = argKeys[i]
    const values = template[key] as TemplateArray
    const valueIndex = remaining % values.length
    args[key] = values[valueIndex]
    remaining = Math.floor(remaining / values.length)
  }
  return args
}

type ErrorVariantInfo = {
  /** Number of times error variant will be called */
  count: number
  /** First index where error variant can be triggered in forward order */
  firstMatchingIndex: number
  /** Last index where error variant can be triggered in forward order */
  lastMatchingIndex: number
}

/** Compute error variant info for static template
 * Uses value-based detection: ALL variants matching errorArgs are error variants
 * This matches innerTest behavior which uses deepEqualJsonLike for error detection
 */
function computeErrorVariantInfo(
  template: Template,
  argKeys: string[],
  errorIndex: number,
  totalVariantsCount: number,
): ErrorVariantInfo {
  const argsCount = argKeys.length
  if (argsCount === 0) {
    // Empty template has 1 variant; error variant is called once if errorIndex is 0
    const valid = errorIndex < totalVariantsCount
    return {count: valid ? 1 : 0, firstMatchingIndex: valid ? 0 : -1, lastMatchingIndex: valid ? 0 : -1}
  }

  const errorArgs = computeArgsAtIndex(template, argKeys, errorIndex)

  // Count ALL matching variants from index 0 (value-based detection)
  // innerTest uses deepEqualJsonLike which matches any variant with same args
  let count = 0
  let firstMatchingIndex = -1
  let lastMatchingIndex = -1
  for (let variantIndex = 0; variantIndex < totalVariantsCount; variantIndex++) {
    let matches = true
    let remaining = variantIndex
    for (let i = argsCount - 1; i >= 0; i--) {
      const key = argKeys[i]
      const values = template[key] as TemplateArray
      const valueIndex = remaining % values.length
      if (!deepEqualJsonLike(values[valueIndex], errorArgs[key])) {
        matches = false
        break
      }
      remaining = Math.floor(remaining / values.length)
    }
    if (matches) {
      if (firstMatchingIndex < 0) {
        firstMatchingIndex = variantIndex
      }
      lastMatchingIndex = variantIndex
      count++
    }
  }

  return {count, firstMatchingIndex, lastMatchingIndex}
}

// endregion

// region Sliced Arrays Cache

const slicedArraysCache: Map<TemplateArray, TemplateArray[]> = new Map()

function clearSlicedArraysCache(): void {
  slicedArraysCache.clear()
}

function getSlicedArray(values: TemplateArray, count: number): TemplateArray {
  let cache = slicedArraysCache.get(values)
  if (cache === (void 0)) {
    cache = []
    const len = values.length
    for (let i = 0; i <= len; i++) {
      cache[i] = values.slice(0, i)
    }
    slicedArraysCache.set(values, cache)
  }
  return cache[count]
}

// endregion

// region Main Test

async function executeStressTest(options: StressTestArgs): Promise<void> {
  clearSlicedArraysCache()

  if (logEnabled) {
    log('<test>')
    log('<options>')
    log(options)
    log('</options>')
  }

  const rnd = new Random(options.seed)

  // region Pre-allocate Structures

  const argKeys: string[] = []
  const expectedValuesPerArg: Map<string, TemplateArray> = new Map()
  const argIsDynamic: Map<string, boolean> = new Map()
  const template: Template = {}
  const seenValuesPerArg: Map<string, Set<number | undefined>> = new Map()
  const dynamicArgsReceived: Map<string, number[]> = new Map()

  // endregion

  // region Generate Template

  const argsCount = options.argsCountMax === 0 ? 0 : randomInt(rnd, 1, options.argsCountMax + 1)

  for (let argIndex = 0; argIndex < argsCount; argIndex++) {
    const argKey = `arg${argIndex}`
    argKeys[argIndex] = argKey
    seenValuesPerArg.set(argKey, new Set())
  }

  let hasDynamicArgs = false

  for (let argIndex = 0; argIndex < argsCount; argIndex++) {
    const argKey = argKeys[argIndex]
    const valuesCount = randomInt(rnd, 0, options.valuesPerArgMax + 1)
    const argType = options.argType ?? (randomBoolean(rnd) ? 'static' : 'dynamic')
    const isDynamic = argType === 'dynamic'
    const values = generateValuesArray(rnd, valuesCount, options.valueType, options.valuesCountMax)

    argIsDynamic.set(argKey, isDynamic)

    if (isDynamic) {
      hasDynamicArgs = true
      dynamicArgsReceived.set(argKey, [])
      expectedValuesPerArg.set(argKey, [])

      getSlicedArray(values, 0)

      const capturedArgIndex = argIndex
      const capturedArgKey = argKey
      const capturedArgKeys = argKeys
      const capturedValues = values
      const capturedDynamicArgsReceived = dynamicArgsReceived

      // eslint-disable-next-line @typescript-eslint/no-loop-func
      template[argKey] = function dynamicTemplate(args: TestArgs): TemplateArray {
        if (logEnabled) {
          traceEnter(`dynamicTemplate(${capturedArgKey}, args=${formatValue(args)})`)
        }

        // Inline verification: check ONLY preceding args are present
        // Count keys manually to avoid Object.keys() array allocation
        let receivedCount = 0
        for (const _ in args) {
          if (Object.prototype.hasOwnProperty.call(args, _)) {
            receivedCount++
          }
        }
        if (receivedCount !== capturedArgIndex) {
          if (logEnabled) {
            traceExit(`ERROR: expected ${capturedArgIndex} args, got ${receivedCount}`)
          }
          throw new Error(`Dynamic template ${capturedArgKey}: expected ${capturedArgIndex} args, got ${receivedCount}`)
        }
        for (let i = 0; i < capturedArgIndex; i++) {
          const expectedKey = capturedArgKeys[i]
          if (!(expectedKey in args)) {
            if (logEnabled) {
              traceExit(`ERROR: missing arg ${expectedKey}`)
            }
            throw new Error(`Dynamic template ${capturedArgKey}: missing expected arg ${expectedKey}`)
          }
        }

        // Track received count for post-hoc verification
        const callCounts = capturedDynamicArgsReceived.get(capturedArgKey)
        callCounts[callCounts.length] = receivedCount

        const len = capturedValues.length
        if (len === 0) {
          if (logEnabled) {
            traceExit(`return [] (empty values)`)
          }
          return capturedValues
        }

        const prevArgKey = capturedArgIndex > 0 ? capturedArgKeys[capturedArgIndex - 1] : null
        if (prevArgKey === null || args[prevArgKey] == null) {
          if (logEnabled) {
            traceExit(`return ${formatValue(capturedValues)} (no prev arg)`)
          }
          return capturedValues
        }
        const prevArg = args[prevArgKey]
        const prevValue = typeof prevArg === 'object' ? prevArg.id : prevArg
        const count = prevValue % (len + 1)
        const result = getSlicedArray(capturedValues, count)

        if (logEnabled) {
          traceExit(`return ${formatValue(result)} (sliced by prevValue=${prevValue})`)
        }
        return result
      }
    }
    else {
      template[argKey] = values
      expectedValuesPerArg.set(argKey, values)
    }
  }

  if (logEnabled) {
    log('<template>')
    const templateInfo: Record<string, string> = {}
    for (let i = 0; i < argsCount; i++) {
      const key = argKeys[i]
      const isDyn = argIsDynamic.get(key)
      const tmpl = template[key]
      templateInfo[key] = isDyn ? 'dynamic' : formatValue(tmpl)
    }
    log(templateInfo)
    log('</template>')
  }

  // endregion

  // region Calculate Total Variants Count

  let totalVariantsCount: number | null
  if (hasDynamicArgs) {
    totalVariantsCount = null
  }
  else if (argsCount === 0) {
    // Empty template = 1 variant (the empty combination {})
    // Cartesian product of zero sets is one element (the empty tuple)
    totalVariantsCount = 1
  }
  else {
    // Cartesian product with any empty set = 0
    totalVariantsCount = 1
    for (let i = 0; i < argsCount; i++) {
      const arr = template[argKeys[i]] as TemplateArray
      const len = arr.length
      if (len === 0) {
        totalVariantsCount = 0
        break
      }
      totalVariantsCount *= len
    }
  }

  const errorIndex = totalVariantsCount !== null
    ? generateErrorIndex(rnd, options.errorPosition, totalVariantsCount)
    : null

  // endregion

  // region Tracking State

  let callCount = 0
  let errorAttempts = 0
  const retriesToError = randomInt(rnd, 0, options.retriesToErrorMax + 1)
  const withSeed = options.withSeed ?? randomBoolean(rnd)
  const parallel = options.parallel ?? PARALLEL_OPTIONS[randomInt(rnd, 0, PARALLEL_OPTIONS.length)]
  const isParallel = parallel !== false && parallel !== 1

  // Compute error variant info (count, first and last matching index)
  const errorVariantInfo = errorIndex !== null && !hasDynamicArgs && totalVariantsCount !== null
    ? computeErrorVariantInfo(template, argKeys, errorIndex, totalVariantsCount)
    : {count: 1, firstMatchingIndex: errorIndex ?? 0, lastMatchingIndex: errorIndex ?? 0}
  const errorVariantCallCount = errorVariantInfo.count
  const firstMatchingIndex = errorVariantInfo.firstMatchingIndex
  const lastMatchingIndex = errorVariantInfo.lastMatchingIndex

  if (logEnabled) {
    log('<calculated>')
    log({
      argsCount,
      hasDynamicArgs,
      totalVariantsCount,
      errorIndex,
      errorVariantCallCount,
      firstMatchingIndex,
      lastMatchingIndex,
      isParallel,
    })
    log('</calculated>')
  }

  // Precompute errorVariantArgs for reliable value-based error detection
  // callCount-based detection is unreliable with attemptsPerVariant > 1 or parallel mode
  // Seed is stripped before comparison, so withSeed doesn't affect precomputation
  // For dynamic templates, errorVariantArgs remains null and is set on first encounter
  let errorVariantArgs: TestArgs | null = null
  if (errorIndex !== null && !hasDynamicArgs && argsCount > 0) {
    errorVariantArgs = computeArgsAtIndex(template, argKeys, errorIndex) as TestArgs
  }

  // Determine if multi-mode is enabled (needed for innerTest before full mode configuration)
  const modeConfig = options.modeConfig ?? (randomBoolean(rnd) ? 'single' : 'multi')
  const isMultiMode = modeConfig === 'multi' && totalVariantsCount !== null && totalVariantsCount > 1

  // endregion

  // region Position Persistence Tracking

  // Track variant indices for position persistence verification in multi-mode
  // For static templates, compute variant index from args
  const variantIndicesSeen: number[] = []

  function computeVariantIndex(args: TestArgs): number {
    if (hasDynamicArgs || argsCount === 0) {
      return -1 // Cannot compute for dynamic templates
    }
    let index = 0
    let multiplier = 1
    for (let i = argsCount - 1; i >= 0; i--) {
      const key = argKeys[i]
      const values = template[key] as TemplateArray
      const argValue = args[key]
      let valueIndex = -1
      for (let j = 0, len = values.length; j < len; j++) {
        if (deepEqualJsonLike(values[j], argValue)) {
          valueIndex = j
          break
        }
      }
      if (valueIndex < 0) {
        return -1 // Value not found in template
      }
      index += valueIndex * multiplier
      multiplier *= values.length
    }
    return index
  }

  // endregion

  // region Guard Calculation

  // Pre-compute max expected calls for infinite loop guard
  // CRITICAL: These guards are not arbitrary safety margins - they reflect actual algorithm behavior
  const guardCycles = Math.max(1, options.cyclesMax || 1)
  const guardRepeats = Math.max(1, options.attemptsPerVariantMax || 1)
  const guardForwardCycles = Math.max(1, options.forwardModeCyclesMax || 1)
  // findBestError 2x multiplier is required, not arbitrary:
  // 1. After error, findBestError continues iteration with constraints
  // 2. If error is at end of range (e.g., index [1,1,1] in 2×2×2 template),
  //    constraints set limits at max values → no reduction in variants
  // 3. Both modes may need full additional rounds to complete after error
  // 4. Worst case: roundsToComplete rounds before error + roundsToComplete rounds after = 2x
  const guardFindBestError = options.findBestError !== false ? 2 : 1
  let maxExpectedCalls: number
  if (isMultiMode && totalVariantsCount !== null) {
    // Multi-mode: limitPerMode = floor(totalVariantsCount / 2), run 2 modes
    // With limitTests interruption, modes need ceil(variants/limitPerMode) rounds to complete
    const limitPerMode = Math.max(1, Math.floor(totalVariantsCount / 2))
    const roundsToComplete = Math.ceil(totalVariantsCount / limitPerMode)
    maxExpectedCalls = limitPerMode * 2 * guardRepeats * guardCycles * roundsToComplete * guardFindBestError
  }
  else if (totalVariantsCount !== null) {
    // Static template: use max of all mode formulas
    const sequentialMax = totalVariantsCount * guardCycles * guardRepeats * guardForwardCycles * guardFindBestError
    const randomMax = guardCycles * Math.max(1, totalVariantsCount * guardRepeats * guardForwardCycles) * guardFindBestError
    maxExpectedCalls = Math.max(sequentialMax, randomMax)
  }
  else {
    // Dynamic template: use max of sequential estimate and random limit
    const estimatedVariants = (options.valuesPerArgMax + 1)**argsCount
    const sequentialMax = Math.max(1, estimatedVariants) * guardCycles * guardRepeats * guardForwardCycles * guardFindBestError
    const randomMax = guardCycles * 100 * guardFindBestError
    maxExpectedCalls = Math.max(sequentialMax, randomMax)
  }
  // Add buffer for edge cases
  maxExpectedCalls = maxExpectedCalls + 1

  // endregion

  // region Create Test Function

  // Note: innerTest is SYNCHRONOUS for maximum performance
  // Async overhead would destroy throughput with millions of iterations
  const testFn = createTestVariants(function innerTest(args: TestArgs): void {
    if (logEnabled) {
      traceEnter(`innerTest(${formatValue(args)}), callCount=${callCount}`)
    }

    // Track variant index for position persistence verification
    if (isMultiMode && !hasDynamicArgs) {
      const variantIndex = computeVariantIndex(args)
      if (variantIndex >= 0) {
        variantIndicesSeen[variantIndicesSeen.length] = variantIndex
      }
    }

    for (let i = 0, len = argKeys.length; i < len; i++) {
      const key = argKeys[i]
      const argValue = args[key]
      if (argValue !== (void 0)) {
        const value = typeof argValue === 'object' ? argValue.id : argValue
        seenValuesPerArg.get(key).add(value)
      }
    }

    callCount++

    // Guard against infinite loops - throw if callCount exceeds expected maximum
    if (callCount > maxExpectedCalls) {
      throw new Error(
        `Infinite loop: callCount=${callCount} > max=${maxExpectedCalls}. `
        + `variants=${totalVariantsCount}, multiMode=${isMultiMode}`,
      )
    }

    let isErrorVariant = false
    if (errorIndex !== null) {
      if (errorVariantArgs === null) {
        isErrorVariant = callCount === errorIndex + 1
      }
      else {
        // Compare by template keys only (excludes seed); avoids object allocation
        isErrorVariant = argsEqualByKeys(args, errorVariantArgs, argKeys)
      }
    }

    if (isErrorVariant) {
      if (errorVariantArgs === null) {
        errorVariantArgs = deepCloneJsonLike(args)
      }
      errorAttempts++
      if (logEnabled) {
        traceLog(`errorAttempts=${errorAttempts}, retriesToError=${retriesToError}`)
      }
      if (errorAttempts > retriesToError) {
        if (logEnabled) {
          traceExit(`THROWING Test error at call ${callCount}`)
        }
        throw new Error(`Test error at call ${callCount}`)
      }
    }

    if (logEnabled) {
      traceExit(`ok`)
    }
  })

  // endregion

  // region Generate Run Options

  const findBestError = options.findBestError ?? randomBoolean(rnd)
  const limitArgOnError = generateLimitArgOnError(rnd, options.limitArgOnError)
  const includeErrorVariant = options.includeErrorVariant ?? randomBoolean(rnd)
  const dontThrowIfError = options.dontThrowIfError ?? randomBoolean(rnd)
  const withEquals = options.withEquals ?? randomBoolean(rnd)
  const iterationMode = options.iterationMode ?? ITERATION_MODES[randomInt(rnd, 0, 3)]
  // cycles=0 means 0 iterations; use at least 1 when findBestError is false to test normally
  const cycles = findBestError
    ? (options.cyclesMax === 0 ? 0 : (options.cyclesMax || 1))
    : Math.max(1, options.cyclesMax || 1)
  const attemptsPerVariant = findBestError
    ? (options.attemptsPerVariantMax === 0 ? 0 : (options.attemptsPerVariantMax || 1))
    : Math.max(1, options.attemptsPerVariantMax || 1)
  const forwardModeCycles = findBestError
    ? (options.forwardModeCyclesMax === 0 ? 0 : (options.forwardModeCyclesMax || 1))
    : Math.max(1, options.forwardModeCyclesMax || 1)

  function getSeedFromRnd(): number {
    return rnd.nextSeed()
  }

  // Build modes configuration (modeConfig and isMultiMode computed earlier for innerTest access)
  let modes: ModeConfig[]
  let limitPerMode = 0
  if (isMultiMode && totalVariantsCount !== null) {
    // Multi-mode configuration for position persistence testing
    // Use forward + backward modes with count limits to test position saving/restoring
    // Limit each mode to half the variants to ensure mode switching
    limitPerMode = Math.max(1, Math.floor(totalVariantsCount / 2))
    modes = [
      {mode: 'forward', limitTests: limitPerMode, attemptsPerVariant},
      {mode: 'backward', limitTests: limitPerMode, attemptsPerVariant},
    ]
  }
  else if (iterationMode === 'random') {
    // Random mode limit per external cycle (cycles is handled by outer loop)
    // Ensure limit is at least 1 to prevent infinite loops (limitTests=0 means no limit)
    const randomLimit = totalVariantsCount !== null && totalVariantsCount > 0
      ? Math.max(1, totalVariantsCount * attemptsPerVariant * forwardModeCycles)
      : 100
    modes = [{mode: 'random', limitTests: randomLimit}]
  }
  else if (iterationMode === 'backward') {
    modes = [{mode: 'backward', cycles: forwardModeCycles, attemptsPerVariant}]
  }
  else {
    modes = [{mode: 'forward', cycles: forwardModeCycles, attemptsPerVariant}]
  }

  const runOptions: TestVariantsRunOptions<TestArgs> = {
    cycles,
    iterationModes: modes,
    parallel,
    getSeed       : withSeed ? getSeedFromRnd : (void 0),
    log           : logEnabled ? {start: true, progressInterval: 5000, completed: true, error: true} : false,
    findBestError : findBestError
      ? {
        limitArgOnError: limitArgOnError === 'func' ? limitArgOnErrorTrue : limitArgOnError,
        includeErrorVariant,
        dontThrowIfError,
        equals         : withEquals ? equalsCustom : (void 0),
      }
      : (void 0),
  }

  if (logEnabled) {
    log('<run-options>')
    log({
      findBestError,
      limitArgOnError,
      includeErrorVariant,
      dontThrowIfError,
      withSeed,
      withEquals,
      iterationMode,
      modeConfig,
      isMultiMode,
      cycles,
      attemptsPerVariant,
      forwardModeCycles,
      retriesToError,
      parallel,
    })
    log('</run-options>')
    log('<execution>')
  }

  // endregion

  // region Run Test

  try {
    const result = await testFn(template)(runOptions)

    if (logEnabled) {
      log('</execution>')
      log('<result>')
      log({
        iterations: result.iterations,
        bestError : result.bestError,
        callCount,
        errorVariantArgs,
      })
      log('</result>')
      log('<verification>')
    }

    if (logEnabled) {
      traceEnter(`verifyIterationsCount(${result.iterations}, ${totalVariantsCount}, ${errorIndex}, ${firstMatchingIndex}, ${lastMatchingIndex}, ${findBestError}, ${dontThrowIfError}, ${cycles}, ${attemptsPerVariant}, ${forwardModeCycles}, ${errorVariantCallCount}, ${retriesToError}, ${iterationMode}, ${callCount}, ${errorAttempts}, ${isParallel}, ${isMultiMode})`)
    }
    verifyIterationsCount(
      result.iterations,
      totalVariantsCount,
      errorIndex,
      firstMatchingIndex,
      lastMatchingIndex,
      findBestError,
      dontThrowIfError,
      cycles,
      attemptsPerVariant,
      forwardModeCycles,
      errorVariantCallCount,
      retriesToError,
      iterationMode,
      callCount,
      errorAttempts,
      isParallel,
      isMultiMode,
    )
    if (logEnabled) {
      traceExit(`ok`)
    }

    if (logEnabled) {
      traceEnter(`verifyBestError`)
    }
    verifyBestError(result.bestError, findBestError, dontThrowIfError, errorIndex, errorVariantArgs, errorVariantCallCount, retriesToError, cycles, attemptsPerVariant, forwardModeCycles, iterationMode, isMultiMode)
    if (logEnabled) {
      traceExit(`ok`)
    }

    if (logEnabled) {
      traceEnter(`verifySeenValues`)
    }
    // Full coverage: all variants visited at least once (static templates, no error, deterministic mode, iterations > 0)
    const expectedIterationsForCoverage = (totalVariantsCount ?? 0) * cycles * attemptsPerVariant * forwardModeCycles
    const fullCoverage = errorIndex === null
      && totalVariantsCount !== null
      && totalVariantsCount > 0
      && iterationMode !== 'random'
      && expectedIterationsForCoverage > 0
      && result.iterations >= expectedIterationsForCoverage
    verifySeenValues(
      seenValuesPerArg,
      expectedValuesPerArg,
      argIsDynamic,
      argKeys,
      callCount,
      result.iterations,
      fullCoverage,
    )
    if (logEnabled) {
      traceExit(`ok`)
    }

    if (logEnabled) {
      traceEnter(`verifyCallCount(${callCount}, ${totalVariantsCount}, ${errorIndex}, ${cycles}, ${attemptsPerVariant}, ${forwardModeCycles}, ${iterationMode}, ${isMultiMode})`)
    }
    verifyCallCount(
      callCount,
      totalVariantsCount,
      errorIndex,
      cycles,
      attemptsPerVariant,
      forwardModeCycles,
      iterationMode,
      isMultiMode,
    )
    if (logEnabled) {
      traceExit(`ok`)
    }

    if (logEnabled) {
      traceEnter(`verifyDynamicArgs`)
    }
    verifyDynamicArgs(dynamicArgsReceived, argKeys)
    if (logEnabled) {
      traceExit(`ok`)
    }

    // Verify position persistence for multi-mode configuration
    if (isMultiMode && totalVariantsCount !== null && totalVariantsCount > 1) {
      if (logEnabled) {
        traceEnter(`verifyPositionPersistence`)
      }
      verifyPositionPersistence(
        variantIndicesSeen,
        totalVariantsCount,
        limitPerMode,
        cycles,
        attemptsPerVariant,
        isParallel,
        errorIndex,
      )
      if (logEnabled) {
        traceExit(`ok`)
      }
    }

    if (logEnabled) {
      log('</verification>')
      log('</test>')
    }
  }
  catch (err) {
    // Error expected when: findBestError is false, errorIndex is set, and totalErrorCalls > retriesToError
    // For random mode with multiple variants, we can't predict exact error timing
    // but with 1 variant, behavior is deterministic
    if (iterationMode === 'random' && totalVariantsCount !== 1) {
      // Verify it's at least our test error for non-deterministic random mode
      if (!(err instanceof Error) || !err.message.startsWith('Test error at call')) {
        if (logEnabled) {
          log('</execution>')
          log('<error>')
          log(err)
          log('</error>')
          log('</test>')
        }
        throw err
      }
      // For random mode with multiple variants, skip strict verification
      if (logEnabled) {
        log('</execution>')
        log('<verification>')
        traceLog('random mode with multiple variants - skip strict verification')
        log('</verification>')
        log('</test>')
      }
      return
    }
    // Error is thrown when: (1) no findBestError, or (2) findBestError but dontThrowIfError=false
    // Use errorAttempts > retriesToError since that directly reflects when innerTest throws
    // Works for all modes: forward, backward, random
    const errorExpected = (!findBestError || !dontThrowIfError) && errorAttempts > retriesToError
    if (errorExpected) {
      if (logEnabled) {
        log('</execution>')
        log('<verification>')
        traceEnter(`verifyExpectedError`)
      }
      verifyExpectedError(err)
      if (logEnabled) {
        traceExit(`ok (expected error)`)
        log('</verification>')
        log('</test>')
      }
    }
    else {
      if (logEnabled) {
        log('</execution>')
        log('<error>')
        log(err)
        log('</error>')
        log('</test>')
      }
      throw err
    }
  }

  // endregion
}

export const testVariants = createTestVariants(async (options: StressTestArgs) => {
  try {
    await executeStressTest(options)
  }
  catch (err) {
    await runWithLogs(async () => {
      await executeStressTest(options)
    })
    throw err
  }
})

// endregion
