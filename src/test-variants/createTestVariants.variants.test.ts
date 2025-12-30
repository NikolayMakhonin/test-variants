/**
 * # Debugging and Coding Work Requirements
 *
 * - Maximize variability and coverage of all possible and impossible test cases
 * - Maximize performance
 * - Maximize cleanliness, simplicity, and code quality
 * - Follow all principles and rules of good code
 * - Follow project documentation for writing code
 * - Format logs with XML tags
 * - Write logs exclusively for LLM and exclusively in stress tests themselves
 * - Ensure logs are sufficient for LLM to get all necessary information for debugging
 * - Enable logs exclusively when error is caught and exclusively for duration of one repeated execution of the erroneous test
 * - Write everything in code and tests in English in accordance with all project rules for writing texts and documentation
 * - Never fix bugs with workarounds; always search for systemic problems; always search for similar problems and way to fix them all at once
 * - Always think about consequences of any code changes
 * - Always search for most simple, most effective, most competent, most flexible, and most reliable solutions
 * - During work, improve code, tests, and logs; make code more quality, more compliant with rules, more readable, more split into independent parts, more competent, and more universal
 * - During work, eliminate workarounds and bad code; bring everything to ideal order
 *
 * AND READ THE DOCS
 * FOLLOW ALL DECISION MAPS
 */

import {createTestVariants as createTestVariantsStable} from 'dist/lib/index.mjs'
import {createTestVariants} from 'src/test-variants/createTestVariants'
import {objectToString} from 'src/test-variants/format/objectToString'
import {getRandomSeed, Random} from 'src/test-variants/random/Random'
import {randomBoolean, randomInt} from 'src/test-variants/random/helpers'
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
  withSeed: boolean | null
  repeatsPerVariantMax: number
  cyclesMax: number
  forwardModeCyclesMax: number
  iterationMode: 'forward' | 'backward' | 'random' | null
  withEquals: boolean | null
  seed: number
}

// endregion

// region Constants

const LIMIT_ARG_OPTIONS: readonly (false | true | 'func')[] = [false, true, 'func']
const ITERATION_MODES: readonly ('forward' | 'backward' | 'random')[] = ['forward', 'backward', 'random']

// endregion

// region Deep Clone / Deep Equal

function deepClone<T>(value: T): T {
  if (value === null || value === (void 0)) {
    return value
  }
  if (typeof value !== 'object') {
    return value
  }
  if (Array.isArray(value)) {
    const len = value.length
    const result: unknown[] = []
    for (let i = 0; i < len; i++) {
      result[i] = deepClone(value[i])
    }
    return result as unknown as T
  }
  const result: Record<string, unknown> = {}
  const keys = Object.keys(value)
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i]
    result[key] = deepClone((value as Record<string, unknown>)[key])
  }
  return result as T
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }
  if (a == null || b == null) {
    return false
  }
  if (typeof a !== 'object' || typeof b !== 'object') {
    return false
  }
  const aIsArray = Array.isArray(a)
  const bIsArray = Array.isArray(b)
  if (aIsArray !== bIsArray) {
    return false
  }
  if (aIsArray && bIsArray) {
    const len = a.length
    if (len !== b.length) {
      return false
    }
    for (let i = 0; i < len; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false
      }
    }
    return true
  }
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  const lenA = keysA.length
  if (lenA !== keysB.length) {
    return false
  }
  for (let i = 0; i < lenA; i++) {
    const key = keysA[i]
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false
    }
  }
  return true
}

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
  cycles: number,
  repeatsPerVariant: number,
  forwardModeCycles: number,
  errorVariantCallCount: number,
  retriesToError: number,
  iterationMode: 'forward' | 'backward' | 'random',
): void {
  if (totalVariantsCount === null) {
    if (resultIterations < 0) {
      throw new Error(`Iterations should be >= 0, got ${resultIterations}`)
    }
    return
  }
  if (totalVariantsCount === 0) {
    if (resultIterations !== 0) {
      throw new Error(`Expected 0 iterations for empty variants, got ${resultIterations}`)
    }
    return
  }
  // Random mode - can't verify exact count; forward/backward are deterministic
  if (iterationMode === 'random') {
    if (resultIterations < 0) {
      throw new Error(`Iterations should be >= 0, got ${resultIterations}`)
    }
    return
  }
  // Error is thrown when total calls to error variant > retriesToError
  // Total calls = errorVariantCallCount * cycles * repeatsPerVariant * forwardModeCycles
  const totalErrorCalls = errorVariantCallCount * cycles * repeatsPerVariant * forwardModeCycles
  const errorWillBeThrown = errorIndex !== null && totalErrorCalls > retriesToError
  if (errorWillBeThrown) {
    if (!findBestError) {
      throw new Error('Expected error to be thrown without findBestError')
    }
    if (resultIterations === 0 && totalVariantsCount > 0) {
      throw new Error('Expected some iterations when totalVariantsCount > 0')
    }
    return
  }
  // No error expected - verify full iteration
  if (cycles > 0 && repeatsPerVariant > 0 && forwardModeCycles > 0) {
    const expected = totalVariantsCount * cycles * repeatsPerVariant * forwardModeCycles
    if (resultIterations !== expected) {
      throw new Error(`Expected ${expected} iterations (variants=${totalVariantsCount}, cycles=${cycles}, repeats=${repeatsPerVariant}, forwardModeCycles=${forwardModeCycles}), got ${resultIterations}`)
    }
  }
}

