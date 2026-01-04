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
import { formatAny, Random } from '@flemist/simple-utils'
import type { ModeChangeEvent, TestVariantsLogType } from '../types'
import { AbortControllerFast } from '@flemist/abort-controller-fast'
import { TimeControllerMock } from '@flemist/time-controller'
import { isLogEnabled, runWithLogs } from './log'
import { StressTestArgs, TestArgs } from './types'
import { deepFreezeJsonLike } from './helpers/deepFreezeJsonLike'
import { forEachVariant } from './helpers/forEachVariant'
import { generateBoundaryInt } from './generators/primitives'
import { generateTemplate } from './generators/template'
import { generateRunOptions } from './generators/run'
import { generateErrorVariantIndex } from './generators/testFunc'
import { estimateCallCount } from './estimations/estimateCallCount'
// import { ITERATIONS_SYNC, ITERATIONS_ASYNC } from './constants'
// import { estimateModeChanges } from './estimations/estimateModeChanges'
// import { LogInvariant } from './invariants/LogInvariant'
// import { ErrorBehaviorInvariant } from './invariants/ErrorBehaviorInvariant'
// import { IterationsInvariant } from './invariants/IterationsInvariant'
// import { ParallelInvariant } from './invariants/ParallelInvariant'
import { CallCountInvariant } from './invariants/CallCountInvariant'
// import { OnErrorInvariant } from './invariants/OnErrorInvariant'
// import { OnModeChangeInvariant } from './invariants/OnModeChangeInvariant'
// import { CallOptionsInvariant } from './invariants/CallOptionsInvariant'
import { ErrorVariantController } from './helpers/ErrorVariantController'
import { CallController } from './helpers/CallController'
import { runWithTimeController } from './helpers/runWithTimeController'
import { log } from 'src/common/helpers/log'
import { getVariantArgs } from 'src/common/test-variants/-test/helpers/getVariantArgs'

async function executeStressTest(options: StressTestArgs): Promise<void> {
  // region generate test parameters
  const rnd = new Random(options.seed)

  const template = generateTemplate(rnd, options)
  const argKeys = Object.keys(template)

  const variantsCount = forEachVariant(template, argKeys)
  const errorVariantIndex = generateErrorVariantIndex(
    rnd,
    options,
    variantsCount,
  )
  const variants = getVariantArgs(
    template,
    argKeys,
    variantsCount,
    errorVariantIndex,
  )
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

  // endregion

  const abortController = new AbortControllerFast()
  const abortSignal = abortController.signal
  const timeController = new TimeControllerMock()

  const callCountRange = estimateCallCount(variantsCount, runOptions)
  // const _iterationModes = runOptions.iterationModes ?? MODES_DEFAULT
  // const modeChangesRange = estimateModeChanges(
  //   iterationModes,
  //   callCountRange[1],
  // )

  // Initialize controllers
  const callController = new CallController(
    options.async,
    options.delay,
    abortSignal,
    timeController,
  )
  const errorVariantController = new ErrorVariantController(
    variants.error?.args,
    retriesToError,
  )

  // Initialize invariants
  const callCountInvariant = new CallCountInvariant(callCountRange)
  // const parallelInvariant = new ParallelInvariant(runOptions.parallel)
  // const logInvariant = new LogInvariant(
  //   runOptions.log,
  //   modeChangesRange,
  //   () => callController.callCount,
  // )
  // const onErrorInvariant = new OnErrorInvariant(!!runOptions.findBestError)
  // const onModeChangeInvariant = new OnModeChangeInvariant(
  //   iterationModes,
  //   modeChangesRange,
  // )
  // const errorBehaviorInvariant = new ErrorBehaviorInvariant(
  //   runOptions.findBestError,
  //   errorVariantIndex,
  //   retriesToError,
  // )
  // const iterationsInvariant = new IterationsInvariant(
  //   ITERATIONS_SYNC,
  //   ITERATIONS_ASYNC,
  //   options.async,
  // )
  // const callOptionsInvariant = new CallOptionsInvariant(
  //   abortSignal,
  //   timeController,
  //   runOptions.limitTime,
  // )

  function logFunc(_type: TestVariantsLogType, _message: string): void {
    if (isLogEnabled()) {
      log(`[${_type}] ${_message}`)
    }
    // logInvariant.onLog(type, message)
  }

  function onError(_event: {
    error: unknown
    args: TestArgs
    tests: number
  }): void {
    // onErrorInvariant.onError(
    //   event,
    //   errorVariantController.errorVariantArgs,
    //   callController.callCount,
    //   errorVariantController.lastError,
    // )
  }

  function onModeChange(_event: ModeChangeEvent): void {
    // onModeChangeInvariant.onModeChange(event, callController.callCount)
  }

  // Create test function
  const testFunc = createTestVariants(function innerTest(
    args: TestArgs,
    _callOptions,
  ) {
    // callOptionsInvariant.onCall(callOptions)
    deepFreezeJsonLike(args)

    return callController.call(
      () => {
        callCountInvariant.onCall(callController.callCount)
        // parallelInvariant.onCallStart()
      },
      () => {
        // parallelInvariant.onCallEnd()
        errorVariantController.onCall(args)
      },
    )
  })

  const { result, thrownError } = await runWithTimeController(
    timeController,
    () =>
      testFunc(template)({
        ...runOptions,
        abortSignal,
        timeController,
      }),
  )

  if (isLogEnabled()) {
    if (result != null) {
      log('<result>')
      log(formatAny(result))
      log('</result>')
    } else {
      log('<noResult/>')
    }
    if (thrownError) {
      log('<thrownError>')
      log(formatAny(thrownError))
      log('</thrownError>')
    } else {
      log('<noThrownError/>')
    }
  }

  // Validate using invariants
  const callCount = callController.callCount
  // const lastError = errorVariantController.lastError

  // errorBehaviorInvariant.validate(callCount, thrownError, lastError, result)
  // iterationsInvariant.validate(callCount, result)
  // logInvariant.validateFinal(callCount, timeController.now(), lastError)
  // parallelInvariant.validateFinal(callCount, options.async)
  // onModeChangeInvariant.validateFinal(callCount)
  // onErrorInvariant.validateFinal(lastError)
  callCountInvariant.validateFinal(callCount)

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
