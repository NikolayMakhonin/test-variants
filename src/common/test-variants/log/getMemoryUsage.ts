/** Chrome-specific performance.memory API (non-standard) */
type PerformanceMemory = {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

/** Get current memory usage (Node.js or Chrome) */
export function getMemoryUsage(): number | null {
  // Node.js
  if (typeof process !== 'undefined' && process.memoryUsage) {
    try {
      return process.memoryUsage().heapUsed
    } catch {
      // ignore
    }
  }
  // Browser (Chrome only, non-standard)
  if (typeof performance !== 'undefined') {
    const memory = (performance as { memory?: PerformanceMemory }).memory
    if (memory) {
      try {
        return memory.usedJSHeapSize
      } catch {
        // ignore
      }
    }
  }
  return null
}
