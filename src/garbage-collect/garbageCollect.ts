/** Wait for garbage collection and return 0. It may be required for very long calculations. */
export function garbageCollect(iterations: number): Promise<0> {
  if (iterations == null || iterations <= 0) {
    throw new Error(`Iterations = ${iterations}`)
  }
  iterations--

  // const time0 = Date.now()
  const promise = new Promise<number>(resolve => {
    setTimeout(() => {
      resolve(iterations)
    }, 1)
  })

  return iterations <= 0
    ? promise as Promise<0>
    : promise.then(garbageCollect)
    // : promise.then(o => {
    //   const gcTime = Date.now() - time0
    //   if (gcTime > 50) {
    //     console.log('GC time: ' + gcTime)
    //     o++
    //   }
    //   return garbageCollect(o)
    // })
}
