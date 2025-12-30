/**
 * # Stress Test Work Instructions
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

import {createTestVariants as createTestVariantsStable} from 'dist/lib/index.mjs'
import {createTestVariants} from 'src/test-variants/createTestVariants'
import {objectToString} from 'src/test-variants/format/objectToString'
import {getRandomSeed, Random} from 'src/test-variants/random/Random'
import {randomBoolean, randomInt} from 'src/test-variants/random/helpers'
import {deepClone} from 'src/helpers/deepClone'
import {deepEqual} from 'src/helpers/deepEqual'
import type {TestVariantsRunOptions, TestVariantsRunResult} from 'src/test-variants/testVariantsRun'
import type {ModeConfig} from 'src/test-variants/testVariantsIterator'

// region Debug Logging

let logEnabled = false
let traceIndent = 0

const LOG_LAST_MAX = 1000
const logLast: string[] = []

function formatValue(value: unknown): string {
  return objectToString(value, {maxDepth: 3, maxItems: 20})
}

function formatObject(obj: unknown): string {
  return objectToString(obj, {pretty: true, maxDepth: 5, maxItems: 50})
}

function log(...args: unknown[]): void {
  const message = args.map(a => typeof a === 'string' ? a : formatObject(a)).join(' ')
  logLast.push(message)
  if (logLast.length > LOG_LAST_MAX) {
    logLast.shift()
  }
  console.log(message)
}

function traceLog(message: string): void {
  log('  '.repeat(traceIndent) + message)
}

function traceEnter(message: string): void {
  traceLog('> ' + message)
  traceIndent++
}

function traceExit(message: string): void {
  traceIndent--
  traceLog('< ' + message)
}

function getLogLast(): string {
  return logLast.join('\n')
}

// eslint-disable-next-line no-undef
(globalThis as any).__getStressTestLogLast = getLogLast

async function runWithLogs<T>(fn: () => T | Promise<T>): Promise<T> {
  logEnabled = true
  traceIndent = 0
  logLast.length = 0
  try {
    return await fn()
  }
  finally {
    logEnabled = false
    traceIndent = 0
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
  repeatsPerVariantMax: number
  cyclesMax: number
  forwardModeCyclesMax: number
  iterationMode: 'forward' | 'backward' | 'random' | null
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

// endregion

// region Verification

function verifyIterationsCount(
  resultIterations: number,
  totalVariantsCount: number | null,
  errorIndex: number | null,
  findBestError: boolean,
  dontThrowIfError: boolean,
  cycles: number,
  repeatsPerVariant: number,
  forwardModeCycles: number,
  errorVariantCallCount: number,
  retriesToError: number,
  iterationMode: 'forward' | 'backward' | 'random',
  callCount: number,
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
  // Error can only occur if error variant was actually called (callCount > errorIndex)
  const totalErrorCalls = errorVariantCallCount * cycles * repeatsPerVariant * forwardModeCycles
  const errorWillOccur = errorIndex !== null && totalErrorCalls > retriesToError && callCount > errorIndex
  // Error is thrown if: (1) no findBestError, or (2) findBestError but dontThrowIfError=false
  const errorWillBeThrown = errorWillOccur && (!findBestError || !dontThrowIfError)

  // Verify: when error expected to be thrown, should have thrown
  if (errorWillBeThrown) {
    throw new Error('Expected error to be thrown')
  }

  // Verify: when error expected and totalVariantsCount > 0, should have some iterations
  if (errorWillOccur && totalVariantsCount !== null && totalVariantsCount > 0 && resultIterations === 0) {
    throw new Error('Expected some iterations when totalVariantsCount > 0 and error expected')
  }

  // Verify exact count for deterministic modes with known variant count and no error
  if (totalVariantsCount !== null
    && totalVariantsCount > 0
    && !errorWillOccur
    && iterationMode !== 'random'
    && cycles > 0
    && repeatsPerVariant > 0
    && forwardModeCycles > 0
  ) {
    const expected = totalVariantsCount * cycles * repeatsPerVariant * forwardModeCycles
    if (resultIterations !== expected) {
      throw new Error(`Expected ${expected} iterations (variants=${totalVariantsCount}, cycles=${cycles}, repeats=${repeatsPerVariant}, forwardModeCycles=${forwardModeCycles}), got ${resultIterations}`)
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
  repeatsPerVariant: number,
  forwardModeCycles: number,
  iterationMode: 'forward' | 'backward' | 'random',
): void {
  // Calculate expected error behavior
  const totalErrorCalls = errorVariantCallCount * cycles * repeatsPerVariant * forwardModeCycles
  const errorWillOccur = errorIndex !== null && totalErrorCalls > retriesToError

  // bestError is set only when findBestError=true and dontThrowIfError=true
  const bestErrorExpected = findBestError && dontThrowIfError && errorWillOccur

  // Verify: when findBestError and dontThrowIfError and error expected, bestError should be set
  if (bestErrorExpected && iterationMode !== 'random') {
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
      if (!deepEqual(resultArgsNoSeed, expectedArgsNoSeed)) {
        throw new Error(
          `bestError.args mismatch!\n`
          + `  Expected: ${JSON.stringify(expectedArgsNoSeed)}\n`
          + `  Actual:   ${JSON.stringify(resultArgsNoSeed)}`,
        )
      }
    }
  }

  // Verify: when no error expected, bestError should be null
  if (!errorWillOccur && resultBestError !== null) {
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
      if (!deepEqual(resultArgsNoSeed, expectedArgsNoSeed)) {
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
  repeatsPerVariant: number,
  forwardModeCycles: number,
  iterationMode: 'forward' | 'backward' | 'random',
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
  const expectedIterations = (totalVariantsCount ?? 0) * cycles * repeatsPerVariant * forwardModeCycles
  if (errorIndex !== null && totalVariantsCount !== null && totalVariantsCount > 0 && expectedIterations > 0 && callCount === 0) {
    throw new Error(`Expected callCount > 0 when error expected, got ${callCount}`)
  }

  // Verify exact count for deterministic modes with known variant count and no error
  if (totalVariantsCount !== null
    && totalVariantsCount > 0
    && errorIndex === null
    && iterationMode !== 'random'
    && cycles > 0
    && repeatsPerVariant > 0
    && forwardModeCycles > 0
  ) {
    const expected = totalVariantsCount * cycles * repeatsPerVariant * forwardModeCycles
    if (callCount !== expected) {
      throw new Error(`Expected callCount=${expected}, got ${callCount}`)
    }
  }
}

function verifyExpectedError(
  err: unknown,
  errorIndex: number,
  callCount: number,
): void {
  if (!(err instanceof Error) || !err.message.startsWith('Test error at call')) {
    throw err
  }
  if (callCount < errorIndex + 1) {
    throw new Error(`Error happened too early: callCount=${callCount}, expected at least ${errorIndex + 1}`)
  }
}

function verifyDynamicArgs(
  dynamicArgsReceived: Map<string, number[]>,
  argKeys: string[],
): void {
  const entries: [string, number[]][] = []
  dynamicArgsReceived.forEach(function collectEntries(receivedCounts, argKey) {
    entries[entries.length] = [argKey, receivedCounts]
  })
  for (let e = 0, entriesLen = entries.length; e < entriesLen; e++) {
    const entry = entries[e]
    const argKey = entry[0]
    const receivedCounts = entry[1]
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
      const receivedCount = receivedCounts[i]
      if (receivedCount !== argIndex) {
        throw new Error(`Dynamic template for ${argKey} received ${receivedCount} args, expected ${argIndex}`)
      }
    }
  }
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

/** Compute how many times error variant will be called due to duplicate values in static template
 * Error variant is first matched by index, then subsequent duplicates are matched by value.
 * So we count: 1 (initial match) + duplicates that appear AFTER errorIndex
 */
