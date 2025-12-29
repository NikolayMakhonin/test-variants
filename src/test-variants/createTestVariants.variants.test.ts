import {createTestVariants as createTestVariantsStable} from 'dist/lib/index.mjs'
import {createTestVariants} from 'src/test-variants/createTestVariants'
import {getRandomSeed, Random} from 'src/test-variants/random/Random'
import {randomBoolean, randomInt, randomItem} from 'src/test-variants/random/helpers'

function equalsCustom(a: any, b: any) {
  if (a === b) {
    return true
  }
  if (a == null || b == null) {
    return false
  }
  if (typeof a !== 'object' || typeof b !== 'object') {
    return false
  }
  return a.id === b.id
}

const staticObjects = Array.from({length: 100}, (_, i) => ({id: i, value: `value-${i}`}))

type StressTestArgs = {
  templateStaticPrimitive: boolean | null
  templateStaticObject: boolean | null
  templateDynamicPrimitive: boolean | null
  templateDynamicObject: boolean | null
  argsCountMax: number
  valuesPerArgMax: number
  errorPosition: 'none' | 'first' | 'last' | null
  retriesToErrorMax: number
  limitArgOnError: false | true | 'func' | null
  includeErrorVariant: boolean | null
  withSeed: boolean | null
  repeatsPerVariantMax: number
  cyclesMax: number
  withEquals: boolean | null
  seed: number
}

const testVariants = createTestVariantsStable(async (options: StressTestArgs) => {
  const rnd = new Random(options.seed)

  const templateStaticPrimitive = options.templateStaticPrimitive ?? randomBoolean(rnd)
  const templateStaticObject = options.templateStaticObject ?? randomBoolean(rnd)
  const templateDynamicPrimitive = options.templateDynamicPrimitive ?? randomBoolean(rnd)
  const templateDynamicObject = options.templateDynamicObject ?? randomBoolean(rnd)
  const argsCountMax = randomInt(rnd, 0, options.argsCountMax + 1)
  const valuesPerArgMax = randomInt(rnd, 0, options.valuesPerArgMax + 1)
  // TODO: если null, то рассчитать точное значение,
  // когда будет получено общее число вариантов
  let errorPosition: 'none' | 'first' | 'last' | number | null = options.errorPosition ?? randomItem(rnd, ['none', 'first', 'last', null])
  const retriesToErrorMax = randomInt(rnd, 0, options.retriesToErrorMax + 1)
  const limitArgOnError = options.limitArgOnError ?? randomItem(rnd, [false, true, 'func'] as const)
  const includeErrorVariant = options.includeErrorVariant ?? randomBoolean(rnd)
  const withSeed = options.withSeed ?? randomBoolean(rnd)
  const repeatsPerVariantMax = options.repeatsPerVariantMax ?? randomInt(rnd, 1, options.repeatsPerVariantMax + 1)
  const cyclesMax = options.cyclesMax ?? randomInt(rnd, 0, options.cyclesMax + 1)
  const withEquals = options.withEquals ?? randomBoolean(rnd)

  // TODO: test createTestVariants through it public API only
})

describe('test-variants > createTestVariants variants', function () {
  this.timeout(7 * 60 * 60 * 1000)

  it('variants', async function () {
    await testVariants({
      // All test variants: 20135162
      // Все варианты с пустым тестом занимают 1.2m
      includeErrorVariant     : [false, true, null],
      withEquals              : [false, true, null],
      templateDynamicObject   : [false, true, null],
      templateStaticObject    : [false, true, null],
      limitArgOnError         : [false, true, 'func', null],
      withSeed                : [false, true, null],
      repeatsPerVariant       : [0, 1, 2, null],
      cycles                  : [0, 1, 2, null],
      triesToErrorMax         : [0, 1, 2],
      errorPosition           : ['none', 'first', 'last', null],
      templateDynamicPrimitive: [false, true, null],
      templateStaticPrimitive : [false, true, null],
      argsCountMax            : [0, 1, 2, 3],
      valuesPerArgMax         : [0, 1, 2],
    })({
      findBestError: {
        getSeed        : () => getRandomSeed(),
        cycles         : 10000,
        limitArgOnError: true,
      },
      saveErrorVariants: {
        dir               : 'tmp/test/createTestVariants/variants',
        retriesPerVariant : 10,
        useToFindBestError: true,
      },
    })
  })
})
