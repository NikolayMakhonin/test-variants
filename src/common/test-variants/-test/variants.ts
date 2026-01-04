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
import type {
  ModeChangeEvent,
  TestVariantsLogType,
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
import { deepFreezeJsonLike } from './helpers/deepFreezeJsonLike'
import { forEachVariant, getVariantArgsByIndex } from './helpers/forEachVariant'
import { TestError } from './helpers/TestError'
import { generateBoundaryInt } from './generators/primitives'
import { generateTemplate } from './generators/template'
import { generateRunOptions } from './generators/run'
import { generateErrorVariantIndex } from './generators/testFunc'
import {
  estimateCallCount,
  MODES_DEFAULT,
} from './estimations/estimateCallCount'
import { LogInvariant } from './invariants/LogInvariant'
import { ErrorBehaviorInvariant } from './invariants/ErrorBehaviorInvariant'
import { IterationsInvariant } from './invariants/IterationsInvariant'
import { ParallelInvariant } from './invariants/ParallelInvariant'
import { CallCountInvariant } from './invariants/CallCountInvariant'
import { OnErrorInvariant } from './invariants/OnErrorInvariant'
import { OnModeChangeInvariant } from './invariants/OnModeChangeInvariant'

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

  const callCountRange = estimateCallCount(variantsCount, runOptions)

  // Tracking state
  let errorAttempts = 0
  let lastError: TestError | null = null
  let lastErrorVariantArgs: TestArgs | null = null

  // Initialize invariants
  const callCountInvariant = new CallCountInvariant(callCountRange)
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

      const isErrorVariant =
        errorVariantIndex != null && callCount === errorVariantIndex + 1
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
    (errorVariantIndex != null &&
      retriesToError === 0 &&
      callCount > errorVariantIndex) ||
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
  callCountInvariant.validateFinal()

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
