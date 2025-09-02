/* eslint-disable @typescript-eslint/no-shadow */
import {Obj} from '~/src'
import {testVariantsIterable, TestVariantsIterableOptions} from './testVariantsIterable'

describe('test-variants > testVariantsIterable', function () {
  this.timeout(10 * 60 * 1000)

  function test<
    Args extends Obj,
    ArgsExtra extends Obj,
  >(options: TestVariantsIterableOptions<Args, ArgsExtra>, expected: (Args & ArgsExtra)[]) {
    const iterable = testVariantsIterable<Args, ArgsExtra>(options)
    const result = []
    for (const args of iterable) {
      result.push({...args})
    }
    assert.deepStrictEqual(result, expected)
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
    ])
  })

  it('argsMaxValues', async function () {
    test({
      argsTemplates: {
        a: [1, 2, 3],
        b: ['x', 'y', 'z'],
        c: [true, false],
      },
      argsMaxValues: {
        a: 2,
        b: 'y',
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
    ])
  })

  it('argsMaxValuesExclusive', async function () {
    test({
      argsTemplates: {
        a: [1, 2, 3],
        b: ['x', 'y', 'z'],
        c: [true, false],
      },
      argsMaxValues: {
        a: 2,
        b: 'y',
      },
      argsMaxValuesExclusive: true,
    }, [
      {a: 1, b: 'x', c: true},
      {a: 1, b: 'x', c: false},
      {a: 1, b: 'y', c: true},
      {a: 1, b: 'y', c: false},
      {a: 2, b: 'x', c: true},
      {a: 2, b: 'x', c: false},
    ])
  })
})
