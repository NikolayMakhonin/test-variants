import {type PromiseOrValue} from '@flemist/async-utils'

import {testVariantsIterable, TestVariantsTemplatesExt} from 'src/test-variants/testVariantsIterable'
import {
  TestVariantsCreateTestRunOptions,
  testVariantsCreateTestRun,
  TestVariantsTest,
} from 'src/test-variants/testVariantsCreateTestRun'
import {testVariantsRun, TestVariantsRunOptions} from 'src/test-variants/testVariantsRun'
import {Obj} from 'src/test-variants/types'
import {testVariantsFindBestError} from 'src/test-variants/testVariantsFindBestError'
import {argsToString} from 'src/test-variants/argsToString'

export type TestVariantsCall<Args extends Obj> = (
  options?: null | TestVariantsRunOptions & TestVariantsCreateTestRunOptions<Args>
) => PromiseOrValue<number>

export type TestVariantsSetArgs<Args extends Obj> = <ArgsExtra extends Obj>(
  args: TestVariantsTemplatesExt<Args, ArgsExtra>
) => TestVariantsCall<Args>

export function createTestVariants<Args extends Obj>(
  test: TestVariantsTest<Args>,
): TestVariantsSetArgs<Args> {
  return function testVariantsArgs(args) {
    let variantsArray: Args[] | null = null
    return async function testVariantsCall(options) {
      const testRun = testVariantsCreateTestRun<Args>(test, {
        onError: options?.onError,
      })

      const variants = variantsArray || testVariantsIterable(args)

      if (options?.findBestError) {
        if (!variantsArray) {
          variantsArray = Array.from(variants)
        }
        const result = await testVariantsFindBestError(
          (index, args) => testRun(index, args, options?.abortSignal ?? null as any),
          variantsArray,
          options.findBestError,
        )
        if (result.index != null) {
          throw new Error(`[test-variants][findBestError] iterations: ${result.iterations}, index: ${result.index}, args: ${argsToString(result.args)}`)
        }
        return result.iterations
      }

      return testVariantsRun<Args>(testRun, variants, options)
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
