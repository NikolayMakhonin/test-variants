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
 * - @/ai/project/base/docs/rules/code/TypeScript/rules/lib.md
 * - @/ai/project/base/docs/rules/common/design-principles.md
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
  LimitArgOnError,
  LimitArgOnErrorOptions,
  ModeConfig,
  ModeType,
  TestVariantsFindBestErrorOptions,
  TestVariantsLogOptions,
  TestVariantsLogType,
  TestVariantsRunOptions,
  TestVariantsRunResult,
} from '../types'

// region Types

type ObjectValue = {
  value: number
}

type TemplateValue = number | ObjectValue

type TemplateArray = readonly TemplateValue[]

type TestArgs = Record<string, TemplateValue>

type TemplateFunc = (args: TestArgs) => TemplateArray

type Template = Record<string, TemplateArray | TemplateFunc>

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
  modeType: 'forward' | 'backward' | 'random' | null
  modesCountMax: number
  withEquals: boolean | null
  parallel: number | boolean | null
  seed: number
}

// endregion

const PARALLEL_MAX = 10
const TIME_MAX = 10

// region Helpers

function deepFreezeJsonLike(value: unknown): void {
  if (value == null || typeof value !== 'object') {
    return
  }
  Object.freeze(value)
  if (Array.isArray(value)) {
    for (let i = 0, len = value.length; i < len; i++) {
      deepFreezeJsonLike(value[i])
    }
  } else {
    const keys = Object.keys(value)
    for (let i = 0, len = keys.length; i < len; i++) {
      deepFreezeJsonLike((value as Record<string, unknown>)[keys[i]])
    }
  }
}

// endregion

class TestError extends Error {}

// region Generators

function generateBoolean(rnd: Random, value: boolean | null): boolean {
  return value ?? randomBoolean(rnd)
}

function generateBoundaryInt(
  rnd: Random,
  max: number,
  maxIsBoundary?: null | boolean,
): number {
  if (max <= 0) {
    return 0
  }
  if (max === 1) {
    return randomBoolean(rnd) ? 0 : 1
  }
  if (max === 2) {
    return randomInt(rnd, 0, 3)
  }
  if (maxIsBoundary) {
    // Priority: 0, 1, 2, max, then random
    const choice = randomInt(rnd, 0, 5)
    if (choice === 0) {
      return 0
    }
    if (choice === 1) {
      return 1
    }
    if (choice === 2) {
      return 2
    }
    if (choice === 3) {
      return max
    }
    return randomInt(rnd, 0, max + 1)
  }
  // Priority: 0, 1, 2, then random
  const choice = randomInt(rnd, 0, 4)
  if (choice === 0) {
    return 0
  }
  if (choice === 1) {
    return 1
  }
  if (choice === 2) {
    return 2
  }
  return randomInt(rnd, 0, max + 1)
}

function generateLimit(rnd: Random, max: number): number {
  // Priority: 0, 1, max, max * 2, [2..max-1]
  // max = 0: [0, 1]
  // max = 1: [0, 1, 2]
  // max = 2: [0, 1, 2, 4]
  // max >= 3: [0, 1, 2..max-1, max, max*2]
  if (max === 0) {
    return randomBoolean(rnd) ? 0 : 1
  }
  if (max === 1) {
    return randomInt(rnd, 0, 3)
  }
  if (max === 2) {
    const choice = randomInt(rnd, 0, 4)
    if (choice === 3) {
      return 4
    }
    return choice
  }
  const choice = randomInt(rnd, 0, 5)
  if (choice === 0) {
    return 0
  }
  if (choice === 1) {
    return 1
  }
  if (choice === 2) {
    return max
  }
  if (choice === 3) {
    return max * 2
  }
  return randomInt(rnd, 2, max)
}

function generatePrimitiveValue(rnd: Random, max: number): number {
  return generateBoundaryInt(rnd, max)
}

function generateObjectValue(rnd: Random, max: number): ObjectValue {
  return Object.freeze({ value: generatePrimitiveValue(rnd, max) })
}

function generateValueType(
  rnd: Random,
  valueType: 'primitive' | 'object' | null,
): 'primitive' | 'object' {
  return valueType ?? (randomBoolean(rnd) ? 'primitive' : 'object')
}

