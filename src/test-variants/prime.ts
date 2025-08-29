export function isPrime(num: number) {
  if (num <= 1) {
    return false
  }
  if (num <= 3) {
    return true
  }
  if (num % 2 === 0 || num % 3 === 0) {
    return false
  }
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) {
      return false
    }
  }
  return true
}

export function nextPrime(n: number) {
  if (n < 2) {
    return 2
  }
  let candidate = n + (n % 2 === 0 ? 1 : 2)
  while (!isPrime(candidate)) {
    candidate += 2
  }
  return candidate
}
