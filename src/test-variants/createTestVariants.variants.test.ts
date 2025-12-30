import {createTestVariants as createTestVariantsStable} from 'dist/lib/index.mjs'
import {createTestVariants} from 'src/test-variants/createTestVariants'
import {objectToString} from 'src/test-variants/format/objectToString'
import {getRandomSeed, Random} from 'src/test-variants/random/Random'
import {randomBoolean, randomInt} from 'src/test-variants/random/helpers'
import type {TestVariantsRunOptions, TestVariantsRunResult} from 'src/test-variants/testVariantsRun'

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
  withEquals: boolean | null
  seed: number
}

// endregion

// region Constants

const LIMIT_ARG_OPTIONS: readonly (false | true | 'func')[] = [false, true, 'func']

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
  if (errorIndex === null) {
    if (!findBestError) {
      if (resultIterations !== totalVariantsCount) {
        throw new Error(`Expected ${totalVariantsCount} iterations without findBestError, got ${resultIterations}`)
      }
    }
    else if (cycles > 0 && repeatsPerVariant > 0) {
      const expected = totalVariantsCount * cycles * repeatsPerVariant
      if (resultIterations !== expected) {
        throw new Error(`Expected ${expected} iterations with findBestError (cycles=${cycles}, repeats=${repeatsPerVariant}), got ${resultIterations}`)
      }
    }
    return
  }
  if (!findBestError) {
    throw new Error('Expected error to be thrown without findBestError')
  }
  if (resultIterations === 0 && totalVariantsCount > 0) {
    throw new Error('Expected some iterations when totalVariantsCount > 0')
  }
}

function verifyBestError(
  resultBestError: TestVariantsRunResult<TestArgs>['bestError'],
  findBestError: boolean,
  errorIndex: number | null,
): void {
  if (findBestError && errorIndex !== null) {
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
  findBestError: boolean,
  cycles: number,
  repeatsPerVariant: number,
): void {
  if (totalVariantsCount === null || errorIndex !== null || totalVariantsCount === 0) {
    return
  }
  const expected = findBestError
    ? totalVariantsCount * cycles * repeatsPerVariant
    : totalVariantsCount
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
    log('')
    log('='.repeat(80))
    log('[OPTIONS]')
    log(options)
    log('')
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
    log('[TEMPLATE]')
    const templateInfo: Record<string, string> = {}
    for (let i = 0; i < argsCount; i++) {
      const key = argKeys[i]
      const isDyn = argIsDynamic.get(key)
      const tmpl = template[key]
      templateInfo[key] = isDyn ? 'dynamic' : formatValue(tmpl)
    }
    log(templateInfo)
    log('')
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

  if (logEnabled) {
    log('[CALCULATED]')
    log({
      argsCount,
      hasDynamicArgs,
      totalVariantsCount,
      errorIndex,
    })
    log('')
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
  // cycles=0 means 0 iterations; use at least 1 when findBestError is false to test normally
  const cycles = findBestError
    ? (options.cyclesMax === 0 ? 0 : (options.cyclesMax || 1))
    : Math.max(1, options.cyclesMax || 1)
  const repeatsPerVariant = findBestError
    ? (options.repeatsPerVariantMax === 0 ? 0 : (options.repeatsPerVariantMax || 1))
    : Math.max(1, options.repeatsPerVariantMax || 1)

  function getSeedFromRnd(): number {
    return rnd.nextSeed()
  }

  const runOptions: TestVariantsRunOptions<TestArgs> = {
    cycles,
    repeatsPerVariant,
    getSeed      : withSeed ? getSeedFromRnd : (void 0),
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
    log('[RUN_OPTIONS]')
    log({
      findBestError,
      limitArgOnError,
      includeErrorVariant,
      withSeed,
      withEquals,
      cycles,
      repeatsPerVariant,
      retriesToError,
    })
    log('')
    log('[EXECUTION]')
  }

  // endregion

  // region Run Test

  try {
    const result = await testFn(template)(runOptions)

    if (logEnabled) {
      log('')
      log('[RESULT]')
      log({
        iterations: result.iterations,
        bestError : result.bestError,
        callCount,
        errorVariantArgs,
      })
      log('')
      log('[VERIFICATION]')
    }

    if (logEnabled) {
      traceEnter(`verifyIterationsCount(${result.iterations}, ${totalVariantsCount}, ${errorIndex}, ${findBestError}, ${cycles}, ${repeatsPerVariant})`)
    }
    verifyIterationsCount(
      result.iterations,
      totalVariantsCount,
      errorIndex,
      findBestError,
      cycles,
      repeatsPerVariant,
    )
    if (logEnabled) {
      traceExit(`ok`)
    }

    if (logEnabled) {
      traceEnter(`verifyBestError`)
    }
    verifyBestError(result.bestError, findBestError, errorIndex)
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
      traceEnter(`verifyCallCount(${callCount}, ${totalVariantsCount}, ${errorIndex}, ${findBestError}, ${cycles}, ${repeatsPerVariant})`)
    }
    verifyCallCount(
      callCount,
      totalVariantsCount,
      errorIndex,
      findBestError,
      cycles,
      repeatsPerVariant,
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
  }
  catch (err) {
    if (!findBestError && errorIndex !== null) {
      if (logEnabled) {
        traceEnter(`verifyExpectedError`)
      }
      verifyExpectedError(err, errorIndex, callCount)
      if (logEnabled) {
        traceExit(`ok (expected error)`)
      }
    }
    else {
      if (logEnabled) {
        log('')
        log('[ERROR]')
        log(err)
      }
      throw err
    }
  }

  if (logEnabled) {
    log('')
    log('[DONE]')
    log('='.repeat(80))
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

xdescribe('test-variants > createTestVariants variants', function () {
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
      repeatsPerVariantMax: [0, 1, 2],
      cyclesMax           : [0, 1, 2],
      argType             : ['static', 'dynamic', null],
      retriesToErrorMax   : [0, 1, 2],
      errorPosition       : ['none', 'first', 'last', null],
      valueType           : ['primitive', 'object', null],
      argsCountMax        : [0, 1, 2, 3],
      valuesPerArgMax     : [0, 1, 2],
      valuesCountMax      : [0, 1, 5],
    })({
      getSeed      : getRandomSeed,
      cycles       : 10000,
      findBestError: {
        limitArgOnError: true,
      },
      saveErrorVariants: {
        dir               : 'tmp/test/createTestVariants/variants',
        retriesPerVariant : 10,
        useToFindBestError: true,
      },
    })
  })
})

// endregion
