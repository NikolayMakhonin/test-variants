import type { ModeConfig } from 'src/common'

export const PARALLEL_MAX = 10
export const TIME_MAX = 10
export const LIMIT_MAX = 10000
export const ITERATIONS_SYNC = 10
export const ITERATIONS_ASYNC = 1000000
export const MODES_DEFAULT: readonly ModeConfig[] = Object.freeze([
  { mode: 'forward' },
])
