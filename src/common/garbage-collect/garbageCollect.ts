import { waitMicrotasks } from '@flemist/async-utils'

/**
 * Wait for garbage collection and return 0.
 * It may be required for very long calculations.
 */
export function garbageCollect(iterations: number): Promise<number> {
  if (iterations == null || iterations <= 0) {
    throw new Error(`Iterations = ${iterations}`)
  }
  iterations--

  const promise = waitMicrotasks().then(() => iterations)

  return iterations <= 0 ? promise : promise.then(garbageCollect)
}
