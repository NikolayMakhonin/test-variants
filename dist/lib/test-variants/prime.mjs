const MAX_NUMBER = (Math.pow(2, 31) - 1) | 0;
const MAX_NUMBER_PRIME = 2147483647;
function isPrime(n) {
    if (n > MAX_NUMBER) {
        throw new Error(`Number is too large: ${n}, max is ${MAX_NUMBER}`);
    }
    // convert number to 32-bit integer for performance
    n = n | 0;
    if (n <= 1) {
        return false;
    }
    if (n <= 3) {
        return true;
    }
    if (n % 2 === 0 || n % 3 === 0) {
        return false;
    }
    for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) {
            return false;
        }
    }
    return true;
}
function nextPrime(n) {
    if (n >= MAX_NUMBER_PRIME) {
        throw new Error(`Number is too large: ${n}, max is ${MAX_NUMBER_PRIME - 1}`);
    }
    // convert number to 32-bit integer for performance
    n = n | 0;
    if (n < 2) {
        return 2;
    }
    let candidate = n + (n % 2 === 0 ? 1 : 2);
    while (!isPrime(candidate)) {
        candidate += 2;
    }
    return candidate;
}
function prevPrime(n) {
    if (n > MAX_NUMBER) {
        throw new Error(`Number is too large: ${n}, max is ${MAX_NUMBER}`);
    }
    // convert number to 32-bit integer for performance
    n = n | 0;
    if (n <= 2) {
        return null;
    }
    let candidate = n - (n % 2 === 0 ? 1 : 2);
    while (candidate > 2 && !isPrime(candidate)) {
        candidate -= 2;
    }
    if (candidate > 2) {
        return candidate;
    }
    return 2;
}

export { isPrime, nextPrime, prevPrime };