function generateValue(
  rnd: Random,
  max: number,
  valueTypeOption: 'primitive' | 'object' | null,
): TemplateValue {
  const valueType = generateValueType(rnd, valueTypeOption)
  if (valueType === 'primitive') {
    return generatePrimitiveValue(rnd, max)
  }
  return generateObjectValue(rnd, max)
}

function generateValuesArray(
  rnd: Random,
  countMax: number,
  valueMax: number,
  valueTypeOption: 'primitive' | 'object' | null,
): TemplateValue[] {
  const count = generateBoundaryInt(rnd, countMax)
  const values: TemplateValue[] = []
  for (let i = 0; i < count; i++) {
    values[i] = generateValue(rnd, valueMax, valueTypeOption)
  }
  return values
}

function generateArgType(
  rnd: Random,
  argType: 'static' | 'dynamic' | null,
): 'static' | 'dynamic' {
  return argType ?? (randomBoolean(rnd) ? 'static' : 'dynamic')
}

function generateErrorIndex(
  rnd: Random,
  errorPosition: 'none' | 'first' | 'last' | null,
  totalCount: number,
): number | null {
  if (totalCount === 0) {
    return null
  }
  if (errorPosition === 'none') {
    return null
  }
  if (errorPosition === 'first') {
    return 0
  }
  if (errorPosition === 'last') {
    return totalCount - 1
  }
  // null - random with boundary priority
  const hasMiddle = totalCount > 2
  const choiceCount = hasMiddle ? 4 : 3
  const choice = randomInt(rnd, 0, choiceCount)
  if (choice === 0) {
    return null
  }
  if (choice === 1) {
    return 0
  }
  if (choice === 2) {
    return totalCount - 1
  }
  return randomInt(rnd, 1, totalCount - 1)
}

function generateLimitArgOnErrorFunc(
  argKeys: readonly string[],
  template: Template,
): LimitArgOnError {
  return function limitArgOnError(options: LimitArgOnErrorOptions): boolean {
    if (options == null || typeof options !== 'object') {
      throw new Error(
        `limitArgOnError: options must be object, got ${typeof options}`,
      )
    }
    if (!options.name) {
      throw new Error(
        `limitArgOnError: name must be not empty string, got ${typeof options.name}`,
      )
    }

    let argIndex = -1
    for (let i = 0, len = argKeys.length; i < len; i++) {
      if (argKeys[i] === options.name) {
        argIndex = i
        break
      }
    }
    if (argIndex < 0) {
      throw new Error(`limitArgOnError: unknown arg name "${options.name}"`)
    }

    if (!Number.isInteger(options.valueIndex)) {
      throw new Error(
        `limitArgOnError: valueIndex must be integer, got ${options.valueIndex}`,
      )
    }
    if (options.valueIndex < 0) {
      throw new Error(
        `limitArgOnError: valueIndex must be non-negative, got ${options.valueIndex}`,
      )
    }

    if (!Array.isArray(options.values)) {
      throw new Error(
        `limitArgOnError: values must be array, got ${typeof options.values}`,
      )
    }
    if (options.values.length === 0) {
      throw new Error(`limitArgOnError: values must be non-empty array`)
    }
    if (options.valueIndex >= options.values.length) {
      throw new Error(
        `limitArgOnError: valueIndex ${options.valueIndex} >= values.length ${options.values.length}`,
      )
    }

    const templateValues = template[options.name]
    if (typeof templateValues === 'function') {
      // Dynamic template - can't validate values statically
    } else {
      if (options.values.length !== templateValues.length) {
        throw new Error(
          `limitArgOnError: values.length ${options.values.length} !== template.length ${templateValues.length}`,
        )
      }
      for (let i = 0, len = options.values.length; i < len; i++) {
        if (!deepEqualJsonLike(options.values[i], templateValues[i])) {
          throw new Error(
            `limitArgOnError: values[${i}] mismatch with template`,
          )
        }
      }
    }

    if (options.maxValueIndex === void 0) {
      throw new Error(`limitArgOnError: options.maxValueIndex is missing`)
    }
    if (options.maxValueIndex !== null) {
      if (!Number.isInteger(options.maxValueIndex)) {
        throw new Error(
          `limitArgOnError: maxValueIndex must be integer, got ${options.maxValueIndex}`,
        )
      }
      if (options.maxValueIndex < 0) {
        throw new Error(
          `limitArgOnError: maxValueIndex must be non-negative, got ${options.maxValueIndex}`,
        )
      }
      if (options.maxValueIndex >= options.values.length) {
        throw new Error(
          `limitArgOnError: maxValueIndex ${options.maxValueIndex} >= values.length ${options.values.length}`,
        )
      }
    }

    // Limit only odd indices
    return options.valueIndex % 2 === 1
  }
}

