import type {
  IAbortSignalFast,
  IAbortControllerFast,
} from '@flemist/abort-controller-fast'
import type { Obj } from '@flemist/simple-utils'
import type { IPool } from '@flemist/time-limits'
import type { VariantsIterator } from '../iterator/types'
import type { TestOptions } from '../types'
import type { RunState } from './createRunState'
import type { RunOptionsResolved } from './resolveRunOptions'
import type { TestVariantsTestRun } from './types'

/** Context for test variants iteration loop */
export type RunContext<Args extends Obj> = {
  options: RunOptionsResolved<Args>
  testRun: TestVariantsTestRun<Args>
  variantsIterator: VariantsIterator<Args>
  testOptions: TestOptions
  testOptionsParallel: TestOptions
  abortControllerGlobal: IAbortControllerFast
  abortControllerParallel: IAbortControllerFast
  abortSignal: IAbortSignalFast
  pool: IPool | null
  state: RunState
}
