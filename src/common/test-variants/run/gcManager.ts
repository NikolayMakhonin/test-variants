import type { RunState } from './createRunState'
import { garbageCollect } from 'src/common/garbage-collect/garbageCollect'
import type { RunContext } from 'src/common/test-variants/run/RunContext'

/** Check if GC should be triggered */
export function shouldTriggerGC(
  runContext: RunContext<any>,
  now: number,
): boolean {
  const { GC_Iterations, GC_IterationsAsync, GC_Interval } = runContext.options

  return (
    (GC_Iterations > 0 &&
      runContext.state.iterations - runContext.state.prevGC_Iterations >=
        GC_Iterations) ||
    (GC_IterationsAsync > 0 &&
      runContext.state.iterationsAsync -
        runContext.state.prevGC_IterationsAsync >=
        GC_IterationsAsync) ||
    (GC_Interval > 0 && now - runContext.state.prevGC_Time >= GC_Interval)
  )
}

/** Trigger GC and update state */
export async function triggerGC(state: RunState, now: number): Promise<void> {
  state.prevGC_Iterations = state.iterations
  state.prevGC_IterationsAsync = state.iterationsAsync
  state.prevGC_Time = now
  await garbageCollect(1)
}