function generateLimitArgOnError(
  rnd: Random,
  limitArgOnError: false | true | 'func' | null,
  argKeys: readonly string[],
  template: Template,
): boolean | LimitArgOnError {
  if (limitArgOnError === 'func') {
    return generateLimitArgOnErrorFunc(argKeys, template)
  }
  if (limitArgOnError !== null) {
    return limitArgOnError
  }
  const choice = randomInt(rnd, 0, 3)
  if (choice === 0) {
    return false
  }
  if (choice === 1) {
    return true
  }
  return generateLimitArgOnErrorFunc(argKeys, template)
}

function generateModeType(rnd: Random, modeOption: ModeType | null): ModeType {
  if (modeOption !== null) {
    return modeOption
  }
  const choice = randomInt(rnd, 0, 3)
  if (choice === 0) {
    return 'forward'
  }
  if (choice === 1) {
    return 'backward'
  }
  return 'random'
}

function generateParallel(
  rnd: Random,
  parallelOption: number | boolean | null,
  max: number,
): number | boolean {
  if (parallelOption !== null) {
    return parallelOption
  }
  // 1/4 chance for true/false
  if (randomBoolean(rnd, 0.25)) {
    return randomBoolean(rnd)
  }
  return Math.max(1, generateBoundaryInt(rnd, max))
}

function generateSeedFunc(
  rnd: Random,
  withSeed: boolean | null,
): (() => number) | undefined {
  const enabled = generateBoolean(rnd, withSeed)
  if (!enabled) {
    return void 0
  }
  let seed = 0
  return function getSeed(): number {
    return seed++
  }
}

function equals(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }
  if (a == null || b == null) {
    return false
  }
  if (typeof a !== 'object' || typeof b !== 'object') {
    return false
  }
  return (a as ObjectValue).value === (b as ObjectValue).value
}

function generateEqualsFunc(
  rnd: Random,
  withEquals: boolean | null,
): ((a: unknown, b: unknown) => boolean) | undefined {
  const enabled = generateBoolean(rnd, withEquals)
  if (!enabled) {
    return void 0
  }
  return equals
}

function generateFindBestErrorOptions(
  rnd: Random,
  findBestError: boolean | null,
  withEquals: boolean | null,
  limitArgOnError: false | true | 'func' | null,
  includeErrorVariant: boolean | null,
  dontThrowIfError: boolean | null,
  argKeys: readonly string[],
  template: Template,
): TestVariantsFindBestErrorOptions | undefined {
  const enabled = generateBoolean(rnd, findBestError)
  if (!enabled) {
    return void 0
  }
  return {
    equals: generateEqualsFunc(rnd, withEquals),
    limitArgOnError: generateLimitArgOnError(
      rnd,
      limitArgOnError,
      argKeys,
      template,
    ),
    includeErrorVariant: generateBoolean(rnd, includeErrorVariant),
    dontThrowIfError: generateBoolean(rnd, dontThrowIfError),
  }
}

function generateLogOptions(
  rnd: Random,
  logFunc: (type: TestVariantsLogType, message: string) => void,
): TestVariantsLogOptions {
  return {
    start: randomBoolean(rnd),
    progress: randomBoolean(rnd) ? generateBoundaryInt(rnd, TIME_MAX) : false,
    completed: randomBoolean(rnd),
    error: randomBoolean(rnd),
    modeChange: randomBoolean(rnd),
    debug: randomBoolean(rnd),
    func: logFunc,
  }
}

function generateMode(
  rnd: Random,
  variantsCount: number,
  cyclesMax: number,
  attemptsMax: number,
  modeTypeOption: ModeType | null,
): ModeConfig {
  const mode = generateModeType(rnd, modeTypeOption)
  const variants = Math.max(1, generateBoundaryInt(rnd, variantsCount))
  const cycles = generateBoundaryInt(rnd, cyclesMax)
  const attemptsPerVariant = generateBoundaryInt(rnd, attemptsMax)
  const limitTests = generateLimit(rnd, variants * cycles * attemptsPerVariant)
  return Object.freeze({ mode, cycles, attemptsPerVariant, limitTests })
}

