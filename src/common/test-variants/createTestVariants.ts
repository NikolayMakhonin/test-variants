import type { Obj } from '@flemist/simple-utils'
import { timeControllerDefault } from '@flemist/time-controller'
import type { TestVariantsTemplates } from './iterator/types'
import { getMemoryUsage } from './log/getMemoryUsage'
import { resolveLogOptions } from './log/logOptions'
import { createRunState } from './run/createRunState'
import type { TestVariantsTest } from './run/types'
import { createTestRun } from './createTestRun'
import { createVariantsIterator } from './iterator/createVariantsIterator'
import { testVariantsRun } from './testVariantsRun'
import type { ModeChangeEvent, TestVariantsSetArgs } from './types'

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

      const timeController = options?.timeController ?? timeControllerDefault
      const startMemory = getMemoryUsage()
      const state = createRunState(timeController, startMemory)

      const userOnModeChange = options?.onModeChange
      function onModeChange(event: ModeChangeEvent): void {
        state.pendingModeChange = event
        userOnModeChange?.(event)
      }

      // Extended templates include extra args beyond Args; iterator accepts base Args structure
      const variantsIterator = createVariantsIterator<Args>({
        argsTemplates: args as TestVariantsTemplates<Args>,
        getSeed: options?.getSeed,
        iterationModes: options?.iterationModes,
        equals: options?.findBestError?.equals,
        limitArgOnError: options?.findBestError?.limitArgOnError,
        includeErrorVariant: options?.findBestError?.includeErrorVariant,
        timeController,
        onModeChange,
        limitCompletionCount: options?.cycles ?? 1,
        limitTests: options?.limitTests,
        limitTime: options?.limitTime,
      })

      return testVariantsRun(testRun, variantsIterator, state, options)
    }
  }
}
