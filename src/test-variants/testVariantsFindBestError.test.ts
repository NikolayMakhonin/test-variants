/* eslint-disable @typescript-eslint/no-shadow */
import {testVariantsFindBestError} from 'src/test-variants/testVariantsFindBestError'

describe('test-variants > testVariantsFindBestError', function () {
  it('base', async function () {
    const groupSize = 10000
    const errorProbability = groupSize / 100
    const variantsCount = groupSize * 10
    const variants = Array.from({length: variantsCount}).map((_, i) => ({i}))
    const expectedIndex = 5

    function test(index: number, args: {i: number}) {
      if (index >= expectedIndex && Math.random() < errorProbability) {
        throw new Error(`Error at index ${index}`)
      }
    }

    const result = await testVariantsFindBestError(test, variants, {groupSize})

    console.log(result)

    assert.strictEqual(result.index, expectedIndex)
    assert.strictEqual(result.error.message, `Error at index ${expectedIndex}`)
    assert.strictEqual(result.args.i, expectedIndex)
    assert.ok(result.iterations >= 5)
  })
})
