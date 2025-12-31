import {type PromiseOrValue} from '@flemist/async-utils'

import {
  testVariantsCreateTestRun,
  TestVariantsTest,
  TestVariantsCreateTestRunOptions,
} from 'src/test-variants/testVariantsCreateTestRun'
import {testVariantsRun, TestVariantsRunOptions, TestVariantsRunResult} from 'src/test-variants/testVariantsRun'
import {testVariantsIterator} from 'src/test-variants/testVariantsIterator'
import {Obj, TestVariantsTemplates} from 'src/test-variants/types'

/** Extended templates type that allows additional args beyond the base Args type */
export type TestVariantsTemplatesExt<Args extends Obj, ArgsExtra extends Obj> =
  TestVariantsTemplates<{
    [key in (keyof ArgsExtra | keyof Args)]: key extends keyof Args ? Args[key]
      : key extends keyof ArgsExtra ? ArgsExtra[key]
        : never
  }>

export type TestVariantsCall<Args extends Obj> = <SavedArgs = Args>(
  options?: null | TestVariantsRunOptions<Args, SavedArgs> & TestVariantsCreateTestRunOptions<Args>
) => PromiseOrValue<TestVariantsRunResult<Args>>

export type TestVariantsSetArgs<Args extends Obj> = <ArgsExtra extends Obj>(
  args: TestVariantsTemplatesExt<Omit<Args, 'seed'>, Omit<ArgsExtra, 'seed'>>
) => TestVariantsCall<Args>

export function createTestVariants<Args extends Obj>(
  test: TestVariantsTest<Args>,
): TestVariantsSetArgs<Args> {
  return function testVariantsArgs(args) {
    return async function testVariantsCall(options) {
      const testRun = testVariantsCreateTestRun<Args>(test, {
        onError: options?.onError,
        log    : options?.log,
      })

      const logOpts = options?.log
      const logDebug = logOpts && typeof logOpts === 'object' ? logOpts.debug : false

      const variants = testVariantsIterator<Args>({
        argsTemplates      : args as any,
        getSeed            : options?.getSeed,
        iterationModes     : options?.iterationModes,
        equals             : options?.findBestError?.equals,
        limitArgOnError    : options?.findBestError?.limitArgOnError,
        includeErrorVariant: options?.findBestError?.includeErrorVariant,
        timeController     : options?.timeController,
        logDebug,
      })

      return testVariantsRun(testRun, variants, options)
    }
  }
}
