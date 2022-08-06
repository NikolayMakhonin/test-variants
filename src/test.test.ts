export function test() {
  console.log('OK')
  const arr = [1, 2, 3]
  const obj = {arr: arr}
  console.log(...Array.from(obj.arr.flatMap(o => [o])))
  assert.deepStrictEqual(obj.arr, [1, 2, 3])
  // void Promise.allSettled([])
}

it('test', function () {
  test()
})
