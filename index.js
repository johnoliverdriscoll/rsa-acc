'use strict'
const assert = require('assert')
const bn = require('big-integer')
const crypto = require('crypto')
const tf = require('typeforce')
const constants = require('./constants')
const generatePrimes = require('./generate_primes')
const type = require('./type')

const bnBase = new bn(constants.BASE)
const bn2 = new bn(2)

class Accumulator {

  /**
   * Creates a new Accumulator instance. An Accumulator is a trusted party that stores a secret
   * and can modify the accumulation of member elements.
   * @param {(String|function)} H The name of a hash algorithm or a function that returns a digest
   * for an input String or Buffer.
   * @param {Primes} [primes] Optional secret primes.
   */
  constructor(H, primes) {
    tf(tf.tuple(type.Hash, tf.maybe(type.Primes)), arguments)
    const {p, q} = primes || generatePrimes(constants.MODULUS_BITS)
    this.H = H
    this.n = p.times(q)
    this.d = p.subtract(bn.one).multiply(q.subtract(bn.one))
    this.z = bnBase
  }

  /**
   * Add an element to the accumulator.
   * @param {(String|Buffer)} x The element to add.
   * @returns {Witness} An object that includes the element added and its witness. This object
   * can be passed to [updateWitness](#updateWitness),
   * [Accumulator.verify](#Accumulator+update), and [Accumulator.del](#Accumulator+del).
   */
  add(x) {
    tf(tf.tuple(type.Data), arguments)
    const y = mapToPrime(this.H, x)
    const w = this.z
    const n = this.n
    this.z = this.z.modPow(y, this.n)
    const z = this.z
    return {x, w, n, z}
  }

  /**
   * Delete an element from the accumulation.
   * @param {Witness} update An object previously returned from
   * [Accumulator.add](#Accumulator+add), [Accumulator.del](#Accumulator+del), or
   * [updateWitness](#updateWitness).
   * @returns {Update} An update object. This object can be passed to
   * [updateWitness](#updateWitness).
   */
  del({x, w}) {
    tf(tf.tuple(type.Witness), arguments)
    const y = mapToPrime(this.H, x)
    assert(verify.call(this, w, y), 'Accumulator does not contain x')
    const n = this.n
    this.z = this.z.modPow(y.modInv(this.d), this.n)
    const z = this.z
    return {x, n, z}
  }

  /**
   * Verify an element is a member of the accumulation.
   * @param {(Update|Witness)} updateOrWitness An update object returned from
   * [Accumulator.add](#Accumulator+add) or a witness object returned from
   * [updateWitness](#updateWitness).
   * @returns {Boolean} True if element is a member of the accumulation; false otherwise.
   */
  verify({x, w}) {
    tf(tf.tuple(tf.oneOf(type.Update, type.Witness)), arguments)
    const y = mapToPrime(this.H, x)
    return verify.call(this, w, y)
  }

}

/**
 * Update an element's witness. This must be called after each addition to or deletion
 * from the accumulation for each remaining element before it may be successfully verified.
 * @param {(Update|Witness)} updateOrWitness An update or witness object returned from
 * [Accumulator.add](#Accumulator+add) or [Accumulator.del](#Accumulator+del).
 * @param {Witness} witness A witness object returned from
 * [Accumulator.add](#Accumulator+add) or [updateWitness](#updateWitness).
 * @returns {Witness} An updated witness.
 */
function updateWitness(H, updateOrWitness, witness) {
  tf(tf.tuple(type.Hash, tf.oneOf(type.Update, type.Witness), type.Witness), arguments)
  let {x, w, n} = witness
  const yt = mapToPrime(H, updateOrWitness.x)
  let z
  if ('w' in updateOrWitness) {
    z = witness.z
    w = w.modPow(yt, n)
  } else {
    z = updateOrWitness.z
    const y = mapToPrime(H, x)
    const {a, b} = extendedGcd(y, yt)
    w = w.modPow(b, n).multiply(z.modPow(a, n)).mod(n)
  }
  return {x, w, n, z}
}

/**
 * Find a prime including or after a number.
 * @param {BigInteger} y The number.
 * @returns {BigInteger} The prime.
 * @private
 */
function nextPrime(y) {
  tf(tf.tuple(type.BigInteger), arguments)
  do {
    y = y.add(bn.one)
    if (y.isProbablePrime(10)) {
      return y
    }
  } while (true)
}

/**
 * @typedef {Object} GcdResult
 * @property {BigInteger} a The `a` coefficient.
 * @property {BigInteger} b The `b` coefficient.
 * @property {BigInteger} gcd The gcd.
 * @private
 */

/**
 * Extended GCD algorithm.
 * @param {BigInteger} x
 * @param {BigInteger} y
 * @returns {GcdResult}
 * @private
 */
function extendedGcd(x, y) {
  if (x.isZero()) {
    const a = bn.zero
    const b = bn.one
    const gcd = y
    return {a, b, gcd}
  }
  const res = extendedGcd(y.mod(x), x)
  const a = res.b.minus(y.divide(x).multiply(res.a))
  const b = res.a
  const {gcd} = res
  return {a, b, gcd}
}  

/**
 * Map data to a prime number.
 * @param {(String|function)} H The name of a hash algorithm or a function that produces a
 * digest for an input String or Buffer.
 * @param {(String|Buffer)} x The element to map.
 * @returns {BigInteger} The prime.
 * @private
 */
function mapToPrime(H, x) {
  tf(tf.tuple(type.Hash, type.Data), arguments)
  let hash
  if (typeof(H) === 'string') {
    hash = x => crypto.createHash(H).update(x).digest()
  } else {
    hash = H
  }
  const digest = new bn(hash(x).toString('hex'), 16)
  const maxPrime = bn2.pow(constants.PRIME_BITS)
  return nextPrime(digest.and(maxPrime.subtract(bn.one))).mod(maxPrime)
}

/**
 * Verify an element's membership given its witness.
 * @param {BigInteger} w The element's witness.
 * @param {BigInteger} y The prime the element is mapped to.
 * @returns {Boolean} True if element is a member of the accumulation; false otherwise.
 * @private
 */
function verify(w, y) {
  tf(tf.tuple(type.BigInteger, type.BigInteger), arguments)
  return w.modPow(y, this.n).compareTo(this.z) === 0
}

module.exports = {
  Accumulator,
  updateWitness,
}
