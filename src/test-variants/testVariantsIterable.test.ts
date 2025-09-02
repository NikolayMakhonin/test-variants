/* eslint-disable @typescript-eslint/no-shadow */
import {Obj} from '~/src'
import {testVariantsIterable, TestVariantsIterableOptions} from './testVariantsIterable'

describe('test-variants > testVariantsIterable', function () {
  this.timeout(10 * 60 * 1000)

  function test<
    Args extends Obj,
    ArgsExtra extends Obj,
  >(options: TestVariantsIterableOptions<Args, ArgsExtra>, expectedArgs: (Args & ArgsExtra)[], expectedIndexes: { [key in keyof (Args & ArgsExtra)]: number }[]) {
    const iterable = testVariantsIterable<Args, ArgsExtra>(options)
    const resultArgs = []
    const resultIndexes = []
    for (const args of iterable) {
      resultArgs.push(args.args)
      resultIndexes.push(args.indexes)
    }
    assert.deepStrictEqual(resultArgs, expectedArgs)
    assert.deepStrictEqual(resultIndexes, expectedIndexes)
  }

  it('base', async function () {
    test({
      argsTemplates: {
        a: [1, 2],
        b: ['x', 'y', 'z'],
        c: [true, false],
      },
    }, [
      {a: 1, b: 'x', c: true},
      {a: 1, b: 'x', c: false},
      {a: 1, b: 'y', c: true},
      {a: 1, b: 'y', c: false},
      {a: 1, b: 'z', c: true},
      {a: 1, b: 'z', c: false},
      {a: 2, b: 'x', c: true},
      {a: 2, b: 'x', c: false},
      {a: 2, b: 'y', c: true},
      {a: 2, b: 'y', c: false},
      {a: 2, b: 'z', c: true},
      {a: 2, b: 'z', c: false},
    ], [
      {a: 0, b: 0, c: 0},
      {a: 0, b: 0, c: 1},
      {a: 0, b: 1, c: 0},
      {a: 0, b: 1, c: 1},
      {a: 0, b: 2, c: 0},
      {a: 0, b: 2, c: 1},
      {a: 1, b: 0, c: 0},
      {a: 1, b: 0, c: 1},
      {a: 1, b: 1, c: 0},
      {a: 1, b: 1, c: 1},
      {a: 1, b: 2, c: 0},
      {a: 1, b: 2, c: 1},
    ])
  })

  it('argsMaxValues', async function () {
    test({
      argsTemplates: {
        a: [1, 2, 3],
        b: ['x', 'y', 'z'],
        c: [true, false],
      },
      argsMaxIndexes: {
        a: 1,
        b: 1,
      },
    }, [
      {a: 1, b: 'x', c: true},
      {a: 1, b: 'x', c: false},
      {a: 1, b: 'y', c: true},
      {a: 1, b: 'y', c: false},
      {a: 2, b: 'x', c: true},
      {a: 2, b: 'x', c: false},
      {a: 2, b: 'y', c: true},
      {a: 2, b: 'y', c: false},
    ], [
      {a: 0, b: 0, c: 0},
      {a: 0, b: 0, c: 1},
      {a: 0, b: 1, c: 0},
      {a: 0, b: 1, c: 1},
      {a: 1, b: 0, c: 0},
      {a: 1, b: 0, c: 1},
      {a: 1, b: 1, c: 0},
      {a: 1, b: 1, c: 1},
    ])
  })

  it('argsMaxValuesExclusive', async function () {
    test({
      argsTemplates: {
        a: [1, 2, 3],
        b: ['x', 'y', 'z'],
        c: [true, false],
      },
      argsMaxIndexes: {
        a: 1,
        b: 1,
      },
      argsMaxIndexesExclusive: true,
    }, [
      {a: 1, b: 'x', c: true},
      {a: 1, b: 'x', c: false},
      {a: 1, b: 'y', c: true},
      {a: 1, b: 'y', c: false},
      {a: 2, b: 'x', c: true},
      {a: 2, b: 'x', c: false},
    ], [
      {a: 0, b: 0, c: 0},
      {a: 0, b: 0, c: 1},
      {a: 0, b: 1, c: 0},
      {a: 0, b: 1, c: 1},
      {a: 1, b: 0, c: 0},
      {a: 1, b: 0, c: 1},
    ])
  })
})
