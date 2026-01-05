import type { Obj } from '@flemist/simple-utils'
import type { VariantsIterator } from '../iterator/types'
import type { TestVariantsResult, TestVariantsBestError } from '../types'
import type { RunState } from './createRunState'

/** Create test variants run result */
export function createRunResult<Args extends Obj>(
  state: RunState,
  variantsIterator: VariantsIterator<Args>,
  dontThrowIfError: boolean | null | undefined,
): TestVariantsResult<Args> {
  const bestError: TestVariantsBestError<Args> | null = variantsIterator.limit
    ? {
        error: variantsIterator.limit.error,
        args: variantsIterator.limit.args,
        tests: variantsIterator.limit.tests,
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
