import { describe, it } from 'vitest'
import { getRandomSeed } from '@flemist/simple-utils'
import { testVariants } from './-test/variants'

// Manual test file for human usage only

describe(
  'test-variants > createTestVariants variants endless',
  { timeout: 7 * 24 * 60 * 60 * 1000 },
  () => {
    it('variants', async () => {
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
            limitTests: 5,
          },
          {
            mode: 'random',
            limitTests: 100,
          },
          {
            mode: 'backward',
            limitTests: 1,
            attemptsPerVariant: 10,
          },
        ],
        parallel: 100,
      })
    })
  },
)
