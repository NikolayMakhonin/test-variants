import { calcPerformance } from 'rdtsc/node'
import { createTestVariants } from './createTestVariants'

describe('test > testVariants perf', function () {
  this.timeout(300000)

  it('sync', async function () {
    let value = 0
    const testVariantsSync = createTestVariants(
      ({ a, b, c }: { a: number; b: string; c: boolean }) => {
        if (a === 1 && b === '4' && c === false) {
          value++
        }
      },
    )

    const args = {
      a: [1, 2],
      b: ['3', '4'],
      c: [true, false],
    }

    const perfResult = calcPerformance({
      time: 10000,
      funcs: [
        () => {},
        () => {
          testVariantsSync(args)()
        },
      ],
    })

    const result = await testVariantsSync(args)()

    perfResult.absoluteDiff = perfResult.absoluteDiff.map(
      o => o / result.iterations,
    )

    console.log('testVariants perf:', result)
  })
})
