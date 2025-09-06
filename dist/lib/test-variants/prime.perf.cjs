'use strict';

var node = require('rdtsc/node');
var testVariants_prime = require('./prime.cjs');

describe('test-variants > prime perf', function () {
    this.timeout(300000);
    it('isPrime', function () {
        let number1 = testVariants_prime.nextPrime(Math.pow(2, 30));
        let number2 = testVariants_prime.prevPrime(Math.pow(2, 31) - 1);
        console.log('number:', number1);
        console.log('number:', number2);
        const result = node.calcPerformance({
            time: 10000,
            funcs: [
                () => {
                },
                () => {
                    number1 = testVariants_prime.nextPrime(number1);
                },
                () => {
                    number2 = testVariants_prime.prevPrime(number2);
                },
            ],
        });
        console.log('number1:', number1);
        console.log('number2:', number2);
        console.log('perf:', result);
    });
});
