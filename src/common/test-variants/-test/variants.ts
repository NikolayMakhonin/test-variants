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
import { Random } from '@flemist/simple-utils'
import { log } from 'src/common/helpers/log'
import type {
  FindBestErrorOptions,
  ModeChangeEvent,
  ModeConfig,
  TestVariantsLogOptions,
  TestVariantsLogType,
  TestVariantsRunOptions,
  TestVariantsRunResult,
} from '../types'
import {
  delay,
  isPromiseLike,
  waitTimeControllerMock,
} from '@flemist/async-utils'
import { AbortControllerFast } from '@flemist/abort-controller-fast'
import { TimeControllerMock } from '@flemist/time-controller'
import { isLogEnabled, runWithLogs } from './log'
import { StressTestArgs, TestArgs } from './types'
import { LIMIT_MAX } from './constants'
import { deepFreezeJsonLike } from './helpers/deepFreezeJsonLike'
import { forEachVariant, getVariantArgsByIndex } from './helpers/forEachVariant'
import { TestError } from './helpers/TestError'
import { generateBoundaryInt } from './generators/primitives'
import { generateTemplate } from './generators/template'
import { generateRunOptions } from './generators/run'
import { generateErrorVariantIndex } from './generators/testFunc'

// region Invariants

// region LogInvariant

/**
 * Validates log callback behavior
 *
 * ## Applicability
 * Active when log options are provided to runOptions.
 * Validates every log callback invocation during test execution.
 *
 * ## Validated Rules
 * - Each log type is called only when its corresponding option is enabled
 * - 'start' log is called exactly once before any test execution
 * - 'completed' log is called exactly once at the end
 * - No logs occur after 'completed'
 * - 'progress' and 'error' logs occur only after at least one test call
 * - 'modeChange' and 'debug' logs can occur before test calls
 */
class LogInvariant {
  private logStart = false
  private logCompleted = false
  private logProgressCount = 0
  private logModeChanges = 0
  private logErrors = 0
  private logDebugs = 0

  private readonly startEnabled: boolean
  private readonly completedEnabled: boolean
  private readonly progressEnabled: boolean
  private readonly modeChangeEnabled: boolean
  private readonly errorEnabled: boolean
  private readonly debugEnabled: boolean
  private readonly getCallCount: () => number

  constructor(
    logOptions: TestVariantsLogOptions | boolean | undefined | null,
    getCallCount: () => number,
  ) {
    this.getCallCount = getCallCount
    if (typeof logOptions === 'boolean') {
      this.startEnabled = logOptions
      this.completedEnabled = logOptions
      this.progressEnabled = logOptions
      this.modeChangeEnabled = logOptions
      this.errorEnabled = logOptions
      this.debugEnabled = logOptions
    } else {
      this.startEnabled = !!logOptions?.start
      this.completedEnabled = !!logOptions?.completed
      this.progressEnabled = logOptions?.progress !== false
      this.modeChangeEnabled = !!logOptions?.modeChange
      this.errorEnabled = !!logOptions?.error
      this.debugEnabled = !!logOptions?.debug
    }
  }

  onLog(type: TestVariantsLogType, message: string): void {
    if (isLogEnabled()) {
      log(`[${type}] ${message}`)
    }
    if (this.logCompleted) {
      throw new Error(`logFunc: log after completed`)
    }

    if (type === 'start') {
      if (this.logStart) {
        throw new Error(`logFunc: start logged multiple times`)
      }
      if (!this.startEnabled) {
        throw new Error(`logFunc: start log when not enabled`)
      }
      this.logStart = true
      return
    }

    if (type === 'modeChange') {
      if (!this.modeChangeEnabled) {
        throw new Error(`logFunc: modeChange log when not enabled`)
      }
      this.logModeChanges++
      return
    }

    if (type === 'debug') {
      if (!this.debugEnabled) {
        throw new Error(`logFunc: debug log when not enabled`)
      }
      this.logDebugs++
      return
    }

    if (type === 'completed') {
      if (this.logCompleted) {
        throw new Error(`logFunc: completed logged multiple times`)
      }
      if (!this.completedEnabled) {
        throw new Error(`logFunc: completed log when not enabled`)
      }
      this.logCompleted = true
      return
    }

    if (this.getCallCount() === 0) {
      throw new Error(`logFunc: log before test started`)
    }

    if (type === 'progress') {
      if (!this.progressEnabled) {
        throw new Error(`logFunc: progress log when not enabled`)
      }
      this.logProgressCount++
      return
    }

    if (type === 'error') {
      if (!this.errorEnabled) {
        throw new Error(`logFunc: error log when not enabled`)
      }
      this.logErrors++
      return
    }

    throw new Error(`logFunc: unknown log type "${type}"`)
  }