function generateModes(
  rnd: Random,
  variantsCount: number,
  cyclesMax: number,
  attemptsMax: number,
  modesMax: number,
  modeTypeOption: ModeType | null,
): ModeConfig[] {
  const count = Math.max(1, generateBoundaryInt(rnd, modesMax))
  const modes: ModeConfig[] = []
  for (let i = 0; i < count; i++) {
    modes[i] = generateMode(
      rnd,
      variantsCount,
      cyclesMax,
      attemptsMax,
      modeTypeOption,
    )
  }
  return Object.freeze(modes) as ModeConfig[]
}

const argKeyCache: Map<number, string> = new Map()

function getArgKey(index: number): string {
  let key = argKeyCache.get(index)
  if (key == null) {
    key = `arg${index}`
    argKeyCache.set(index, key)
  }
  return key
}

function generateStaticArg(
  rnd: Random,
  valuesCountMax: number,
  valueMax: number,
  valueTypeOption: 'primitive' | 'object' | null,
): TemplateArray {
  return Object.freeze(
    generateValuesArray(rnd, valuesCountMax, valueMax, valueTypeOption),
  )
}

function generateDynamicArg(
  rnd: Random,
  valuesCountMax: number,
  valueMax: number,
  valueTypeOption: 'primitive' | 'object' | null,
  prevArgKey: string | null,
): TemplateFunc {
  const baseValues0 = Object.freeze(
    generateValuesArray(rnd, valuesCountMax, valueMax, valueTypeOption),
  )
  const baseValues1 = Object.freeze(
    generateValuesArray(rnd, valuesCountMax, valueMax, valueTypeOption),
  )
  return function dynamicArg(args: TestArgs): TemplateArray {
    if (prevArgKey == null) {
      return baseValues0
    }
    const prevValue = args[prevArgKey]
    if (prevValue == null) {
      throw new Error(`Dynamic arg: prevValue is null for key ${prevArgKey}`)
    }
    const numValue = typeof prevValue === 'object' ? prevValue.value : prevValue
    return numValue % 2 === 0 ? baseValues0 : baseValues1
  }
}

function generateTemplate(
  rnd: Random,
  argsCountMax: number,
  valuesCountMax: number,
  valueMax: number,
  argTypeOption: 'static' | 'dynamic' | null,
  valueTypeOption: 'primitive' | 'object' | null,
): Template {
  const argsCount = generateBoundaryInt(rnd, argsCountMax)
  const template: Template = {}
  let prevKey: string | null = null
  for (let i = 0; i < argsCount; i++) {
    const key = getArgKey(i)
    const argType = generateArgType(rnd, argTypeOption)
    if (argType === 'static') {
      template[key] = generateStaticArg(
        rnd,
        valuesCountMax,
        valueMax,
        valueTypeOption,
      )
    } else {
      template[key] = generateDynamicArg(
        rnd,
        valuesCountMax,
        valueMax,
        valueTypeOption,
        prevKey,
      )
    }
    prevKey = key
  }
  return Object.freeze(template)
}

