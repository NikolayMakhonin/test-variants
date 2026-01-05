import type { Obj } from '@flemist/simple-utils'
import type { RunState } from './createRunState'
import { garbageCollect } from 'src/common/garbage-collect/garbageCollect'
import type { RunContext } from 'src/common/test-variants/run/RunContext'

/** Check if GC should be triggered */
export function shouldTriggerGC(
  runContext: RunContext<Obj>,
  now: number,
): boolean {
  const { GC_Iterations, GC_IterationsAsync, GC_Interval } = runContext.options

  return (
    (GC_Iterations > 0 &&
      runContext.state.iterations - runContext.state.prevGcIterations >=
        GC_Iterations) ||
    (GC_IterationsAsync > 0 &&
      runContext.state.iterationsAsync -
        runContext.state.prevGcIterationsAsync >=
        GC_IterationsAsync) ||
    (GC_Interval > 0 && now - runContext.state.prevGcTime >= GC_Interval)
  )
}

/** Trigger GC and update state */
export async function triggerGC(state: RunState, now: number): Promise<void> {
  state.prevGcIterations = state.iterations
  state.prevGcIterationsAsync = state.iterationsAsync
  state.prevGcTime = now
  await garbageCollect(1)
}
