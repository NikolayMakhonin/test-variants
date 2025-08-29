/* eslint-disable @typescript-eslint/no-shadow */
import {testVariantsFindBestError} from 'src/test-variants/testVariantsFindBestError'

describe('test-variants > testVariantsFindBestError', function () {
  it('base', async function () {
    const groupSize = 1000
    const errorProbability = groupSize / 10
    const variantsCount = groupSize * 10
    const variants = Array.from({length: variantsCount}).map((_, i) => ({i}))

    for (let expectedIndex = 10000; expectedIndex <= variantsCount; expectedIndex++) {
      const test = (index: number, args: { i: number }) => {
        if (
          index >= expectedIndex
          && (index % groupSize === groupSize - 1 || index % groupSize >= expectedIndex % groupSize)
        ) {
          throw new Error(`Error at index ${index}`)
        }
      }

      const result = await testVariantsFindBestError(test, variants, {groupSize})

      // console.log(result)

      try {
        if (expectedIndex >= variantsCount) {
          assert.strictEqual(result.index, null)
          assert.strictEqual(result.error, null)
          assert.strictEqual(result.args, null)
        }
        else {
          assert.strictEqual(result.index, expectedIndex)
          assert.strictEqual(result.error.message, `Error at index ${expectedIndex}`)
          assert.strictEqual(result.args.i, expectedIndex)
        }
        // assert.ok(result.iterations >= 5)
      }
      catch (err) {
        console.error({expectedIndex, result})
        throw err
      }
    }
  })
})
