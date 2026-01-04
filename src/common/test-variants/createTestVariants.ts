import { type PromiseOrValue } from '@flemist/async-utils'

import { testVariantsCreateTestRun } from './testVariantsCreateTestRun'
import type { TestVariantsTest } from './types'
import { testVariantsRun } from './testVariantsRun'
import type { Obj } from '@flemist/simple-utils'
import { testVariantsIterator } from './testVariantsIterator'
import type {
  TestVariantsRunOptionsInternal,
  TestVariantsResult,
  TestVariantsTemplates,
} from './types'
import { resolveLogOptions } from 'src/common/test-variants/helpers/logOptions'

/** Extended templates type that allows additional args beyond the base Args type */
export type TestVariantsTemplatesExt<
  Args extends Obj,
  ArgsExtra extends Obj,
> = TestVariantsTemplates<{
  [key in keyof ArgsExtra | keyof Args]: key extends keyof Args
    ? Args[key]
    : key extends keyof ArgsExtra
      ? ArgsExtra[key]
      : never
}>

export type TestVariantsCall<Args extends Obj> = <SavedArgs = Args>(
  options?: null | TestVariantsRunOptionsInternal<Args, SavedArgs>,
) => PromiseOrValue<TestVariantsResult<Args>>

export type TestVariantsSetArgs<Args extends Obj> = <ArgsExtra extends Obj>(
  args: TestVariantsTemplatesExt<Omit<Args, 'seed'>, Omit<ArgsExtra, 'seed'>>,
) => TestVariantsCall<Args>

export function createTestVariants<Args extends Obj>(
  test: TestVariantsTest<Args>,
): TestVariantsSetArgs<Args> {
  return function testVariantsArgs(args) {
    return async function testVariantsCall(options) {
      const logOpts = resolveLogOptions(options?.log)
      const testRun = testVariantsCreateTestRun<Args>(test, {
        onError: options?.onError,
        log: logOpts,
      })

      // Extended templates include extra args beyond Args; iterator accepts base Args structure
      const variants = testVariantsIterator<Args>({
        argsTemplates: args as TestVariantsTemplates<Args>,
        getSeed: options?.getSeed,
        iterationModes: options?.iterationModes,
        equals: options?.findBestError?.equals,
        limitArgOnError: options?.findBestError?.limitArgOnError,
        includeErrorVariant: options?.findBestError?.includeErrorVariant,
        timeController: options?.timeController,
        log: logOpts,
      })

      return testVariantsRun(testRun, variants, options)
    }
  }
}
