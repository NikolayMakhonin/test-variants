import type { Obj } from '@flemist/simple-utils'
import type {
  TestVariantsIterator,
  TestVariantsResult,
  TestVariantsBestError,
  FindBestErrorOptions,
} from 'src/common/test-variants/types'
import type { TestVariantsRunState } from './createRunState'

/** Create test variants run result */
export function createRunResult<Args extends Obj>(
  state: TestVariantsRunState,
  variants: TestVariantsIterator<Args>,
  findBestError: FindBestErrorOptions | null | undefined,
  dontThrowIfError: boolean | null | undefined,
): TestVariantsResult<Args> {
  const count = variants.count ?? 0
  const includeErrorVariant = findBestError?.includeErrorVariant

  const bestError: TestVariantsBestError<Args> | null = variants.limit
    ? {
        error: variants.limit.error,
        args: variants.limit.args,
        tests: includeErrorVariant ? Math.max(0, count - 1) : count,
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