function verifyBestError(
  resultBestError: TestVariantsRunResult<TestArgs>['bestError'],
  findBestError: boolean,
  errorIndex: number | null,
  errorVariantCallCount: number,
  retriesToError: number,
  cycles: number,
  repeatsPerVariant: number,
  forwardModeCycles: number,
  iterationMode: 'forward' | 'backward' | 'random',
): void {
  // Random mode - skip strict verification; forward/backward are deterministic
  if (iterationMode === 'random') {
    return
  }
  // Error is thrown when total calls to error variant > retriesToError
  const totalErrorCalls = errorVariantCallCount * cycles * repeatsPerVariant * forwardModeCycles
  const errorWillBeThrown = errorIndex !== null && totalErrorCalls > retriesToError
  if (findBestError && errorWillBeThrown) {
    if (resultBestError === null) {
      throw new Error('Expected bestError to be set when error occurred with findBestError')
    }
    if (!(resultBestError.error instanceof Error) || !resultBestError.error.message.startsWith('Test error at call')) {
      throw new Error('bestError.error should be our test error')
    }
    if (resultBestError.index > errorIndex) {
      throw new Error(`bestError.index (${resultBestError.index}) should be <= errorIndex (${errorIndex})`)
    }
    return
  }
  if (resultBestError !== null) {
    throw new Error('Expected bestError to be null when no error occurred')
  }
}

