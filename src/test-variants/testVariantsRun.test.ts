/* eslint-disable @typescript-eslint/no-shadow */
import {testVariantsRun} from 'src/test-variants/testVariantsRun'
import {testVariantsIterator} from 'src/test-variants/testVariantsIterator'
import {TestVariantsTestRun} from '~/src'

describe('test-variants > testVariantsRun', function () {
  this.timeout(10 * 60 * 1000)

  it('findBestError', async function () {
    const cycles = 10
    const variantsCount = 1000

    for (let expectedIndex = 0; expectedIndex <= variantsCount; expectedIndex++) {
      // let firstError: any = null
      const expectedArgs = expectedIndex < variantsCount ? {i: expectedIndex} : null

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

      const variants = testVariantsIterator({
        argsTemplates: {
          i: Array.from({length: variantsCount}).map((_, i) => i),
        },
        getSeed          : ({cycleIndex}) => cycleIndex,
        repeatsPerVariant: 1,
      })

      const result = await testVariantsRun(testRun, variants, {
        findBestError: {
          cycles,
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