  /**
   * Validates final log state after test execution
   *
   * ## Applicability
   * Call after test execution completes, only when debug logging is disabled
   */
  validateFinal(
    callCount: number,
    logProgressOption: number | boolean | undefined | null,
    elapsedTime: number,
    iterationModes: readonly ModeConfig[] | undefined | null,
    lastError: Error | null,
  ): void {
    if (this.startEnabled && !this.logStart) {
      throw new Error(`Start log expected but not logged`)
    }
    if (this.completedEnabled && !this.logCompleted) {
      throw new Error(`Completed log expected but not logged`)
    }
    if (
      this.progressEnabled &&
      typeof logProgressOption === 'number' &&
      callCount > 0
    ) {
      const logProgressExpected =
        logProgressOption === 0
          ? callCount
          : Math.floor(elapsedTime / logProgressOption)
      if (this.logProgressCount !== logProgressExpected) {
        throw new Error(
          `Progress log count ${this.logProgressCount} !== expected ${logProgressExpected}`,
        )
      }
    }
    if (this.modeChangeEnabled && iterationModes) {
      const modeChangesMin = estimateModeChangesMin(iterationModes, callCount)
      if (this.logModeChanges < modeChangesMin) {
        throw new Error(
          `Mode changes log count ${this.logModeChanges} < expected minimum ${modeChangesMin}`,
        )
      }
    }
    if (this.errorEnabled && lastError != null && this.logErrors <= 0) {
      throw new Error(`Error log expected but not logged`)
    }
  }
}

// endregion

// region ErrorBehaviorInvariant

/**
 * Validates error handling behavior
 *
 * ## Applicability
 * Active for all test executions. Validates error propagation based on
 * findBestError and dontThrowIfError options.
 *
 * ## Validated Rules
 * - When error expected and findBestError.dontThrowIfError=true: no error thrown, bestError populated
 * - When error expected and findBestError enabled: error thrown after finding best
 * - When error expected without findBestError: error thrown immediately
 * - When no error expected: no error thrown, bestError is null
 */
class ErrorBehaviorInvariant {
  constructor(
    private readonly findBestError: FindBestErrorOptions | undefined | null,
  ) {}

  /**
   * Validates error behavior after test execution
   *
   * @param errorExpected - Whether an error was expected based on errorIndex and retriesToError
   * @param thrownError - The error that was thrown (or null)
   * @param lastError - The last TestError that occurred (or null)
   * @param result - The test result (may be null if error thrown)
   */
  validate(
    errorExpected: boolean,
    thrownError: unknown,
    lastError: TestError | null,
    result: TestVariantsRunResult<TestArgs> | null,
  ): void {
    const dontThrowIfError = this.findBestError?.dontThrowIfError ?? false

    if (errorExpected) {
      if (lastError == null) {
        throw new Error(`Error was expected but lastError is null`)
      }
      if (this.findBestError && dontThrowIfError) {
        if (thrownError != null) {
          throw new Error(`Error was thrown but dontThrowIfError=true`)
        }
        if (result?.bestError == null) {
          throw new Error(`bestError is null but error was expected`)
        }
        if (result.bestError.error !== lastError) {
          throw new Error(`bestError.error is not TestError`)
        }
      } else if (this.findBestError) {
        if (thrownError == null) {
          throw new Error(`Error expected but not thrown (findBestError=true)`)
        }
        if (thrownError !== lastError) {
          throw new Error(`Thrown error does not match lastError`)
        }
      } else {
        if (thrownError == null) {
          throw new Error(`Error expected but not thrown`)
        }
        if (thrownError !== lastError) {
          throw new Error(`Thrown error does not match lastError`)
        }
      }
    } else {
      if (thrownError != null) {
        throw new Error(`No error expected but error was thrown`)
      }
      if (result?.bestError != null) {
        throw new Error(`bestError is set but no error was expected`)
      }
    }
  }
}