function verifySeenValues(
  seenValuesPerArg: Map<string, Set<number | undefined>>,
  expectedValuesPerArg: Map<string, TemplateArray>,
  argIsDynamic: Map<string, boolean>,
  argKeys: string[],
  errorIndex: number | null,
  totalVariantsCount: number | null,
): void {
  if (totalVariantsCount === null || errorIndex !== null || totalVariantsCount === 0) {
    return
  }
  for (let i = 0, len = argKeys.length; i < len; i++) {
    const key = argKeys[i]
    if (argIsDynamic.get(key)) {
      continue
    }
    const expected = expectedValuesPerArg.get(key)
    const seen = seenValuesPerArg.get(key)
    for (let j = 0, lenJ = expected.length; j < lenJ; j++) {
      const v = expected[j]
      const valueToCheck: number | undefined = typeof v === 'object' ? v?.id : v
      if (!seen.has(valueToCheck)) {
        throw new Error(`Value ${valueToCheck} was not seen for arg ${key}`)
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
  if (totalVariantsCount === null || errorIndex !== null || totalVariantsCount === 0) {
    return
  }
  // Random mode - skip exact count verification; forward/backward are deterministic
  if (iterationMode === 'random') {
    return
  }
  // Cycles and repeats apply regardless of findBestError
  const expected = totalVariantsCount * cycles * repeatsPerVariant * forwardModeCycles
  if (callCount !== expected) {
    throw new Error(`Expected callCount=${expected}, got ${callCount}`)
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
    return 0
  }

  // Compute args at errorIndex using cartesian product indexing
  const errorArgs: Record<string, TemplateValue> = {}
  let remaining = errorIndex
  for (let i = argsCount - 1; i >= 0; i--) {
    const key = argKeys[i]
    const values = template[key] as TemplateArray
    const valueIndex = remaining % values.length
    errorArgs[key] = values[valueIndex]
    remaining = Math.floor(remaining / values.length)
  }

  // Count variants at or after errorIndex that match error args
  let count = 0
  for (let variantIndex = errorIndex; variantIndex < totalVariantsCount; variantIndex++) {
    let matches = true
    remaining = variantIndex
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

  const argsCount = randomInt(rnd, 0, options.argsCountMax + 1)

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
    totalVariantsCount = 0
  }
  else {
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
  let errorVariantArgs: TestArgs | null = null
  let errorAttempts = 0
  const retriesToError = randomInt(rnd, 0, options.retriesToErrorMax + 1)

  // endregion

  // region Create Test Function

  const testFn = createTestVariants(async function innerTest(args: TestArgs) {
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
        isErrorVariant = deepEqual(args, errorVariantArgs)
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
  const withSeed = options.withSeed ?? randomBoolean(rnd)
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
    getSeed      : withSeed ? getSeedFromRnd : (void 0),
    log          : logEnabled ? {start: true, progressInterval: 5000, completed: true, error: true} : false,
    findBestError: findBestError
      ? {
        limitArgOnError : limitArgOnError === 'func' ? limitArgOnErrorTrue : limitArgOnError,
        includeErrorVariant,
        dontThrowIfError: true,
        equals          : withEquals ? equalsCustom : (void 0),
      }
      : (void 0),
  }

  if (logEnabled) {
    log('<run-options>')
    log({
      findBestError,
      limitArgOnError,
      includeErrorVariant,
      withSeed,
      withEquals,
      iterationMode,
      cycles,
      repeatsPerVariant,
      forwardModeCycles,
      retriesToError,
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
      traceEnter(`verifyIterationsCount(${result.iterations}, ${totalVariantsCount}, ${errorIndex}, ${findBestError}, ${cycles}, ${repeatsPerVariant}, ${forwardModeCycles}, ${errorVariantCallCount}, ${retriesToError}, ${iterationMode})`)
    }
    verifyIterationsCount(
      result.iterations,
      totalVariantsCount,
      errorIndex,
      findBestError,
      cycles,
      repeatsPerVariant,
      forwardModeCycles,
      errorVariantCallCount,
      retriesToError,
      iterationMode,
    )
    if (logEnabled) {
      traceExit(`ok`)
    }

    if (logEnabled) {
      traceEnter(`verifyBestError`)
    }
    verifyBestError(result.bestError, findBestError, errorIndex, errorVariantCallCount, retriesToError, cycles, repeatsPerVariant, forwardModeCycles, iterationMode)
    if (logEnabled) {
      traceExit(`ok`)
    }

    if (logEnabled) {
      traceEnter(`verifySeenValues`)
    }
    verifySeenValues(
      seenValuesPerArg,
      expectedValuesPerArg,
      argIsDynamic,
      argKeys,
      errorIndex,
      totalVariantsCount,
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
    const totalErrorCalls = errorVariantCallCount * cycles * repeatsPerVariant * forwardModeCycles
    const errorExpected = !findBestError && errorIndex !== null && totalErrorCalls > retriesToError
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

const testVariants = createTestVariantsStable(async (options: StressTestArgs) => {
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
      findBestError: [false, true, null],
      withEquals   : ({findBestError}) =>
        findBestError !== false ? [false, true, null] : [false],
      includeErrorVariant: ({findBestError}) =>
        findBestError !== false ? [false, true, null] : [false],
      withSeed       : [false, true, null],
      limitArgOnError: ({findBestError}) =>
        findBestError !== false ? [false, true, 'func', null] : [false],
      iterationMode       : ['forward', 'backward', 'random', null],
      repeatsPerVariantMax: [0, 1, 2],
      cyclesMax           : [0, 1, 2],
      forwardModeCyclesMax: [0, 1, 2],
      argType             : ['static', 'dynamic', null],
      retriesToErrorMax   : [0, 1, 2],
      errorPosition       : ['none', 'first', 'last', null],
      valueType           : ['primitive', 'object', null],
      argsCountMax        : [0, 1, 2, 3],
      valuesPerArgMax     : [0, 1, 2],
      valuesCountMax      : [0, 1, 5],
    })({
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
    })
  })
})

// endregion
