/* eslint-disable @typescript-eslint/no-shadow */
import {testVariantsRun} from 'src/test-variants/testVariantsRun'
import {TestVariantsTestRun} from '~/src'

describe('test-variants > testVariantsRun', function () {
  this.timeout(10 * 60 * 1000)

  it('findBestError', async function () {
    const seeds = Array.from({length: 10}).map((_, i) => i)
    const variantsCount = 1000
    const variants = Array.from({length: variantsCount}).map((_, i) => ({i}))

    for (let expectedIndex = 0; expectedIndex <= variantsCount; expectedIndex++) {
      // let firstError: any = null
      const expectedArgs = expectedIndex < variantsCount ? variants[expectedIndex] : null

      const testRun: TestVariantsTestRun<typeof expectedArgs> = (args: { i: number }) => {
        if (
          expectedArgs != null && args.i === expectedArgs.i
          || args.i > (expectedIndex + variantsCount) / 2
        ) {
          throw new Error(`Error at index ${expectedIndex}`)
        }
        return {
          iterationsSync : 1,
          iterationsAsync: 0,
        }
      }

      let lastItem: { i: number } | null = null
      const result = await testVariantsRun(testRun, function *({
        useLastItemAsMax,
      }) {
        for (let i = 0; i < variants.length; i++) {
          if (useLastItemAsMax && lastItem && variants[i].i > lastItem.i) {
            break
          }
          lastItem = variants[i]
          yield lastItem
        }
      }, {
        findBestError: {
          seeds,
        },
        logCompleted: false,
      })

      // if (firstError) {
      //   throw firstError
      // }

      // console.log(result)

      try {
        if (expectedIndex >= variantsCount) {
          assert.ok(result.bestError == null)
        }
        else {
          assert.ok(result.bestError)
          assert.strictEqual(result.bestError.args.i, expectedArgs.i)
          assert.strictEqual(result.bestError.error.message, `Error at index ${expectedIndex}`)
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
