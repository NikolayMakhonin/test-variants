import type { RunState } from './createRunState'
import { garbageCollect } from 'src/common/garbage-collect/garbageCollect'

export type GCConfig = {
  GC_Iterations: number
  GC_IterationsAsync: number
  GC_Interval: number
}

/** Check if GC should be triggered */
export function shouldTriggerGC(
  config: GCConfig,
  state: RunState,
  now: number,
): boolean {
  const { GC_Iterations, GC_IterationsAsync, GC_Interval } = config

  return (
    (GC_Iterations > 0 &&
      state.iterations - state.prevGC_Iterations >= GC_Iterations) ||
    (GC_IterationsAsync > 0 &&
      state.iterationsAsync - state.prevGC_IterationsAsync >=
        GC_IterationsAsync) ||
    (GC_Interval > 0 && now - state.prevGC_Time >= GC_Interval)
  )
}

/** Trigger GC and update state */
export async function triggerGC(state: RunState, now: number): Promise<void> {
  state.prevGC_Iterations = state.iterations
  state.prevGC_IterationsAsync = state.iterationsAsync
  state.prevGC_Time = now
  await garbageCollect(1)
}
