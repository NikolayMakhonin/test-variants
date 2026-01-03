export {
  type GenerateErrorVariantFilePathOptions,
  type GetSeedParams,
  type LimitArgOnError,
  type LimitArgOnErrorOptions,
  type ModeConfig,
  type SaveErrorVariantsOptions,
  type TestVariantsBestError,
  type TestVariantsFindBestErrorOptions,
  type TestVariantsLogOptions,
  type TestVariantsRunOptions,
  type TestVariantsRunResult,
  type TestVariantsTestOptions,
  type TestVariantsTestResult,
  type ErrorEvent,
  type OnErrorCallback,
} from '../common'
export {
  type TestVariantsCall,
  type TestVariantsSetArgs,
  type TestVariantsTemplatesExt,
} from '../common/test-variants/createTestVariants'

import type { Obj } from '@flemist/simple-utils'
import {
  createTestVariants as createTestVariantsCommon,
  type TestVariantsCall,
  type TestVariantsSetArgs,
  type TestVariantsTemplatesExt,
} from '../common/test-variants/createTestVariants'
import type { TestVariantsTest } from '../common/test-variants/types'
import { createSaveErrorVariantsStore } from './test-variants/createSaveErrorVariantsStore'

export function createTestVariants<Args extends Obj>(
  test: TestVariantsTest<Args>,
): TestVariantsSetArgs<Args> {
  const setArgs = createTestVariantsCommon(test)
  return function testVariantsArgs<ArgsExtra extends Obj>(
    args: TestVariantsTemplatesExt<Omit<Args, 'seed'>, Omit<ArgsExtra, 'seed'>>,
  ): TestVariantsCall<Args> {
    const call = setArgs(args)
    return function testVariantsCall(options) {
      return call({
        ...options,
        createSaveErrorVariantsStore,
      })
    }
  }
}