function computeErrorVariantCallCount(
  template: Template,
  argKeys: string[],
  errorIndex: number,
  totalVariantsCount: number,
): number {
  const argsCount = argKeys.length
  if (argsCount === 0) {
    // Empty template has 1 variant; error variant is called once if errorIndex is 0
    return errorIndex < totalVariantsCount ? 1 : 0
  }

  const errorArgs = computeArgsAtIndex(template, argKeys, errorIndex)

  // Count variants at or after errorIndex that match error args
  let count = 0
  for (let variantIndex = errorIndex; variantIndex < totalVariantsCount; variantIndex++) {
    let matches = true
    let remaining = variantIndex
    for (let i = argsCount - 1; i >= 0; i--) {
      const key = argKeys[i]
      const values = template[key] as TemplateArray
      const valueIndex = remaining % values.length
      if (!deepEqual(values[valueIndex], errorArgs[key])) {
        matches = false
        break
      }
      remaining = Math.floor(remaining / values.length)
    }
    if (matches) {
      count++
    }
  }

  return count
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
        const receivedCount = Object.keys(args).length
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

  // Compute how many times error variant will be called due to duplicate values
  const errorVariantCallCount = errorIndex !== null && !hasDynamicArgs && totalVariantsCount !== null
    ? computeErrorVariantCallCount(template, argKeys, errorIndex, totalVariantsCount)
    : 1

  if (logEnabled) {
    log('<calculated>')
    log({
      argsCount,
      hasDynamicArgs,
      totalVariantsCount,
      errorIndex,
      errorVariantCallCount,
    })
    log('</calculated>')
  }

  // endregion

  // region Tracking State

  let callCount = 0
  let errorAttempts = 0
  const retriesToError = randomInt(rnd, 0, options.retriesToErrorMax + 1)
  const withSeed = options.withSeed ?? randomBoolean(rnd)
  const parallel = options.parallel ?? PARALLEL_OPTIONS[randomInt(rnd, 0, PARALLEL_OPTIONS.length)]
  const isParallel = parallel !== false && parallel !== 1

  // Precompute errorVariantArgs for parallel mode only (where callCount-based detection is unreliable)
  // For sequential mode, use callCount-based detection to respect errorIndex ordering
  // For dynamic templates, errorVariantArgs remains null and is set on first encounter
  // For templates with seed, don't precompute since args will include seed causing deepEqual mismatch
  let errorVariantArgs: TestArgs | null = null
  if (errorIndex !== null && !hasDynamicArgs && argsCount > 0 && !withSeed && isParallel) {
    errorVariantArgs = computeArgsAtIndex(template, argKeys, errorIndex) as TestArgs
  }

  // endregion

  // region Create Test Function

  // Note: innerTest is SYNCHRONOUS for maximum performance
  // Async overhead would destroy throughput with millions of iterations
  const testFn = createTestVariants(function innerTest(args: TestArgs): void {
    if (logEnabled) {
      traceEnter(`innerTest(${formatValue(args)}), callCount=${callCount}`)
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

    let isErrorVariant = false
    if (errorIndex !== null) {
      if (errorVariantArgs === null) {
        isErrorVariant = callCount === errorIndex + 1
      }
      else {
        // Exclude seed from comparison as it varies per call
        const argsNoSeed = {...args}
        delete (argsNoSeed as Record<string, unknown>).seed
        const errorArgsNoSeed = {...errorVariantArgs}
        delete (errorArgsNoSeed as Record<string, unknown>).seed
        isErrorVariant = deepEqual(argsNoSeed, errorArgsNoSeed)
      }
    }

    if (isErrorVariant) {
      if (errorVariantArgs === null) {
        errorVariantArgs = deepClone(args)
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
  const repeatsPerVariant = findBestError
    ? (options.repeatsPerVariantMax === 0 ? 0 : (options.repeatsPerVariantMax || 1))
    : Math.max(1, options.repeatsPerVariantMax || 1)
  const forwardModeCycles = findBestError
    ? (options.forwardModeCyclesMax === 0 ? 0 : (options.forwardModeCyclesMax || 1))
    : Math.max(1, options.forwardModeCyclesMax || 1)

  function getSeedFromRnd(): number {
    return rnd.nextSeed()
  }

  // Build modes configuration
  let modes: ModeConfig[]
  if (iterationMode === 'random') {
    // Random mode limit per external cycle (cycles is handled by outer loop)
    const randomLimit = totalVariantsCount !== null && totalVariantsCount > 0
      ? totalVariantsCount * repeatsPerVariant * forwardModeCycles
      : 100
    modes = [{mode: 'random', limitTotalCount: randomLimit}]
  }
  else if (iterationMode === 'backward') {
    modes = [{mode: 'backward', cycles: forwardModeCycles, repeatsPerVariant}]
  }
  else {
    modes = [{mode: 'forward', cycles: forwardModeCycles, repeatsPerVariant}]
  }

  const runOptions: TestVariantsRunOptions<TestArgs> = {
    cycles,
    modes,
    parallel,
    getSeed      : withSeed ? getSeedFromRnd : (void 0),
    log          : logEnabled ? {start: true, progressInterval: 5000, completed: true, error: true} : false,
    findBestError: findBestError
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
      cycles,
      repeatsPerVariant,
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
      traceEnter(`verifyIterationsCount(${result.iterations}, ${totalVariantsCount}, ${errorIndex}, ${findBestError}, ${dontThrowIfError}, ${cycles}, ${repeatsPerVariant}, ${forwardModeCycles}, ${errorVariantCallCount}, ${retriesToError}, ${iterationMode}, ${callCount})`)
    }
    verifyIterationsCount(
      result.iterations,
      totalVariantsCount,
      errorIndex,
      findBestError,
      dontThrowIfError,
      cycles,
      repeatsPerVariant,
      forwardModeCycles,
      errorVariantCallCount,
      retriesToError,
      iterationMode,
      callCount,
    )
    if (logEnabled) {
      traceExit(`ok`)
    }

    if (logEnabled) {
      traceEnter(`verifyBestError`)
    }
    verifyBestError(result.bestError, findBestError, dontThrowIfError, errorIndex, errorVariantArgs, errorVariantCallCount, retriesToError, cycles, repeatsPerVariant, forwardModeCycles, iterationMode)
    if (logEnabled) {
      traceExit(`ok`)
    }

    if (logEnabled) {
      traceEnter(`verifySeenValues`)
    }
    // Full coverage: all variants visited at least once (static templates, no error, deterministic mode, iterations > 0)
    const expectedIterationsForCoverage = (totalVariantsCount ?? 0) * cycles * repeatsPerVariant * forwardModeCycles
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
      traceEnter(`verifyCallCount(${callCount}, ${totalVariantsCount}, ${errorIndex}, ${cycles}, ${repeatsPerVariant}, ${forwardModeCycles}, ${iterationMode})`)
    }
    verifyCallCount(
      callCount,
      totalVariantsCount,
      errorIndex,
      cycles,
      repeatsPerVariant,
      forwardModeCycles,
      iterationMode,
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
    // Use callCount to detect if error variant was actually called (handles edge cases where formula gives 0 but iterator still runs)
    const errorExpected = (!findBestError || !dontThrowIfError) && errorIndex !== null && callCount > errorIndex
    if (errorExpected) {
      if (logEnabled) {
        log('</execution>')
        log('<verification>')
        traceEnter(`verifyExpectedError`)
      }
      verifyExpectedError(err, errorIndex, callCount)
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

const testVariants = createTestVariants(async (options: StressTestArgs) => {
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

// region Test Suite

describe('test-variants > createTestVariants variants', function () {
  this.timeout(7 * 60 * 60 * 1000)

  it('variants', async function () {
    await testVariants({
      argType          : ['static', 'dynamic', null],
      retriesToErrorMax: [0, 1, 2],
      valueType        : ['primitive', 'object', null],
      iterationMode    : ['forward', 'backward', 'random', null],
      findBestError    : [false, true, null],
      withEquals       : ({findBestError}) =>
        findBestError !== false ? [false, true, null] : [false],
      includeErrorVariant: ({findBestError}) =>
        findBestError !== false ? [false, true, null] : [false],
      limitArgOnError: ({findBestError}) =>
        findBestError !== false ? [false, true, 'func', null] : [false],
      dontThrowIfError: ({findBestError}) =>
        findBestError !== false ? [false, true, null] : [true],
      cyclesMax           : [0, 1, 2],
      withSeed            : [false, true, null],
      repeatsPerVariantMax: [0, 1, 2],
      forwardModeCyclesMax: [0, 1, 2],
      argsCountMax        : [0, 1, 2, 3],
      valuesPerArgMax     : [0, 1, 2],
      valuesCountMax      : [1, 5],
      // Parallel: false/1 = sequential, 4/8 = concurrent, true = max parallel, null = random
      parallel            : [false, 1, 4, 8, true, null],
      errorPosition       : ['none', 'first', 'last', null],
    })({
      // limitVariantsCount: 127_000,
      limitTime    : 2 * 60 * 1000,
      getSeed      : getRandomSeed,
      cycles       : 10000,
      findBestError: {
        limitArgOnError: true,
      },
      saveErrorVariants: {
        dir              : 'tmp/test/createTestVariants/variants',
        retriesPerVariant: 10,
        // useToFindBestError: true,
      },
      modes: [
        {
          mode     : 'forward',
          limitTime: 30 * 1000,
        },
        {
          mode     : 'random',
          limitTime: 60 * 1000,
        },
        {
          mode             : 'backward',
          limitTotalCount  : 1,
          repeatsPerVariant: 10,
        },
      ],
      parallel: 10,
    })
  })
})

// endregion
