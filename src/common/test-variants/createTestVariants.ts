import { createTestRun } from './createTestRun'
import type { TestVariantsSetArgs } from './types'
import type { TestVariantsTemplates } from './iterator/types'
import type { TestVariantsTest } from './run/types'
import { testVariantsRun } from './testVariantsRun'
import type { Obj } from '@flemist/simple-utils'
import { testVariantsIterator } from './testVariantsIterator'
import { resolveLogOptions } from './log/logOptions'

export function createTestVariants<Args extends Obj>(
  test: TestVariantsTest<Args>,
): TestVariantsSetArgs<Args> {
  return function testVariantsArgs(args) {
    return async function testVariantsCall(options) {
      const logOpts = resolveLogOptions(options?.log)
      const testRun = createTestRun<Args>(test, {
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
