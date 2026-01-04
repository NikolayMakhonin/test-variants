import type { Obj } from '@flemist/simple-utils'
import type {
  TestVariantsResult,
  TestVariantsBestError,
} from 'src/common/test-variants/types'
import type { TestVariantsIterator } from 'src/common/test-variants/iterator/types'
import type { TestVariantsRunState } from './createRunState'

/** Create test variants run result */
export function createRunResult<Args extends Obj>(
  state: TestVariantsRunState,
  variants: TestVariantsIterator<Args>,
  dontThrowIfError: boolean | null | undefined,
): TestVariantsResult<Args> {
  const bestError: TestVariantsBestError<Args> | null = variants.limit
    ? {
        error: variants.limit.error,
        args: variants.limit.args,
        tests: variants.limit.tests,
      }
    : null

  if (bestError && !dontThrowIfError) {
    throw bestError.error
  }

  return {
    iterations: state.iterations,
    bestError,
  }
}
