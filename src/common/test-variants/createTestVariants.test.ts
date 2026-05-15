import { describe, it } from 'vitest'
import * as assert from 'node:assert'
import { createTestVariants } from './createTestVariants'

describe('test-variants > million of Promise reject', () => {
  let millionRejectTime = 0
  it('million of Promise reject', { timeout: 1800000 }, async () => {
    // console.log('wait 5 sec')
    // await new Promise((resolve) => {
    //   setTimeout(resolve, 5000)
    // })
    console.log('start')
    // await new Promise((resolve) => {
    //   setTimeout(resolve, 1000)
    // })

    await createTestVariants(
      async ({}: {
        a: number
        b: number
        c: number
        d: number
        e: number
        f: number
        g: number
      }) => {
        await Promise.resolve({
          then(resolve, reject) {
            reject('err')
          },
        }).then(
          o => {},
          o => {},
        )

        // await Promise.reject('err')
        //   .then(o => {}, o => {})
      },
    )({
      a: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      b: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      c: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      d: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      e: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      f: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      g: [0],
      // g: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    })()

    console.log('try delay')
    for (let i = 0; i < 100; i++) {
      const time0 = Date.now()
      await new Promise(resolve => {
        setTimeout(resolve, 0)
      })
      const time = Date.now() - time0
      assert.ok(time < 1000, 'delay real time: ' + time)
    }

    millionRejectTime = Date.now()
  })

  it('after million of Promise reject', () => {
    const now = Date.now()
    assert.ok(millionRejectTime > 0)
    assert.ok(now - millionRejectTime < 500, now - millionRejectTime + '')
    console.log('millionRejectTime: ' + (now - millionRejectTime))
  })
})
