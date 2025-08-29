import {type IAbortSignalFast} from '@flemist/abort-controller-fast'
import {type PromiseOrValue} from '@flemist/async-utils'

import {testVariantsIterable, TestVariantsTemplatesExt} from 'src/test-variants/testVariantsIterable'
import {TestVariantsCreateTestOptions, testVariantsCreateTestRun} from 'src/test-variants/testVariantsCreateTestRun'
import {testVariantsRun, TestVariantsRunOptions} from 'src/test-variants/testVariantsRun'
import {Obj} from 'src/test-variants/types'

export type TestVariantsCall<Args extends Obj> = (
  options?: null | TestVariantsRunOptions & TestVariantsCreateTestOptions<Args>
) => PromiseOrValue<number>

export type TestVariantsSetArgs<Args extends Obj> = <ArgsExtra extends Obj>(
  args: TestVariantsTemplatesExt<Args, ArgsExtra>
) => TestVariantsCall<Args>

export function createTestVariants<Args extends Obj>(
  test: (args: Args, abortSignal: IAbortSignalFast) => Promise<number|void> | number | void,
): TestVariantsSetArgs<Args> {
  return function testVariantsArgs(args) {
    return function testVariantsCall(options) {
      const testRun = testVariantsCreateTestRun<Args>(test, {
        onError: options?.onError,
      })

      const variants = testVariantsIterable(args)

      return testVariantsRun<Args>(testRun, variants, options)
    }
  }
}
