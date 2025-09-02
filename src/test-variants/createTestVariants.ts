import {type PromiseOrValue} from '@flemist/async-utils'

import {testVariantsIterable, TestVariantsTemplatesExt} from 'src/test-variants/testVariantsIterable'
import {
  TestVariantsCreateTestRunOptions,
  testVariantsCreateTestRun,
  TestVariantsTest,
} from 'src/test-variants/testVariantsCreateTestRun'
import {testVariantsRun, TestVariantsRunOptions, TestVariantsRunResult} from 'src/test-variants/testVariantsRun'
import {Obj} from 'src/test-variants/types'

export type TestVariantsCall<Args extends Obj> = (
  options?: null | TestVariantsRunOptions & TestVariantsCreateTestRunOptions<Args>
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
      })

      return testVariantsRun<Args>(testRun, ({
        max,
      }) => {
        return testVariantsIterable({
          argsTemplates         : args,
          argsMaxValues         : max,
          argsMaxValuesExclusive: !!max,
        })[Symbol.iterator]()
      }, options)
    }
  }
}

/*
export class TestVariants<Args extends Obj> {
  private readonly _test: TestVariantsTest<Args>
  test(args: Args, abortSignal: IAbortSignalFast) {
    return this._test(args, abortSignal)
  }

  constructor(
    test: TestVariantsTest<Args>,
  ) {
    this.test = test
  }

  createVariants<ArgsExtra extends Obj>(
    argsTemplates: TestVariantsTemplatesExt<Args, ArgsExtra>,
  ): Iterable<Args> {
    return testVariantsIterable<Args, ArgsExtra>(argsTemplates)
  }

  createTestRun(
    options?: null | TestVariantsCreateTestRunOptions<Args>,
  ) {
    return testVariantsCreateTestRun<Args>(this._test, options)
  }

  testAll<ArgsExtra extends Obj>(
    argsTemplates: TestVariantsTemplatesExt<Args, ArgsExtra>,
  ): TestVariantsCall<Args>
  testAll(
    variants: Iterable<Args>,
  ): TestVariantsCall<Args>
  testAll<ArgsExtra extends Obj>(
    variantsOrTemplates: Iterable<Args> | TestVariantsTemplatesExt<Args, ArgsExtra>,
  ): TestVariantsCall<Args> {
    const variants = Symbol.iterator in variantsOrTemplates
      ? variantsOrTemplates as Iterable<Args>
      : this.createVariants(variantsOrTemplates as TestVariantsTemplatesExt<Args, ArgsExtra>)

    const _this = this

    return function testVariantsCall(
      options?: null | TestVariantsRunOptions & TestVariantsCreateTestRunOptions<Args>,
    ) {
      const testRun = _this.createTestRun({
        onError: options?.onError,
      })

      return testVariantsRun<Args>(testRun, variants, options)
    }
  }
}
*/
