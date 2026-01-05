import type {
  IAbortSignalFast,
  IAbortControllerFast,
} from '@flemist/abort-controller-fast'
import type { IPool } from '@flemist/time-limits'
import type { Obj } from '@flemist/simple-utils'
import type { TestOptions } from 'src/common/test-variants/types'
import type { VariantsIterator } from 'src/common/test-variants/iterator/types'
import type { TestVariantsTestRun } from './types'
import type { RunOptionsResolved } from './resolveRunConfig'
import type { RunState } from './createRunState'

/** Context for test variants iteration loop */
export type RunContext<Args extends Obj> = {
  config: RunOptionsResolved<Args>
  testRun: TestVariantsTestRun<Args>
  variantsIterator: VariantsIterator<Args>
  testOptions: TestOptions
  abortControllerParallel: IAbortControllerFast
  abortSignal: IAbortSignalFast
  pool: IPool | null
  state: RunState
}
