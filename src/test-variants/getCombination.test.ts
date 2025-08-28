/* eslint-disable @typescript-eslint/no-shadow */
import {getCombination, getCombinationCount} from 'src/test-variants/getCombination'

describe('test-variants > getCombination', function () {
  function test(options: any[][], expectedCombinations: any[][]) {
    const count = getCombinationCount(options)
    assert.strictEqual(count, expectedCombinations.length)
    const combinations = []
    for (let i = 0; i < count; i++) {
      combinations.push(getCombination(options, i))
    }
    assert.deepStrictEqual(combinations, expectedCombinations)
    for (let i = 0; i < count; i++) {
      assert.deepStrictEqual(getCombination(options, i + count), combinations[i])
    }
  }
  it('base', function () {
    test([[1, 2], ['a', 'b'], [true, false]], [
      [1, 'a', true],
      [1, 'a', false],
      [1, 'b', true],
      [1, 'b', false],
      [2, 'a', true],
      [2, 'a', false],
      [2, 'b', true],
      [2, 'b', false],
    ])
    test([[1, 2], ['a', 'b'], [true]], [
      [1, 'a', true],
      [1, 'b', true],
      [2, 'a', true],
      [2, 'b', true],
    ])
    test([[1, 2], ['a'], [true, false]], [
      [1, 'a', true],
      [1, 'a', false],
      [2, 'a', true],
      [2, 'a', false],
    ])
    test([[1], ['a', 'b'], [true, false]], [
      [1, 'a', true],
      [1, 'a', false],
      [1, 'b', true],
      [1, 'b', false],
    ])
    assert.strictEqual(getCombination([[1, 2], ['a', 'b'], []], 1), null)
    assert.strictEqual(getCombination([[1, 2], [], [true, false]], 1), null)
    assert.strictEqual(getCombination([[], ['a', 'b'], [true, false]], 1), null)
  })
})