// endregion

// region IterationsInvariant

/**
 * Validates iteration count in test result
 *
 * ## Applicability
 * Active when test completes without thrown error.
 * Validates result.iterations matches expected calculation.
 *
 * ## Validated Rules
 * - iterations >= 0
 * - iterations equals sum of (iterationsSync + iterationsAsync) from all test calls
 */
class IterationsInvariant {
  private readonly iterationsSync: number
  private readonly iterationsAsync: number

  constructor(iterationsSync: number, iterationsAsync: number) {
    this.iterationsSync = iterationsSync
    this.iterationsAsync = iterationsAsync
  }

  /**
   * Validates iteration count after test execution
   *
   * @param callCount - Number of test function calls
   * @param result - The test result
   * @param thrownError - Whether an error was thrown
   */
  validate(
    callCount: number,
    result: TestVariantsRunResult<TestArgs>,
    thrownError: boolean,
  ): void {
    if (result.iterations < 0) {
      throw new Error(`iterations must be >= 0, got ${result.iterations}`)
    }

    if (!thrownError) {
      const iterationsExpected =
        callCount * this.iterationsSync + callCount * this.iterationsAsync
      if (result.iterations !== iterationsExpected) {
        throw new Error(
          `iterations ${result.iterations} !== ${iterationsExpected}`,
        )
      }
    }
  }
}

// endregion

// region ParallelInvariant

/**
 * Validates parallel execution behavior
 *
 * ## Applicability
 * Active when callCount >= 2. Validates concurrency matches configuration.
 *
 * ## Validated Rules
 * - Sync-only tests (isAsync=false) never have parallel execution
 * - With parallel > 1 and async calls, actual parallelism occurs
 * - Concurrent calls never exceed parallelLimit
 */
class ParallelInvariant {
  private concurrentCalls = 0
  private maxConcurrentCalls = 0

  constructor(private readonly parallelLimit: number) {}

  onCallStart(): void {
    this.concurrentCalls++
    if (this.concurrentCalls > this.maxConcurrentCalls) {
      this.maxConcurrentCalls = this.concurrentCalls
    }
    if (this.concurrentCalls > this.parallelLimit) {
      throw new Error(
        `testFunc: concurrent calls ${this.concurrentCalls} exceeded parallel limit ${this.parallelLimit}`,
      )
    }
  }

  onCallEnd(): void {
    this.concurrentCalls--
  }

  /**
   * Validates parallel execution after test completion
   *
   * @param callCount - Total number of test function calls
   * @param isAsync - Whether async execution was used (null = mixed)
   */
  validateFinal(callCount: number, isAsync: boolean | null): void {
    if (callCount >= 2) {
      if (isAsync === false) {
        if (this.maxConcurrentCalls > 1) {
          throw new Error(
            `Sync tests should not have parallel execution but maxConcurrentCalls=${this.maxConcurrentCalls}`,
          )
        }
      } else if (this.parallelLimit > 1) {
        if (this.maxConcurrentCalls < 2) {
          throw new Error(
            `Parallel execution expected (parallel=${this.parallelLimit}, calls=${callCount}) but maxConcurrentCalls=${this.maxConcurrentCalls}`,
          )
        }
      }
    }
  }
}

