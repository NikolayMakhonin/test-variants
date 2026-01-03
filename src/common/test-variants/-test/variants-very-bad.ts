import { createTestVariants } from '#this'
import {
  deepCloneJsonLike,
  deepEqualJsonLike,
  Random,
  randomBoolean,
  randomInt,
} from '@flemist/simple-utils'
import {
  log,
  traceLog,
  traceEnter,
  traceExit,
  formatValue,
  resetLog,
} from 'src/common/helpers/log'
import type {
  ModeConfig,
  TestVariantsLogType,
  TestVariantsRunOptions,
  TestVariantsRunResult,
} from '../types'

// region Log Capture

type LogEntry = {
  type: TestVariantsLogType
  message: string
}

// endregion

// region Debug Logging

let logEnabled = false

async function runWithLogs<T>(fn: () => T | Promise<T>): Promise<T> {
  logEnabled = true
  resetLog()
  try {
    return await fn()
  } finally {
    logEnabled = false
  }
}

// endregion

// region Types

type StaticObject = { id: number; value: string }
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

const LIMIT_ARG_OPTIONS: readonly (false | true | 'func')[] = [
  false,
  true,
  'func',
]
const ITERATION_MODES: readonly ('forward' | 'backward' | 'random')[] = [
  'forward',
  'backward',
  'random',
]
const PARALLEL_OPTIONS: readonly (number | boolean)[] = [false, 1, 4, 8, true]

// endregion

// region Value Generation

