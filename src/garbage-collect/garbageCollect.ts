/** Wait for garbage collection and return 0. It may be required for very long calculations. */
export function garbageCollect(iterations: number): Promise<0> {
  if (iterations == null || iterations <= 0) {
    throw new Error(`Iterations = ${iterations}`)
  }
  iterations--
  const promise = new Promise<number>(resolve => {
    setTimeout(() => {
      resolve(iterations)
    }, 100)
  })
  return iterations <= 0
    ? promise as Promise<0>
    : promise.then(garbageCollect)
}
