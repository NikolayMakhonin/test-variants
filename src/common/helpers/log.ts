import { formatAny } from '@flemist/simple-utils'

let traceIndent = 0

const LOG_LAST_MAX = 1000
const logLast: string[] = []

export function formatValue(value: unknown): string {
  return formatAny(value, { maxDepth: 3, maxItems: 20 })
}

export function formatObject(obj: unknown): string {
  return formatAny(obj, { pretty: true, maxDepth: 5, maxItems: 50 })
}

export function log(...args: unknown[]): void {
  const message = args
    .map(a => (typeof a === 'string' ? a : formatObject(a)))
    .join(' ')
  logLast.push(message)
  if (logLast.length > LOG_LAST_MAX) {
    logLast.shift()
  }
  console.log(message)
}

export function traceLog(...args: unknown[]): void {
  const message = args
    .map(a => (typeof a === 'string' ? a : formatValue(a)))
    .join(' ')
  log('  '.repeat(traceIndent) + message)
}

export function traceEnter(...args: unknown[]): void {
  const message = args
    .map(a => (typeof a === 'string' ? a : formatValue(a)))
    .join(' ')
  traceLog('> ' + message)
  traceIndent++
}

export function traceExit(...args: unknown[]): void {
  traceIndent--
  const message = args
    .map(a => (typeof a === 'string' ? a : formatValue(a)))
    .join(' ')
  traceLog('< ' + message)
}

export function getLogLast(): string {
  return logLast.join('\n')
}

export function resetLog(): void {
  traceIndent = 0
  logLast.length = 0
}

// Test-only, for stress test log retrieval
globalThis.__getStressTestLogLast = getLogLast