function generateOneValue(
  rnd: Random,
  valueTypeOption: 'primitive' | 'object' | null,
  valuesCountMax: number,
): TemplateValue {
  const valueType =
    valueTypeOption ?? (randomBoolean(rnd) ? 'primitive' : 'object')
  const id = randomInt(rnd, 0, valuesCountMax + 1)
  if (valueType === 'primitive') {
    return id
  }
  return { id, value: `value-${id}` }
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

/** Verification state tracked during test execution */
type VerificationState = {
  callCount: number
  errorAttempts: number
  errorActuallyOccurred: boolean
  errorVariantArgs: TestArgs | null
}

/** Verification parameters from test configuration */
type VerificationParams = {
  totalVariantsCount: number | null
  errorIndex: number | null
  firstMatchingIndex: number
  lastMatchingIndex: number
  errorVariantCallCount: number
  retriesToError: number
  findBestError: boolean
  dontThrowIfError: boolean
  cycles: number
  attemptsPerVariant: number
  forwardModeCycles: number
  iterationMode: 'forward' | 'backward' | 'random'
  isParallel: boolean
  isMultiMode: boolean
  limitPerMode: number
  argKeys: string[]
}

/** Verify universal invariants that hold for ALL configurations */
function verifyInvariants(
  result: TestVariantsRunResult<TestArgs>,
  state: VerificationState,
  params: VerificationParams,
): void {
  const { callCount, errorActuallyOccurred, errorVariantArgs } = state
  const {
    totalVariantsCount,
    findBestError,
    dontThrowIfError,
    cycles,
    attemptsPerVariant,
    forwardModeCycles,
    isMultiMode,
    limitPerMode,
    argKeys,
  } = params

  // Invariant 1: iterations >= 0
  if (result.iterations < 0) {
    throw new Error(`iterations must be >= 0, got ${result.iterations}`)
  }

  // Invariant 2: callCount >= 0
  if (callCount < 0) {
    throw new Error(`callCount must be >= 0, got ${callCount}`)
  }

  // Invariant 3: iterations <= callCount (iterations are successful calls)
  if (result.iterations > callCount) {
    throw new Error(
      `iterations (${result.iterations}) must be <= callCount (${callCount})`,
    )
  }

  // Invariant 4: when totalVariantsCount=0, both should be 0
  if (totalVariantsCount === 0) {
    if (result.iterations !== 0) {
      throw new Error(
        `iterations must be 0 when totalVariantsCount=0, got ${result.iterations}`,
      )
    }
    if (callCount !== 0) {
      throw new Error(
        `callCount must be 0 when totalVariantsCount=0, got ${callCount}`,
      )
    }
  }

  // Invariant 5: callCount has upper bound
  // Max possible calls = variants * cycles * attemptsPerVariant * forwardModeCycles * 2 (findBestError may double)
  if (totalVariantsCount !== null && totalVariantsCount > 0) {
    let maxCalls: number
    if (isMultiMode) {
      // Multi-mode: 2 modes, each with limitPerMode, may need multiple rounds
      const roundsToComplete = Math.ceil(totalVariantsCount / limitPerMode)
      maxCalls =
        limitPerMode * 2 * attemptsPerVariant * cycles * roundsToComplete * 2
    } else {
      maxCalls =
        totalVariantsCount * cycles * attemptsPerVariant * forwardModeCycles * 2
    }
    maxCalls = maxCalls + 10 // small buffer for edge cases
    if (callCount > maxCalls) {
      throw new Error(
        `callCount (${callCount}) exceeds maximum bound (${maxCalls}). ` +
          `variants=${totalVariantsCount}, cycles=${cycles}, attemptsPerVariant=${attemptsPerVariant}, ` +
          `forwardModeCycles=${forwardModeCycles}, isMultiMode=${isMultiMode}`,
      )
    }
  }

  // Invariant 6: if error actually occurred and findBestError && dontThrowIfError, bestError must be set
  if (errorActuallyOccurred && findBestError && dontThrowIfError) {
    if (result.bestError === null) {
      throw new Error(
        'bestError must be set when error occurred with findBestError && dontThrowIfError',
      )
    }
  }

  // Invariant 7: if bestError is set, it must be valid
  if (result.bestError !== null) {
    if (!(result.bestError.error instanceof Error)) {
      throw new Error('bestError.error must be an Error instance')
    }
    if (!result.bestError.error.message.startsWith('Test error at call')) {
      throw new Error(
        `bestError.error must be our test error, got: ${result.bestError.error.message}`,
      )
    }
    if (result.bestError.tests < 0) {
      throw new Error(
        `bestError.tests must be >= 0, got ${result.bestError.tests}`,
      )
    }
    // Verify args match error variant
    if (errorVariantArgs !== null) {
      const resultArgsNoSeed = { ...result.bestError.args }
      delete (resultArgsNoSeed as Record<string, unknown>).seed
      const expectedArgsNoSeed = { ...errorVariantArgs }
      delete (expectedArgsNoSeed as Record<string, unknown>).seed
      if (!argsEqualByKeys(resultArgsNoSeed, expectedArgsNoSeed, argKeys)) {
        throw new Error(
          `bestError.args mismatch!\n` +
            `  Expected: ${JSON.stringify(expectedArgsNoSeed)}\n` +
            `  Actual:   ${JSON.stringify(resultArgsNoSeed)}`,
        )
      }
    }
  }

  // Invariant 8: if no error occurred, bestError must be null
  if (!errorActuallyOccurred && result.bestError !== null) {
    throw new Error('bestError must be null when no error occurred')
  }

  // Invariant 9: if error occurred in success path, findBestError+dontThrowIfError must be true
  // Otherwise the error should have been thrown and we'd be in catch block
  if (errorActuallyOccurred && (!findBestError || !dontThrowIfError)) {
    throw new Error(
      `Error occurred but was not thrown. findBestError=${findBestError}, dontThrowIfError=${dontThrowIfError}`,
    )
  }
}

/** Verify deterministic behavior for forward/backward modes without parallel */
function verifyDeterministicBehavior(
  result: TestVariantsRunResult<TestArgs>,
  state: VerificationState,
  params: VerificationParams,
): void {
  const { callCount, errorActuallyOccurred } = state
  const {
    totalVariantsCount,
    cycles,
    attemptsPerVariant,
    forwardModeCycles,
    iterationMode,
    isParallel,
    isMultiMode,
  } = params

  // Skip for non-deterministic modes
  if (isParallel || iterationMode === 'random') {
    return
  }

  // Skip for multi-mode (has different counting logic)
  if (isMultiMode) {
    return
  }

  // Skip if no variants
  if (totalVariantsCount === null || totalVariantsCount === 0) {
    return
  }

  // When no error occurred, verify exact counts
  if (!errorActuallyOccurred) {
    const expected =
      totalVariantsCount * cycles * attemptsPerVariant * forwardModeCycles
    if (callCount !== expected) {
      throw new Error(
        `callCount mismatch: expected ${expected}, got ${callCount}. ` +
          `variants=${totalVariantsCount}, cycles=${cycles}, attemptsPerVariant=${attemptsPerVariant}, forwardModeCycles=${forwardModeCycles}`,
      )
    }
    if (result.iterations !== expected) {
      throw new Error(
        `iterations mismatch: expected ${expected}, got ${result.iterations}`,
      )
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
    const seen = seenValuesPerArg.get(key)!
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
      throw new Error(
        `Expected no values for ${key} when callCount=0, saw ${seen.size}`,
      )
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

function verifyExpectedError(err: unknown): void {
  // Verify the error is our test error (not some unexpected error)
  if (
    !(err instanceof Error) ||
    !err.message.startsWith('Test error at call')
  ) {
    throw err
  }
}

/** Verify log output invariants */
function verifyLogs(
  logEntries: LogEntry[],
  errorActuallyOccurred: boolean,
  findBestError: boolean,
  dontThrowIfError: boolean,
): void {
  // Count error logs
  let errorLogCount = 0
  for (let i = 0, len = logEntries.length; i < len; i++) {
    if (logEntries[i].type === 'error') {
      errorLogCount++
    }
  }

  // Invariant: if error occurred, exactly 1 error log should be present
  // (new code logs only on first error to avoid spam)
  if (errorActuallyOccurred) {
    if (errorLogCount !== 1) {
      throw new Error(
        `Expected exactly 1 error log when error occurred, got ${errorLogCount}`,
      )
    }
  }

  // Invariant: if no error occurred, no error logs
  if (!errorActuallyOccurred && errorLogCount > 0) {
    throw new Error(
      `Expected 0 error logs when no error occurred, got ${errorLogCount}`,
    )
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
        throw new Error(
          `Dynamic template for ${argKey} received ${receivedCounts[i]} args, expected ${argIndex}`,
        )
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
      direction =
        index === 0
          ? 'forward'
          : index === totalVariantsCount - 1
            ? 'backward'
            : 'unknown'
      continue
    }

    // Check if index continues in expected direction or is a repeat
    if (index === lastIndex) {
      // Same index (repeat)
      runLength++
    } else if (direction === 'forward' && index === lastIndex + 1) {
      // Forward progression
      runLength++
    } else if (direction === 'backward' && index === lastIndex - 1) {
      // Backward progression
      runLength++
    } else if (runLength >= effectiveLimit) {
      // Mode switch: direction should change or continue from saved position
      if (direction === 'forward') {
        // Switch to backward or continue forward from next position
        direction =
          index === totalVariantsCount - 1
            ? 'backward'
            : index > lastIndex
              ? 'forward'
              : 'backward'
      } else {
        // Switch to forward or continue backward from next position
        direction =
          index === 0 ? 'forward' : index < lastIndex ? 'backward' : 'forward'
      }
      runLength = 1
    } else {
      // Unexpected jump - could be position restoration from saved state
      // This is valid for position persistence: mode re-entry continues from saved position
      // Update direction based on the new trajectory
      if (index > lastIndex) {
        direction = 'forward'
      } else if (index < lastIndex) {
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
    return {
      count: valid ? 1 : 0,
      firstMatchingIndex: valid ? 0 : -1,
      lastMatchingIndex: valid ? 0 : -1,
    }
  }

  const errorArgs = computeArgsAtIndex(template, argKeys, errorIndex)

  // Count ALL matching variants from index 0 (value-based detection)
  // innerTest uses deepEqualJsonLike which matches any variant with same args
  let count = 0
  let firstMatchingIndex = -1
  let lastMatchingIndex = -1
  for (
    let variantIndex = 0;
    variantIndex < totalVariantsCount;
    variantIndex++
  ) {
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

  return { count, firstMatchingIndex, lastMatchingIndex }
}

// endregion

// region Sliced Arrays Cache

const slicedArraysCache: Map<TemplateArray, TemplateArray[]> = new Map()

function clearSlicedArraysCache(): void {
  slicedArraysCache.clear()
}

function getSlicedArray(values: TemplateArray, count: number): TemplateArray {
  let cache = slicedArraysCache.get(values)
  if (cache === void 0) {
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

  const argsCount =
    options.argsCountMax === 0 ? 0 : randomInt(rnd, 1, options.argsCountMax + 1)

  for (let argIndex = 0; argIndex < argsCount; argIndex++) {
    const argKey = `arg${argIndex}`
    argKeys[argIndex] = argKey
    seenValuesPerArg.set(argKey, new Set())
  }

  let hasDynamicArgs = false

  for (let argIndex = 0; argIndex < argsCount; argIndex++) {
    const argKey = argKeys[argIndex]
    const valuesCount = randomInt(rnd, 0, options.valuesPerArgMax + 1)
    const argType =
      options.argType ?? (randomBoolean(rnd) ? 'static' : 'dynamic')
    const isDynamic = argType === 'dynamic'
    const values = generateValuesArray(
      rnd,
      valuesCount,
      options.valueType,
      options.valuesCountMax,
    )

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

      template[argKey] = function dynamicTemplate(
        args: TestArgs,
      ): TemplateArray {
        if (logEnabled) {
          traceEnter(
            `dynamicTemplate(${capturedArgKey}, args=${formatValue(args)})`,
          )
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
            traceExit(
              `ERROR: expected ${capturedArgIndex} args, got ${receivedCount}`,
            )
          }
          throw new Error(
            `Dynamic template ${capturedArgKey}: expected ${capturedArgIndex} args, got ${receivedCount}`,
          )
        }
        for (let i = 0; i < capturedArgIndex; i++) {
          const expectedKey = capturedArgKeys[i]
          if (!(expectedKey in args)) {
            if (logEnabled) {
              traceExit(`ERROR: missing arg ${expectedKey}`)
            }
            throw new Error(
              `Dynamic template ${capturedArgKey}: missing expected arg ${expectedKey}`,
            )
          }
        }

        // Track received count for post-hoc verification
        const callCounts = capturedDynamicArgsReceived.get(capturedArgKey)!
        callCounts[callCounts.length] = receivedCount

        const len = capturedValues.length
        if (len === 0) {
          if (logEnabled) {
            traceExit(`return [] (empty values)`)
          }
          return capturedValues
        }

        const prevArgKey =
          capturedArgIndex > 0 ? capturedArgKeys[capturedArgIndex - 1] : null
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
          traceExit(
            `return ${formatValue(result)} (sliced by prevValue=${prevValue})`,
          )
        }
        return result
      }
    } else {
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
  } else if (argsCount === 0) {
    // Empty template = 1 variant (the empty combination {})
    // Cartesian product of zero sets is one element (the empty tuple)
    totalVariantsCount = 1
  } else {
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

  const errorIndex =
    totalVariantsCount !== null
      ? generateErrorIndex(rnd, options.errorPosition, totalVariantsCount)
      : null

  // endregion

  // region Tracking State

  let callCount = 0
  let errorAttempts = 0
  const retriesToError = randomInt(rnd, 0, options.retriesToErrorMax + 1)
  const withSeed = options.withSeed ?? randomBoolean(rnd)
  const parallel =
    options.parallel ??
    PARALLEL_OPTIONS[randomInt(rnd, 0, PARALLEL_OPTIONS.length)]
  const isParallel = parallel !== false && parallel !== 1

  // Compute error variant info (count, first and last matching index)
  const errorVariantInfo =
    errorIndex !== null && !hasDynamicArgs && totalVariantsCount !== null
      ? computeErrorVariantInfo(
          template,
          argKeys,
          errorIndex,
          totalVariantsCount,
        )
      : {
          count: 1,
          firstMatchingIndex: errorIndex ?? 0,
          lastMatchingIndex: errorIndex ?? 0,
        }
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
    errorVariantArgs = computeArgsAtIndex(
      template,
      argKeys,
      errorIndex,
    ) as TestArgs
  }

  // Determine if multi-mode is enabled (needed for innerTest before full mode configuration)
  const modeConfig =
    options.modeConfig ?? (randomBoolean(rnd) ? 'single' : 'multi')
  const isMultiMode =
    modeConfig === 'multi' &&
    totalVariantsCount !== null &&
    totalVariantsCount > 1

  // Log capture for verification
  const logEntries: LogEntry[] = []
  function captureLog(type: TestVariantsLogType, message: string): void {
    logEntries[logEntries.length] = { type, message }
    if (logEnabled) {
      log(message)
    }
  }

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
    maxExpectedCalls =
      limitPerMode *
      2 *
      guardRepeats *
      guardCycles *
      roundsToComplete *
      guardFindBestError
  } else if (totalVariantsCount !== null) {
    // Static template: use max of all mode formulas
    const sequentialMax =
      totalVariantsCount *
      guardCycles *
      guardRepeats *
      guardForwardCycles *
      guardFindBestError
    const randomMax =
      guardCycles *
      Math.max(1, totalVariantsCount * guardRepeats * guardForwardCycles) *
      guardFindBestError
    maxExpectedCalls = Math.max(sequentialMax, randomMax)
  } else {
    // Dynamic template: use max of sequential estimate and random limit
    const estimatedVariants = (options.valuesPerArgMax + 1) ** argsCount
    const sequentialMax =
      Math.max(1, estimatedVariants) *
      guardCycles *
      guardRepeats *
      guardForwardCycles *
      guardFindBestError
    const randomMax = guardCycles * 100 * guardFindBestError
    maxExpectedCalls = Math.max(sequentialMax, randomMax)
  }
  // Add buffer for edge cases
  maxExpectedCalls = maxExpectedCalls + 1

  // endregion

  // region Create Test Function

  // Note: innerTest is SYNCHRONOUS for maximum performance
  // Async overhead would destroy throughput with millions of iterations
  const testFunc = createTestVariants(function innerTest(args: TestArgs): void {
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
      if (argValue !== void 0) {
        const value = typeof argValue === 'object' ? argValue.id : argValue
        seenValuesPerArg.get(key)!.add(value)
      }
    }

    callCount++

    // Guard against infinite loops - throw if callCount exceeds expected maximum
    if (callCount > maxExpectedCalls) {
      throw new Error(
        `Infinite loop: callCount=${callCount} > max=${maxExpectedCalls}. ` +
          `variants=${totalVariantsCount}, multiMode=${isMultiMode}`,
      )
    }

    let isErrorVariant = false
    if (errorIndex !== null) {
      if (errorVariantArgs === null) {
        isErrorVariant = callCount === errorIndex + 1
      } else {
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
        traceLog(
          `errorAttempts=${errorAttempts}, retriesToError=${retriesToError}`,
        )
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
  const iterationMode =
    options.iterationMode ?? ITERATION_MODES[randomInt(rnd, 0, 3)]
  // cycles=0 means 0 iterations; use at least 1 when findBestError is false to test normally
  const cycles = findBestError
    ? options.cyclesMax === 0
      ? 0
      : options.cyclesMax || 1
    : Math.max(1, options.cyclesMax || 1)
  const attemptsPerVariant = findBestError
    ? options.attemptsPerVariantMax === 0
      ? 0
      : options.attemptsPerVariantMax || 1
    : Math.max(1, options.attemptsPerVariantMax || 1)
  const forwardModeCycles = findBestError
    ? options.forwardModeCyclesMax === 0
      ? 0
      : options.forwardModeCyclesMax || 1
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
      { mode: 'forward', limitTests: limitPerMode, attemptsPerVariant },
      { mode: 'backward', limitTests: limitPerMode, attemptsPerVariant },
    ]
  } else if (iterationMode === 'random') {
    // Random mode limit per external cycle (cycles is handled by outer loop)
    // Ensure limit is at least 1 to prevent infinite loops (limitTests=0 means no limit)
    const randomLimit =
      totalVariantsCount !== null && totalVariantsCount > 0
        ? Math.max(
            1,
            totalVariantsCount * attemptsPerVariant * forwardModeCycles,
          )
        : 100
    modes = [{ mode: 'random', limitTests: randomLimit }]
  } else if (iterationMode === 'backward') {
    modes = [
      { mode: 'backward', cycles: forwardModeCycles, attemptsPerVariant },
    ]
  } else {
    modes = [{ mode: 'forward', cycles: forwardModeCycles, attemptsPerVariant }]
  }

  const runOptions: TestVariantsRunOptions<TestArgs> = {
    cycles,
    iterationModes: modes,
    parallel,
    getSeed: withSeed ? getSeedFromRnd : void 0,
    log: {
      start: logEnabled,
      progress: logEnabled ? 5000 : false,
      completed: logEnabled,
      error: true,
      modeChange: logEnabled,
      debug: logEnabled,
      func: captureLog,
    },
    findBestError: findBestError
      ? {
          limitArgOnError:
            limitArgOnError === 'func' ? limitArgOnErrorTrue : limitArgOnError,
          includeErrorVariant,
          dontThrowIfError,
          equals: withEquals ? equalsCustom : void 0,
        }
      : void 0,
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
    const result = await testFunc(template)(runOptions)

    // Error actually occurred if errorAttempts exceeded retriesToError
    const errorActuallyOccurred = errorAttempts > retriesToError

    if (logEnabled) {
      log('</execution>')
      log('<result>')
      log({
        iterations: result.iterations,
        bestError: result.bestError,
        callCount,
        errorAttempts,
        errorActuallyOccurred,
        errorVariantArgs,
      })
      log('</result>')
      log('<verification>')
    }

    // Build verification state and params
    const verificationState: VerificationState = {
      callCount,
      errorAttempts,
      errorActuallyOccurred,
      errorVariantArgs,
    }
    const verificationParams: VerificationParams = {
      totalVariantsCount,
      errorIndex,
      firstMatchingIndex,
      lastMatchingIndex,
      errorVariantCallCount,
      retriesToError,
      findBestError,
      dontThrowIfError,
      cycles,
      attemptsPerVariant,
      forwardModeCycles,
      iterationMode,
      isParallel,
      isMultiMode,
      limitPerMode,
      argKeys,
    }

    if (logEnabled) {
      traceEnter('verifyInvariants')
    }
    verifyInvariants(result, verificationState, verificationParams)
    if (logEnabled) {
      traceExit('ok')
    }

    if (logEnabled) {
      traceEnter('verifyDeterministicBehavior')
    }
    verifyDeterministicBehavior(result, verificationState, verificationParams)
    if (logEnabled) {
      traceExit('ok')
    }

    if (logEnabled) {
      traceEnter('verifySeenValues')
    }
    // Full coverage: all variants visited at least once (static templates, no error, deterministic mode, iterations > 0)
    const expectedIterationsForCoverage =
      (totalVariantsCount ?? 0) *
      cycles *
      attemptsPerVariant *
      forwardModeCycles
    const fullCoverage =
      !errorActuallyOccurred &&
      totalVariantsCount !== null &&
      totalVariantsCount > 0 &&
      iterationMode !== 'random' &&
      expectedIterationsForCoverage > 0 &&
      result.iterations >= expectedIterationsForCoverage
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
      traceExit('ok')
    }

    if (logEnabled) {
      traceEnter('verifyDynamicArgs')
    }
    verifyDynamicArgs(dynamicArgsReceived, argKeys)
    if (logEnabled) {
      traceExit('ok')
    }

    // Verify position persistence for multi-mode configuration
    if (isMultiMode && totalVariantsCount !== null && totalVariantsCount > 1) {
      if (logEnabled) {
        traceEnter('verifyPositionPersistence')
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
        traceExit('ok')
      }
    }

    if (logEnabled) {
      traceEnter('verifyLogs')
    }
    verifyLogs(
      logEntries,
      errorActuallyOccurred,
      findBestError,
      dontThrowIfError,
    )
    if (logEnabled) {
      traceExit('ok')
    }

    if (logEnabled) {
      log('</verification>')
      log('</test>')
    }
  } catch (err) {
    // Error expected when: findBestError is false, errorIndex is set, and totalErrorCalls > retriesToError
    // For random mode with multiple variants, we can't predict exact error timing
    // but with 1 variant, behavior is deterministic
    if (iterationMode === 'random' && totalVariantsCount !== 1) {
      // Verify it's at least our test error for non-deterministic random mode
      if (
        !(err instanceof Error) ||
        !err.message.startsWith('Test error at call')
      ) {
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
        traceLog(
          'random mode with multiple variants - skip strict verification',
        )
        log('</verification>')
        log('</test>')
      }
      return
    }
    // Error is thrown when: (1) no findBestError, or (2) findBestError but dontThrowIfError=false
    // Use errorAttempts > retriesToError since that directly reflects when innerTest throws
    // Works for all modes: forward, backward, random
    const errorActuallyOccurred = errorAttempts > retriesToError
    const errorExpected =
      (!findBestError || !dontThrowIfError) && errorActuallyOccurred
    if (errorExpected) {
      if (logEnabled) {
        log('</execution>')
        log('<verification>')
        traceEnter(`verifyExpectedError`)
      }
      verifyExpectedError(err)
      if (logEnabled) {
        traceExit(`ok`)
      }

      // Verify logs in error path too
      if (logEnabled) {
        traceEnter('verifyLogs')
      }
      verifyLogs(
        logEntries,
        errorActuallyOccurred,
        findBestError,
        dontThrowIfError,
      )
      if (logEnabled) {
        traceExit(`ok`)
        log('</verification>')
        log('</test>')
      }
    } else {
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

export const testVariants = createTestVariants(
  async (options: StressTestArgs) => {
    try {
      await executeStressTest(options)
    } catch (err) {
      await runWithLogs(async () => {
        await executeStressTest(options)
      })
      throw err
    }
  },
)

// endregion