// endregion

// region CallCountInvariant

/**
 * Validates call count bounds
 *
 * ## Applicability
 * Active for all test executions. Validates every test function call.
 *
 * ## Validated Rules
 * - callCount never exceeds callCountMax
 */
class CallCountInvariant {
  private callCount = 0

  constructor(private readonly callCountMax: number) {}

  onCall(): number {
    if (this.callCount > this.callCountMax) {
      throw new Error(
        `testFunc: callCount ${this.callCount} exceeded max ${this.callCountMax}`,
      )
    }
    return ++this.callCount
  }

  getCallCount(): number {
    return this.callCount
  }
}

// endregion

// region OnErrorInvariant

/**
 * Validates onError callback behavior
 *
 * ## Applicability
 * Active when errors occur during test execution.
 * Validates onError callback is called correctly.
 *
 * ## Validated Rules
 * - Without findBestError: onError called at most once
 * - With findBestError: onError can be called multiple times
 * - args parameter matches the error variant args
 * - tests parameter matches callCount
 * - error parameter matches the thrown error
 */
class OnErrorInvariant {
  private onErrorCount = 0

  constructor(private readonly findBestErrorEnabled: boolean) {}

  onError(
    event: { error: unknown; args: TestArgs; tests: number },
    expectedArgs: TestArgs | null,
    expectedCallCount: number,
    expectedError: TestError | null,
  ): void {
    if (this.onErrorCount > 0 && !this.findBestErrorEnabled) {
      throw new Error(`onError called multiple times`)
    }
    this.onErrorCount++
    if (event.args !== expectedArgs) {
      throw new Error(`onError: args do not match errorVariantArgs`)
    }
    if (event.tests !== expectedCallCount) {
      throw new Error(
        `onError: tests ${event.tests} !== callCount ${expectedCallCount}`,
      )
    }
    if (event.error !== expectedError) {
      throw new Error(`onError: error does not match`)
    }
  }
}

// endregion

// region OnModeChangeInvariant

/**
 * Validates onModeChange callback behavior
 *
 * ## Applicability
 * Active when iterationModes are configured.
 * Validates onModeChange callback is called correctly.
 *
 * ## Validated Rules
 * - onModeChange called at start with initial mode
 * - onModeChange called when mode switches
 * - mode parameter is valid ModeConfig from iterationModes
 * - modeIndex parameter is within range
 * - tests parameter matches callCount at mode change
 */
class OnModeChangeInvariant {
  private modeChangeCount = 0
  private lastModeIndex = -1

  constructor(private readonly iterationModes: readonly ModeConfig[]) {}

  onModeChange(event: ModeChangeEvent, expectedCallCount: number): void {
    this.modeChangeCount++

    // Validate modeIndex is in valid range
    if (event.modeIndex < 0 || event.modeIndex >= this.iterationModes.length) {
      throw new Error(
        `onModeChange: modeIndex ${event.modeIndex} out of range [0, ${this.iterationModes.length})`,
      )
    }

    // Validate mode matches iterationModes[modeIndex]
    const expectedMode = this.iterationModes[event.modeIndex]
    if (event.mode !== expectedMode) {
      throw new Error(
        `onModeChange: mode does not match iterationModes[${event.modeIndex}]`,
      )
    }

    // Validate tests count
    if (event.tests !== expectedCallCount) {
      throw new Error(
        `onModeChange: tests ${event.tests} !== callCount ${expectedCallCount}`,
      )
    }

    this.lastModeIndex = event.modeIndex
  }

  getModeChangeCount(): number {
    return this.modeChangeCount
  }

  validateFinal(callCount: number): void {
    if (callCount > 0 && this.modeChangeCount === 0) {
      throw new Error(`onModeChange: expected at least one mode change`)
    }
    const modeChangesMin = estimateModeChangesMin(
      this.iterationModes,
      callCount,
    )
    if (this.modeChangeCount < modeChangesMin) {
      throw new Error(
        `onModeChange: count ${this.modeChangeCount} < expected minimum ${modeChangesMin}`,
      )
    }
  }
}

