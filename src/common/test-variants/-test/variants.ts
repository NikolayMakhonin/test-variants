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

import { createTestVariants as createTestVariantsOld } from '#this'
import { createTestVariants } from 'src/common/test-variants/createTestVariants'
import { Random } from '@flemist/simple-utils'
import type { ModeChangeEvent, TestVariantsLogType } from '../types'
import { isLogEnabled, runWithLogs } from './log'
import { StressTestArgs, TestArgs } from './types'
import { deepFreezeJsonLike } from './helpers/deepFreezeJsonLike'
import { forEachVariant } from './helpers/forEachVariant'
import { generateBoolean, generateBoundaryInt } from './generators/primitives'
import { generateTemplate } from './generators/template'
import { generateRunOptions } from './generators/run'
import { generateErrorVariantIndex } from './generators/testFunc'
import { estimateCallCount } from './estimations/estimateCallCount'
// import { ITERATIONS_SYNC, ITERATIONS_ASYNC } from './constants'
// import { estimateModeChanges } from './estimations/estimateModeChanges'
// import { LogInvariant } from './invariants/LogInvariant'
import { ErrorBehaviorInvariant } from './invariants/ErrorBehaviorInvariant'
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
  const withDelay = generateBoolean(rnd, options.withDelay)

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

  const callCountRange = estimateCallCount(
    options,
    runOptions,
    variantsCount,
    errorVariantIndex,
    withDelay,
  )
  // const _iterationModes = runOptions.iterationModes ?? MODES_DEFAULT
  // const modeChangesRange = estimateModeChanges(
  //   iterationModes,
  //   callCountRange[1],
  // )

  if (isLogEnabled()) {
    log('<template>')
    log(template)
    log('</template>')
    log('<runOptions>')
    log(runOptions)
    log('</runOptions>')
    log('<expected>')
    log('retriesToError: ', retriesToError)
    log('errorVariantIndex: ', errorVariantIndex)
    log('variants: ', variants)
    log('</expected>')
    log('<estimation>')
    log('callCountRange: ', callCountRange)
    // log('modeChangesRange: ', modeChangesRange)
    log('</estimation>')
  }

  // Initialize controllers
  const callController = new CallController(options.async, withDelay)
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
  const errorBehaviorInvariant = new ErrorBehaviorInvariant(
    options,
    runOptions,
    variantsCount,
    errorVariantIndex,
    retriesToError,
  )
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
    //   errorVariantController.lastThrownError,
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

  const { result, caughtError } = await runWithTimeController(
    callController.timeController,
    () =>
      testFunc(template)({
        ...runOptions,
        abortSignal: callController.abortSignal,
        timeController: callController.timeController,
      }),
  )

  if (isLogEnabled()) {
    if (result != null) {
      log('<result>')
      log(result)
      log('</result>')
    } else {
      log('<noResult/>')
    }
    if (caughtError) {
      log('<caughtError>')
      log(caughtError)
      log('</caughtError>')
    } else {
      log('<noThrownError/>')
    }
  }

  // Validate using invariants
  const callCount = callController.callCount
  const lastThrownError = errorVariantController.lastThrownError

  errorBehaviorInvariant.validate(
    callCount,
    caughtError,
    lastThrownError,
    result,
  )
  // iterationsInvariant.validate(callCount, result)
  // logInvariant.validateFinal(callCount, timeController.now(), lastThrownError)
  // parallelInvariant.validateFinal(callCount, options.async)
  // onModeChangeInvariant.validateFinal(callCount)
  // onErrorInvariant.validateFinal(lastThrownError)
  callCountInvariant.validateFinal(callCount)

  callController.finalize()
}

export const testVariants = createTestVariantsOld(
  async (options: StressTestArgs) => {
    try {
      await executeStressTest(options)
    } catch (err) {
      try {
        await runWithLogs(async () => {
          await executeStressTest(options)
        })
      } catch {
        // ignore because real error is in err variable
      }
      throw err
    }
  },
)
