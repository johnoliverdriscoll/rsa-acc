'use strict'
const {bitLength, isProbablyPrime, randBetween} = require('bigint-crypto-utils')
const tf = require('typeforce')

const delta = [6n, 4n, 2n, 4n, 2n, 4n, 6n, 2n]

/**
 * Generates a random prime with specific number of bits.
 * @param {Number} bits The number of bits the prime with contain.
 * @returns {BigInteger} The generated prime.
 * @private
 */
function randomPrime(bits) {
  tf(tf.tuple(tf.Number), arguments)
  const minPrime = 1n << BigInt(bits - 1)
  const maxPrime = (1n << BigInt(bits)) - 1n
  let p
  while (true) {
    p = randBetween(maxPrime, minPrime)
    p += 31n - (p % 30n)
    let deltaIdx = 0
    while (bitLength(p) !== bits) {
      if (isProbablyPrime(p, 1)) {
        break
      }
      p += delta[deltaIdx++ % delta.length]
    }
    if (bitLength(p) !== bits) {
      continue
    }
    if (isProbablyPrime(p, 24)) {
      return p
    }
  }
}

/**
 * Generates two primes suitable for an RSA private key.
 * @param {Number} modulusBits The bits in the key's modulus.
 * @returns {Primes} The generated primes.
 * @private
 */
function generatePrimes(modulusBits) {
  tf(tf.tuple(tf.Number), arguments)
  const pBits = Math.ceil(modulusBits / 2)
  const qBits = modulusBits - pBits
  let p, q
  let n
  do {
    n = 0n
    p = randomPrime(pBits)
    q = randomPrime(qBits)
    n = p * q
  } while (bitLength(n) !== modulusBits)
  if (p < q) {
    return {p: q, q: p}
  }
  return {p, q}
}

module.exports = generatePrimes
