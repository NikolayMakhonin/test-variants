import type {
  IAbortSignalFast,
  AbortControllerFast,
} from '@flemist/abort-controller-fast'
import type { IPool } from '@flemist/time-limits'
import type { Obj } from '@flemist/simple-utils'
import type {
  TestVariantsTestRun,
  TestVariantsIterator,
  TestVariantsTestOptions,
} from 'src/common/test-variants/types'
import type { TestVariantsRunConfig } from './resolveRunConfig'
import type { TestVariantsRunState } from './createRunState'

/** Context for test variants iteration loop */
export type RunContext<Args extends Obj> = {
  config: TestVariantsRunConfig<Args>
  testRun: TestVariantsTestRun<Args>
  variants: TestVariantsIterator<Args>
  testOptions: TestVariantsTestOptions
  abortControllerParallel: AbortControllerFast
  abortSignal: IAbortSignalFast
  pool: IPool | null
  state: TestVariantsRunState
}
