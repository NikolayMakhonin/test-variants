export {
  type ErrorEvent,
  type GenerateErrorVariantFilePathOptions,
  type GetSeedParams,
  type LimitArgOnError,
  type LimitArgOnErrorOptions,
  type ModeChangeEvent,
  type ModeConfig,
  type OnErrorCallback,
  type OnModeChangeCallback,
  type SaveErrorVariantsOptions,
  type TestVariantsBestError,
  type FindBestErrorOptions,
  type TestVariantsLogOptions,
  type TestVariantsRunOptions,
  type TestVariantsResult,
  type TestVariantsState,
  type TestVariantsTestResult,
} from '../common'
export type { TestVariantsSetArgs } from 'src/common/test-variants/types'
export type { TestVariantsCall } from 'src/common/test-variants/types'
export type { TestVariantsTemplatesExt } from 'src/common/test-variants/types'

import type { Obj } from '@flemist/simple-utils'
import { createTestVariants as createTestVariantsCommon } from '../common/test-variants/createTestVariants'
import type {
  TestVariantsCall,
  TestVariantsSetArgs,
  TestVariantsTemplatesExt,
} from '../common/test-variants/types'
import type { TestVariantsTest } from '../common/test-variants/run/types'
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