// endregion

// endregion

// region Generators

const MODES_DEFAULT: readonly ModeConfig[] = Object.freeze([
  { mode: 'forward' },
])

function estimateModeChangesMin(
  modes: readonly ModeConfig[],
  callCount: number,
): number {
  if (callCount === 0) {
    return 0
  }

  const modesCount = modes.length
  if (modesCount === 0) {
    return 0
  }

  // At least 1 mode change when first mode starts
  if (modesCount === 1) {
    return 1
  }

  // Find minimum limitTests across modes
  let minLimit = Infinity
  for (let i = 0; i < modesCount; i++) {
    const limit = modes[i].limitTests
    if (limit != null && limit > 0 && limit < minLimit) {
      minLimit = limit
    }
  }

  if (minLimit === Infinity) {
    // No limits - only 1 mode change (first mode runs until completion)
    return 1
  }

  // Lower bound: ceil(callCount / minLimit) mode switches
  return Math.min(Math.ceil(callCount / minLimit), callCount)
}

function estimateCallCountMax(
  variantsCount: number,
  runOptions: TestVariantsRunOptions<TestArgs>,
): number {
  if (variantsCount === 0) {
    return 0
  }

  let total: number

  if (runOptions.findBestError) {
    total = LIMIT_MAX
  } else {
    const globalCycles = Math.max(1, runOptions.cycles ?? 1)
    const modes = runOptions.iterationModes ?? MODES_DEFAULT

    // Calculate max calls per global cycle (all modes once)
    let maxPerGlobalCycle = 0
    for (let i = 0, len = modes.length; i < len; i++) {
      const mode = modes[i]
      switch (mode.mode) {
        case 'forward':
        case 'backward': {
          const modeCycles = mode.cycles ?? 1
          const attempts = mode.attemptsPerVariant ?? 1
          let modeMax = variantsCount * modeCycles * attempts
          // Apply mode limitTests
          if (mode.limitTests != null) {
            modeMax = Math.min(modeMax, mode.limitTests)
          }
          maxPerGlobalCycle += modeMax
          break
        }
        case 'random': {
          let modeMax = variantsCount
          // Apply mode limitTests
          if (mode.limitTests != null) {
            modeMax = Math.min(modeMax, mode.limitTests)
          }
          maxPerGlobalCycle += modeMax
          break
        }
        default: {
          throw new Error(`Unknown mode type: ${(mode as any).mode}`)
        }
      }
    }

    total = maxPerGlobalCycle * globalCycles
  }

  if (runOptions.limitTests != null) {
    total = Math.min(total, runOptions.limitTests)
  }

  return total
}

// endregion

// region Main

