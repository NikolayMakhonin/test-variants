import { describe, it } from 'vitest'
import { getRandomSeed } from '@flemist/simple-utils'
import { testVariants } from './-test/variants'
import { log } from 'src/common/helpers/log'

describe(
  'test-variants > createTestVariants variants',
  { timeout: 7 * 60 * 60 * 1000 },
  () => {
    // Don't change these limits
    const limitTime = 120 * 1000
    const LIMIT_TIME_MIN = 110 * 1000
    const LIMIT_TIME_MAX = 160 * 1000

    it('variants', async () => {
      const startTime = Date.now()
      await testVariants({
        argType: ['static', 'dynamic', null],
        retriesToErrorMax: [0, 1, 2],
        argValueType: ['primitive', 'object', null],
        modeType: ['forward', 'backward', 'random', null],
        modesCountMax: [1, 2, 3],
        modeCyclesMax: [0, 1, 2],
        modeAttemptsMax: [0, 1, 2],
        findBestError: [false, true, null],
        withEquals: ({ findBestError }) =>
          findBestError !== false ? [false, true, null] : [false],
        includeErrorVariant: ({ findBestError }) =>
          findBestError !== false ? [false, true, null] : [false],
        limitArgOnError: ({ findBestError }) =>
          findBestError !== false ? [false, true, 'func', null] : [false],
        dontThrowIfError: ({ findBestError }) =>
          findBestError !== false ? [false, true, null] : [true],
        cyclesMax: [0, 1, 2],
        withSeed: [false, true, null],
        attemptsPerVariantMax: [0, 1, 2],
        argsCountMax: [0, 1, 2, 3],
        argValuesCountMax: [0, 1, 2],
        argValueMax: [1, 5],
        parallel: [false, 1, 4, 8, true, null],
        errorVariantIndex: ['none', 0, 'last', 'after-last', null],
        async: [false, true, null],
        delay: [false, true, null],
        withLog: [false, true, null],
      })({
        limitTime,
        getSeed: getRandomSeed,
        cycles: 1e9,
        findBestError: {
          limitArgOnError: true,
        },
        saveErrorVariants: {
          dir: 'tmp/test/createTestVariants/variants',
          attemptsPerVariant: 10,
          // Never use it here. findBestError with limitArgOnError is completely enough here.
          useToFindBestError: false,
        },
        iterationModes: [
          {
            mode: 'forward',
            limitTests: 1000,
          },
          {
            mode: 'random',
            limitTests: 100000,
          },
          // {
          //   mode: 'backward',
          //   limitTests: 1,
          //   attemptsPerVariant: 10,
          // },
        ],
        parallel: 1,
      })

      // Validate stress test execution time
      const elapsedMs = Date.now() - startTime
      const elapsedSeconds = elapsedMs / 1000
      const limitTimeSeconds = limitTime / 1000
      if (elapsedMs < LIMIT_TIME_MIN) {
        throw new Error(
          `Stress test completed too fast: ${elapsedSeconds.toFixed(1)}s (expected ${limitTimeSeconds}s)\n` +
            `Possible cause: false positive result, not all iterations executed, early termination bug, etc`,
        )
      }
      if (elapsedMs > LIMIT_TIME_MAX) {
        throw new Error(
          `Stress test took too long: ${elapsedSeconds.toFixed(1)}s (expected ${limitTimeSeconds}s)\n` +
            `Possible cause: hang, infinite loop, non-working time limit, etc`,
        )
      }
      log(`Stress test execution time: ${elapsedSeconds.toFixed(1)}s (OK)`)
    })
  },
)
