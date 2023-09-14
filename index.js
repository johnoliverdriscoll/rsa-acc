'use strict'
const assert = require('assert')
const {isProbablyPrime} = require('bigint-crypto-utils')
const {eGcd, modPow, modInv} = require('bigint-mod-arith')
const {webcrypto: {subtle}} = require('crypto')
const tf = require('typeforce')
const constants = require('./constants')
const generatePrimes = require('./generate_primes')
const type = require('./type')

class Accumulator {

  /**
   * Creates a new Accumulator instance. An Accumulator is a trusted party that stores a secret
   * and can modify the accumulation of member elements.
   * @param {(String|function)} H The name of a hash algorithm or a function that returns a digest
   * for an input String or Buffer.
   * @param {(Primes|BigInt)} [key] Optional secret primes or public modulus. If no argument
   * given, secret primes will be generated.
   */
  constructor(H, key) {
    tf(tf.tuple(type.Hash, tf.maybe(tf.oneOf(type.Primes, type.BigInt))), arguments)
    if (type.BigInt(key)) {
      this.n = key
    } else {
      if (!type.Primes(key)) {
        key = generatePrimes(constants.MODULUS_BITS)
      }
      const {p, q} = key
      this.n = p * q
      this.d = (p - 1n) * (q - 1n)
    }
    this.H = H
    this.z = BigInt(constants.BASE)
  }

  /**
   * Add an element to the accumulator.
   * @param {(String|Buffer)} x The element to add.
   * @returns {Promise<Witness>} A witness of the element's membership.
   */
  async add(x) {
    tf(tf.tuple(type.Data), arguments)
    const y = await mapToPrime(this.H, x)
    const w = this.z
    const n = this.n
    this.z = modPow(this.z, y, this.n)
    const z = this.z
    return {x, w, n, z}
  }

  /**
   * Delete an element from the accumulation.
   * @param {(String|Buffer)} x The element to delete.
   * @returns {Promise<Update>} An update object.
   */
  async del(x) {
    tf(tf.tuple(type.Data), arguments)
    const y = await mapToPrime(this.H, x)
    const n = this.n
    this.z = modPow(this.z, modInv(y, this.d), this.n)
    const z = this.z
    return {x, n, z}
  }

  /**
   * Verify an element is a member of the accumulation.
   * @param {Witness} A witness of the element's membership.
   * @returns {Promise<Boolean>} True if element is a member of the accumulation;
   * false otherwise.
   */
  async verify({x, w}) {
    tf(tf.tuple(tf.oneOf(type.Update, type.Witness)), arguments)
    const y = await mapToPrime(this.H, x)
    return await verify.call(this, w, y)
  }

  /**
   * Prove an element's membership.
   * @param {(String|Buffer)} x The element to prove.
   * @returns {Promise<Witness>} A witness of the element's membership.
   */
  async prove(x) {
    tf(tf.tuple(type.Data), arguments)
    const y = await mapToPrime(this.H, x)
    const w = modPow(this.z, modInv(y, this.d), this.n)
    const n = this.n
    const z = this.z
    return {x, w, n, z}
  }

}

/**
 * Update an element's witness. This must be called after each addition to or deletion
 * from the accumulation for each remaining element before it may be successfully verified.
 * @param {(String|function)} H The name of a hash algorithm or a function that returns a digest
 * for an input String or Buffer.
 * @param {(Update|Witness)} updateOrWitness A witness to an element's membersihp or an
 * update from an element's deletion.
 * @param {Witness} witness The element witness to update.
 * @returns {Witness} An updated witness.
 */
async function updateWitness(H, updateOrWitness, witness) {
  tf(tf.tuple(type.Hash, tf.oneOf(type.Update, type.Witness), type.Witness), arguments)
  let {x, w, n} = witness
  const yt = await mapToPrime(H, updateOrWitness.x)
  let z
  if ('w' in updateOrWitness) {
    z = witness.z
    w = modPow(w, yt, n)
  } else {
    z = updateOrWitness.z
    const y = await mapToPrime(H, x)
    const {x: a, y: b} = eGcd(y, yt)
    w = (modPow(w, b, n) * modPow(z, a, n)) % n
  }
  return {x, w, n, z}
}

/**
 * Find a prime including or after a number.
 * @param {BigInt} y The number.
 * @returns {BigInt} The prime.
 * @private
 */
function nextPrime(y) {
  tf(tf.tuple(type.BigInt), arguments)
  if (y % 2n === 0n) {
    y += 1n
    if (isProbablyPrime(y, 24)) {
      return y
    }
  }
  do {
    y += 2n
    if (isProbablyPrime(y, 24)) {
      return y
    }
  } while (true)
}

/**
 * Return a hex string representing the data in a buffer.
 * @param {Buffer} buffer The buffer to hexlify.
 * @returns {String} The hex representation of the buffer.
 * @private
 */
function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('')
}

/**
 * Map data to a prime number.
 * @param {(String|function)} H The name of a hash algorithm or a function that produces a
 * digest for an input String or Buffer.
 * @param {(String|Buffer)} x The element to map.
 * @returns {BigInt} The prime.
 * @private
 */
async function mapToPrime(H, x) {
  tf(tf.tuple(type.Hash, type.Data), arguments)
  let hash
  if (typeof(H) === 'string') {
    hash = async d => await subtle.digest(H, d)
  } else {
    hash = H
  }
  const maxPrime = 1n << BigInt(constants.PRIME_BITS)
  return nextPrime(BigInt('0x' + bufferToHex(await hash(x))) & (maxPrime - 1n)) % maxPrime
}

/**
 * Verify an element's membership given its witness.
 * @param {BigInt} w The element's witness.
 * @param {BigInt} y The prime the element is mapped to.
 * @returns {Boolean} True if element is a member of the accumulation; false otherwise.
 * @private
 */
function verify(w, y) {
  tf(tf.tuple(type.BigInt, type.BigInt), arguments)
  return modPow(w, y, this.n) === this.z
}

module.exports = {
  Accumulator,
  updateWitness,
}
