'use strict'
const bn = require('big-integer')
const tf = require('typeforce')

const bn2 = new bn(2)
const bn4 = new bn(4)
const bn6 = new bn(6)
const bn31 = new bn(31)
const bn30 = new bn(30)
const delta = [bn6, bn4, bn2, bn4, bn2, bn4, bn6, bn2]

/**
 * Generates a random prime with specific number of bits.
 * @param {Number} bits The number of bits the prime with contain.
 * @returns {BigInteger} The generated prime.
 * @private
 */
function randomPrime(bits) {
  tf(tf.tuple(tf.Number), arguments)
  bits = new bn(bits)
  const minPrime = bn2.pow(bits.subtract(bn.one))
  const maxPrime = bn2.pow(bits).subtract(bn.one)
  let p
  while (true) {
    p = bn.randBetween(minPrime, maxPrime)
    p = p.add(new bn(bn31.subtract(p.mod(bn30))))
    let deltaIdx = 0
    while (p.bitLength().compareTo(bits) > 0) {
      if (p.isProbablePrime(1)) {
        break
      }
      p = p.add(delta[deltaIdx++ % delta.length])
    }
    if (p.bitLength().compareTo(bits) > 0) {
      continue
    }
    if (p.isProbablePrime(10)) {
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
    n = bn.zero
    p = randomPrime(pBits)
    q = randomPrime(qBits)
    n = p.multiply(q)
  } while (n.bitLength().toJSNumber() !== modulusBits)
  if (p.compare(q) < 0) {
    return {p: q, q: p}
  }
  return {p, q}
}

module.exports = generatePrimes
