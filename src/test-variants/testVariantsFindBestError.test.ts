/* eslint-disable @typescript-eslint/no-shadow */
import {testVariantsFindBestError} from 'src/test-variants/testVariantsFindBestError'

describe('test-variants > testVariantsFindBestError', function () {
  this.timeout(10 * 60 * 1000)

  it('base', async function () {
    const groupSize = 1000
    const variantsCount = groupSize * 10
    const variants = Array.from({length: variantsCount}).map((_, i) => ({i}))

    for (let expectedIndex = 0; expectedIndex <= variantsCount; expectedIndex++) {
      let firstError: any = null

      const test = (index: number, args: { i: number }) => {
        if (args.i !== index) {
          firstError = new Error(`Error at index ${index}, args.i: ${args.i}`)
          throw firstError
        }
        if (
          index === expectedIndex
        ) {
          throw new Error(`Error at index ${index}`)
        }
      }

      const result = await testVariantsFindBestError(test, variants, {groupSize})

      if (firstError) {
        throw firstError
      }

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
        // console.log(result.iterations)
      }
      catch (err) {
        console.error({
          expectedIndex,
          result,
        })
        throw err
      }
    }
  })
})