function generateRunOptions(
  rnd: Random,
  options: StressTestArgs,
  argKeys: readonly string[],
  template: Template,
  variantsCount: number,
  logFunc: (type: TestVariantsLogType, message: string) => void,
  onError: (event: { error: unknown; args: TestArgs; tests: number }) => void,
): TestVariantsRunOptions<TestArgs> {
  const limitTests = generateLimit(rnd, variantsCount)
  const limitTime = generateBoundaryInt(rnd, TIME_MAX)
  return {
    onError,
    log: generateLogOptions(rnd, logFunc),
    parallel: generateParallel(rnd, options.parallel, PARALLEL_MAX),
    cycles: generateBoundaryInt(rnd, options.cyclesMax),
    getSeed: generateSeedFunc(rnd, options.withSeed),
    iterationModes: generateModes(
      rnd,
      variantsCount,
      options.cyclesMax,
      options.attemptsPerVariantMax,
      options.modesCountMax,
      options.modeType,
    ),
    findBestError: generateFindBestErrorOptions(
      rnd,
      options.findBestError,
      options.withEquals,
      options.limitArgOnError,
      options.includeErrorVariant,
      options.dontThrowIfError,
      argKeys,
      template,
    ),
    limitTests: limitTests === 0 ? void 0 : limitTests,
    limitTime: limitTime === 0 ? void 0 : limitTime,
  }
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

// region Main

async function executeStressTest(options: StressTestArgs): Promise<void> {
  const rnd = new Random(options.seed)

  // Generate template
  const template = generateTemplate(
    rnd,
    options.argsCountMax,
    options.valuesPerArgMax,
    options.valuesCountMax,
    options.argType,
    options.valueType,
  )
  const argKeys = Object.keys(template)

  // Count all variants by iterating through all combinations
  let variantsCount = 0
  function countVariants(argIndex: number, args: TestArgs): void {
    if (argIndex >= argKeys.length) {
      variantsCount++
      return
    }
    const key = argKeys[argIndex]
    const templateValue = template[key]
    const values =
      typeof templateValue === 'function' ? templateValue(args) : templateValue
    for (let i = 0, len = values.length; i < len; i++) {
      args[key] = values[i]
      countVariants(argIndex + 1, args)
    }
    delete args[key]
  }
  countVariants(0, {})

  // Generate run options and run test
  const runOptions = generateRunOptions(
    rnd,
    options,
    argKeys,
    template,
    variantsCount,
    logFunc,
    onError,
  )

  // Generate error index
  const errorIndex = generateErrorIndex(
    rnd,
    options.errorPosition,
    variantsCount,
  )
  const retriesToError = generateBoundaryInt(rnd, options.retriesToErrorMax)

  const callCountMax = 0 // TODO: calculate it in separate helper function

  // Tracking state
  let callCount = 0
  let errorAttempts = 0
  let lastError: TestError | null = null
  let lastErrorVariantArgs: TestArgs | null = null

  let logStart = false
  let logCompleted = false
  let logProgressCount = 0
  let logModeChanges = 0
  let logErrors = 0
  let logDebugs = 0
  // Log and error callbacks
  function logFunc(type: TestVariantsLogType, message: string): void {
    if (logEnabled) {
      log(`[${type}] ${message}`)
    }
    if (logCompleted) {
      throw new Error(`logFunc: log after completed`)
    }

    if (callCount === 0) {
      if (type !== 'start') {
        throw new Error(`logFunc: first log is not start`)
      }
      logStart = true
      return
    }
    if (type === 'start') {
      throw new Error(`logFunc: start logged multiple times`)
    }
    if (!logStart) {
      throw new Error(`logFunc: log before start`)
    }

    if (type === 'completed') {
      if (logCompleted) {
        throw new Error(`logFunc: completed logged multiple times`)
      }
      logCompleted = true
      return
    }

    if (type === 'progress') {
      logProgressCount++
      return
    }

    if (type === 'modeChange') {
      logModeChanges++
      return
    }

    if (type === 'error') {
      logErrors++
      return
    }

    if (type === 'debug') {
      logDebugs++
      return
    }

    throw new Error(`logFunc: unknown log type "${type}"`)
  }

  let onErrorCount = 0
  function onError(event: {
    error: unknown
    args: TestArgs
    tests: number
  }): void {
    if (onErrorCount > 0 && !runOptions.findBestError) {
      throw new Error(`onError called multiple times`)
    }
    onErrorCount++
    if (event.args !== lastErrorVariantArgs) {
      throw new Error(`onError: args do not match errorVariantArgs`)
    }
    if (event.tests !== callCount) {
      throw new Error(
        `onError: tests ${event.tests} !== callCount ${callCount}`,
      )
    }
    if (event.error !== lastError) {
      throw new Error(`onError: error does not match`)
    }
  }

  // Create test function
  const testFunc = createTestVariants(function innerTest(args: TestArgs): void {
    if (callCount > callCountMax) {
      throw new Error(
        `testFunc: callCount ${callCount} exceeded max ${callCountMax}`,
      )
    }
    deepFreezeJsonLike(args)
    callCount++

    // Check if this is the error variant
    const isErrorVariant = errorIndex != null && callCount === errorIndex + 1
    if (isErrorVariant) {
      errorAttempts++
      if (errorAttempts > retriesToError) {
        errorAttempts = 0
        lastErrorVariantArgs = args
        lastError = new TestError(`Test error at variant ${callCount - 1}`)
        throw lastError
      }
    }
  })

  const result = await testFunc(template)(runOptions)
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
