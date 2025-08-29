import {isPrime, nextPrime} from "src/test-variants/prime";

describe('test-variants > prime', function () {
  this.timeout(10 * 60 * 1000)
  it('isPrime', async function () {
    const primeNumbers = []
    for (let i = 2; i < 100000; i++) {
      let _isPrime = true
      for (let j = 0; j < primeNumbers.length + 1; j++) {
        if (i % primeNumbers[j] === 0) {
          _isPrime = false
          break
        }
      }
      assert.strictEqual(isPrime(i), _isPrime)
      if (_isPrime) {
        if (primeNumbers.length >= 1) {
          assert.strictEqual(nextPrime(primeNumbers[primeNumbers.length - 1]), i)
        }
        primeNumbers.push(i)
      }
    }
    console.log(primeNumbers.length)
  })
})
