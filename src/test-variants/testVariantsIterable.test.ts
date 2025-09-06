/* eslint-disable @typescript-eslint/no-shadow */
import {Obj} from '~/src'
import {testVariantsIterable, TestVariantsIterableOptions} from './testVariantsIterable'

describe('test-variants > testVariantsIterable', function () {
  this.timeout(10 * 60 * 1000)

  function test<
    Args extends Obj,
    ArgsExtra extends Obj,
  >(options: TestVariantsIterableOptions<Args, ArgsExtra>, expectedArgs: (Args & ArgsExtra)[]) {
    const iterable = testVariantsIterable<Args, ArgsExtra>(options)
    const resultArgs = Array.from(iterable)
    assert.deepStrictEqual(resultArgs, expectedArgs)
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
})
