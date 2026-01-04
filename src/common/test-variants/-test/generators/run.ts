import { Random, randomBoolean, randomInt } from '@flemist/simple-utils'
import type {
  ModeChangeEvent,
  ModeConfig,
  TestVariantsLogOptions,
  TestVariantsRunOptions,
} from 'src/common'
import {
  generateBoolean,
  generateBoundaryInt,
  generateLimit,
} from './primitives'
import { PARALLEL_MAX, TIME_MAX } from '../constants'
import { StressTestArgs, Template, TestArgs } from '../types'
import { isLogEnabled } from '../log'
import { generateFindBestErrorOptions } from './findBestError'
import type { TestVariantsLogType } from 'src/common/test-variants/types'
import type { ModeType } from 'src/common/test-variants/iterator/types'

function generateModeType(rnd: Random, options: StressTestArgs): ModeType {
  if (options.modeType != null) {
    return options.modeType
  }
  const choice = randomInt(rnd, 0, 3)
  if (choice === 0) {
    return 'forward'
  }
  if (choice === 1) {
    return 'backward'
  }
  return 'random'
}

function generateParallel(
  rnd: Random,
  options: StressTestArgs,
): number | boolean {
  if (options.parallel != null) {
    return options.parallel
  }
  // 1/4 chance for true/false
  if (randomBoolean(rnd, 0.25)) {
    return randomBoolean(rnd)
  }
  return generateBoundaryInt(rnd, PARALLEL_MAX)
}

function generateSeedFunc(
  rnd: Random,
  options: StressTestArgs,
): (() => number) | undefined {
  const enabled = generateBoolean(rnd, options.withSeed)
  if (!enabled) {
    return void 0
  }
  let seed = 0
  return function getSeed(): number {
    return seed++
  }
}

function generateLogOptions(
  rnd: Random,
  options: StressTestArgs,
  logFunc: (type: TestVariantsLogType, message: string) => void,
): TestVariantsLogOptions {
  // Always consume the same random values to keep RNG sequence consistent
  // between normal runs and logged runs (for reproducible error variants)
  const enabled = generateBoolean(rnd, options.withLog)
  const start = generateBoolean(rnd, enabled)
  const progressEnabled = generateBoolean(rnd, enabled)
  const progress = progressEnabled ? generateBoundaryInt(rnd, TIME_MAX) : false
  const completed = generateBoolean(rnd, enabled)
  const error = generateBoolean(rnd, enabled)
  const modeChange = generateBoolean(rnd, enabled)
  const debug = generateBoolean(rnd, enabled)

  if (isLogEnabled()) {
    return Object.freeze({
      start: true,
      progress: 0,
      completed: true,
      error: true,
      modeChange: true,
      debug: true,
      func: logFunc,
    })
  }
  return Object.freeze({
    start,
    progress,
    completed,
    error,
    modeChange,
    debug,
    func: logFunc,
  })
}

function generateMode(
  rnd: Random,
  options: StressTestArgs,
  variantsCount: number,
): ModeConfig {
  const mode = generateModeType(rnd, options)
  const variants = Math.max(1, generateBoundaryInt(rnd, variantsCount))
  const cycles = generateBoundaryInt(rnd, options.modeCyclesMax)
  const attemptsPerVariant = generateBoundaryInt(rnd, options.modeAttemptsMax)
  const limitTests = generateLimit(rnd, variants * cycles * attemptsPerVariant)
  return Object.freeze({ mode, cycles, attemptsPerVariant, limitTests })
}

function generateModes(
  rnd: Random,
  options: StressTestArgs,
  variantsCount: number,
): ModeConfig[] {
  const count = generateBoundaryInt(rnd, options.modesCountMax)
  const modes: ModeConfig[] = []
  for (let i = 0; i < count; i++) {
    modes[i] = generateMode(rnd, options, variantsCount)
  }
  return Object.freeze(modes) as ModeConfig[]
}

export function generateRunOptions(
  rnd: Random,
  options: StressTestArgs,
  template: Template,
  argKeys: readonly string[],
  variantsCount: number,
  logFunc: (type: TestVariantsLogType, message: string) => void,
  onError: (event: { error: unknown; args: TestArgs; tests: number }) => void,
  onModeChange: (event: ModeChangeEvent) => void,
): TestVariantsRunOptions<TestArgs> {
  const limitTests = generateLimit(rnd, variantsCount)
  const limitTime = generateBoundaryInt(rnd, TIME_MAX)
  return Object.freeze({
    onError,
    onModeChange,
    log: generateLogOptions(rnd, options, logFunc),
    parallel: generateParallel(rnd, options),
    cycles: generateBoundaryInt(rnd, options.cyclesMax),
    getSeed: generateSeedFunc(rnd, options),
    iterationModes: generateModes(rnd, options, variantsCount),
    findBestError: generateFindBestErrorOptions(
      rnd,
      options,
      template,
      argKeys,
    ),
    limitTests: limitTests === 0 ? void 0 : limitTests,
    limitTime: limitTime === 0 ? void 0 : limitTime,
  })
}