async function executeStressTest(options: StressTestArgs): Promise<void> {
  const rnd = new Random(options.seed)

  const template = generateTemplate(rnd, options)
  const argKeys = Object.keys(template)

  const variantsCount = forEachVariant(template, argKeys)
  const errorVariantIndex = generateErrorVariantIndex(
    rnd,
    options,
    variantsCount,
  )
  const errorVariantArgs =
    errorVariantIndex == null
      ? null
      : getVariantArgsByIndex(template, argKeys, errorVariantIndex)
  const retriesToError = generateBoundaryInt(rnd, options.retriesToErrorMax)

  const runOptions = generateRunOptions(
    rnd,
    options,
    template,
    argKeys,
    variantsCount,
    logFunc,
    onError,
    onModeChange,
  )

  const callCountMax = estimateCallCountMax(variantsCount, runOptions)

  // Tracking state
  let errorAttempts = 0
  let lastError: TestError | null = null
  let lastErrorVariantArgs: TestArgs | null = null

  // Initialize invariants
  const callCountInvariant = new CallCountInvariant(callCountMax)
  const parallelLimit =
    runOptions.parallel === true
      ? Infinity
      : typeof runOptions.parallel === 'number'
        ? runOptions.parallel
        : 1
  const parallelInvariant = new ParallelInvariant(parallelLimit)
  const logInvariant = new LogInvariant(runOptions.log, () =>
    callCountInvariant.getCallCount(),
  )
  const onErrorInvariant = new OnErrorInvariant(!!runOptions.findBestError)
  const onModeChangeInvariant = new OnModeChangeInvariant(
    runOptions.iterationModes ?? MODES_DEFAULT,
  )
  const errorBehaviorInvariant = new ErrorBehaviorInvariant(
    runOptions.findBestError,
  )
  const iterationsInvariant = new IterationsInvariant(10, 1000000)

  function logFunc(type: TestVariantsLogType, message: string): void {
    logInvariant.onLog(type, message)
  }

  function onError(event: {
    error: unknown
    args: TestArgs
    tests: number
  }): void {
    onErrorInvariant.onError(
      event,
      lastErrorVariantArgs,
      callCountInvariant.getCallCount(),
      lastError,
    )
  }

  function onModeChange(event: ModeChangeEvent): void {
    onModeChangeInvariant.onModeChange(event, callCountInvariant.getCallCount())
  }

  const isAsync = options.async
  const shouldDelay = options.delay
  const abortController = new AbortControllerFast()
  const abortSignal = abortController.signal
  const timeController = new TimeControllerMock()
  const limitTime = runOptions.limitTime

  // Create test function
  const testFunc = createTestVariants(function innerTest(
    args: TestArgs,
    callOptions,
  ) {
    if (callOptions.abortSignal !== abortSignal) {
      throw new Error(`testFunc: abortSignal mismatch`)
    }
    if (callOptions.abortSignal.aborted) {
      throw new Error(`testFunc: call after aborted`)
    }
    if (callOptions.timeController !== timeController) {
      throw new Error(`testFunc: timeController mismatch`)
    }
    if (limitTime != null && timeController.now() > limitTime) {
      throw new Error(`testFunc: aborted due to time limit`)
    }

    const callCount = callCountInvariant.onCall()
    deepFreezeJsonLike(args)

    parallelInvariant.onCallStart()

    function call() {
      parallelInvariant.onCallEnd()

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

      return { iterationsSync: 10, iterationsAsync: 1000000 }
    }

    if ((isAsync == null && callCount % 2 === 0) || isAsync) {
      if (shouldDelay) {
        return delay(1, abortSignal, timeController).then(call)
      }
      return Promise.resolve().then(() => call())
    } else {
      const result = call()
      return result
    }
  })

  let result: TestVariantsRunResult<TestArgs>
  let thrownError: unknown = null
  try {
    const resultPromise = testFunc(template)({
      ...runOptions,
      abortSignal,
      timeController,
    })
    if (isPromiseLike(resultPromise)) {
      result = await waitTimeControllerMock(timeController, resultPromise)
    } else {
      result = resultPromise
    }
  } catch (err) {
    if (!(err instanceof TestError)) {
      throw err
    }
    thrownError = err
    result = null as any
  }

  // Validate using invariants
  const callCount = callCountInvariant.getCallCount()
  const errorExpected =
    (errorIndex != null && retriesToError === 0 && callCount > errorIndex) ||
    !!lastError

  errorBehaviorInvariant.validate(errorExpected, thrownError, lastError, result)

  if (result != null) {
    iterationsInvariant.validate(callCount, result, thrownError != null)
  }

  if (!isLogEnabled()) {
    const logProgressOption =
      typeof runOptions.log === 'boolean'
        ? runOptions.log
        : runOptions.log?.progress
    logInvariant.validateFinal(
      callCount,
      logProgressOption,
      timeController.now(),
      runOptions.iterationModes,
      lastError,
    )
  }

  parallelInvariant.validateFinal(callCount, isAsync)
  onModeChangeInvariant.validateFinal(callCount)

  abortController.abort()
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
