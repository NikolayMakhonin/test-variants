import { calcPerformance } from 'rdtsc/node';
import { nextPrime, prevPrime } from './prime.mjs';

describe('test-variants > prime perf', function () {
    this.timeout(300000);
    it('isPrime', function () {
        let number1 = nextPrime(Math.pow(2, 30));
        let number2 = prevPrime(Math.pow(2, 31) - 1);
        console.log('number:', number1);
        console.log('number:', number2);
        const result = calcPerformance({
            time: 10000,
            funcs: [
                () => {
                },
                () => {
                    number1 = nextPrime(number1);
                },
                () => {
                    number2 = prevPrime(number2);
                },
            ],
        });
        console.log('number1:', number1);
        console.log('number2:', number2);
        console.log('perf:', result);
    });
});
