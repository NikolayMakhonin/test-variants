import type { Obj } from '@flemist/simple-utils'
import type { TestVariantsTemplates } from './iterator/types'
import { resolveLogOptions } from './log/logOptions'
import type { TestVariantsTest } from './run/types'
import { createTestRun } from './createTestRun'
import { testVariantsIterator } from './testVariantsIterator'
import { testVariantsRun } from './testVariantsRun'
import type { TestVariantsSetArgs } from './types'

export function createTestVariants<Args extends Obj>(
  test: TestVariantsTest<Args>,
): TestVariantsSetArgs<Args> {
  return function testVariantsArgs(args) {
    return async function testVariantsCall(options) {
      const logOptions = resolveLogOptions(options?.log)
      const testRun = createTestRun<Args>(test, {
        onError: options?.onError,
        log: logOptions,
      })

      // Extended templates include extra args beyond Args; iterator accepts base Args structure
      const variantsIterator = testVariantsIterator<Args>({
        argsTemplates: args as TestVariantsTemplates<Args>,
        getSeed: options?.getSeed,
        iterationModes: options?.iterationModes,
        equals: options?.findBestError?.equals,
        limitArgOnError: options?.findBestError?.limitArgOnError,
        includeErrorVariant: options?.findBestError?.includeErrorVariant,
        timeController: options?.timeController,
        log: logOptions,
      })

      return testVariantsRun(testRun, variantsIterator, options)
    }
  }
}
