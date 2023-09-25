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
    const {y, nonce} = await mapToPrime(this.H, x)
    const w = this.z
    const n = this.n
    this.z = modPow(this.z, y, this.n)
    return new Witness(x, nonce, w)
  }

  /**
   * Delete an element from the accumulation.
   * @param {Witness} witness Witness of element to delete.
   * @returns {Promise<BigInt>} The new accumulation.
   */
  async del({x, nonce}) {
    tf(tf.tuple(type.Witness), arguments)
    const y = await mapToBigInt(this.H, x) + nonce
    const n = this.n
    this.z = modPow(this.z, modInv(y, this.d), this.n)
    return this.z
  }

  /**
   * Verify an element is a member of the accumulation.
   * @param {Witness} witness A witness of the element's membership.
   * @returns {Promise<Boolean>} True if element is a member of the accumulation;
   * false otherwise.
   */
  async verify({x, nonce, w}) {
    tf(tf.tuple(type.Witness), arguments)
    const y = await mapToBigInt(this.H, x) + nonce
    return modPow(w, y, this.n) === this.z
  }

  /**
   * Prove an element's membership.
   * @param {(String|Buffer)} x The element to prove.
   * @returns {Promise<Witness>} A witness of the element's membership.
   */
  async prove(x) {
    tf(tf.tuple(type.Data), arguments)
    const {y, nonce} = await mapToPrime(this.H, x)
    const w = modPow(this.z, modInv(y, this.d), this.n)
    const n = this.n
    const z = this.z
    return new Witness(x, nonce, w, n, z)
  }

}

class Witness {

  /**
   * Creates a new Witness instance. 
   * @param {Data} x The element.
   * @param {BigInt} nonce Sums to a prime when added to `H(x)`.
   * @param {BigInt} w The accumulation value less the element.
   */
  constructor(x, nonce, w) {
    tf(tf.tuple(type.Data, type.BigInt, type.BigInt), arguments)
    this.x = x
    this.nonce = nonce
    this.w = w
  }

}

class Update {

  /**
   * Creates a new Update instance. 
   * @param {Accumulator} accumulator The current accumulation.
   */
  constructor({H, n, z}) {
    tf(tf.tuple(type.Accumulator), arguments)
    this.H = H
    this.n = n
    this.z = z
    this.piA = 1n
    this.piD = 1n
  }

  /**
   * Absorb an addition to the update.
   * @param {Witness} witness A witness of the element's addition.
   */
  async add({x, nonce}) {
    tf(tf.tuple(type.Witness), arguments)
    const y = await mapToBigInt(this.H, x) + nonce
    this.piA *= y
  }

  /**
   * Absorb a deletion to the update.
   * @param {Witness} witness A witness of the element's addition.
   */
  async del({x, nonce}) {
    tf(tf.tuple(type.Witness), arguments)
    const y = await mapToBigInt(this.H, x) + nonce
    this.piD *= y
  }

  /**
   * Remove an addition from the update.
   * @param {Witness} witness A witness of the element's addition.
   */
  async undoAdd({x, nonce}) {
    tf(tf.tuple(type.Witness), arguments)
    const y = await mapToBigInt(this.H, x) + nonce
    this.piA /= y
  }

  /**
   * Remove a deletion from the update.
   * @param {Witness} witness A witness of the element's addition.
   */
  async undoDel({x, nonce}) {
    tf(tf.tuple(type.Witness), arguments)
    const y = await mapToBigInt(this.H, x) + nonce
    this.piD /= y
  }

  /**
   * Update the witness. This must be called after each addition to or deletion
   * from the accumulation for each remaining element before it may be successfully verified.
   * @param {Witness} witness The witness to update.
   * @returns {Promise<Witness>} An updated witness.
   */
  async update({x, nonce, w}) {
    tf(tf.tuple(tf.oneOf(type.Witness)), arguments)
    const y = await mapToBigInt(this.H, x) + nonce
    const {x: a, y: b} = eGcd(this.piD, y)
    return new Witness(
      x,
      nonce,
      (modPow(w, a * this.piA, this.n) * modPow(this.z, b, this.n)) % this.n,
    )
  }

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
  tf(tf.tuple(tf.oneOf(tf.Buffer, tf.quacksLike('ArrayBuffer'))), arguments)
  return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('')
}

/**
 * Produce a hash digest from some data.
 * @param {(String|function)} H The name of a hash algorithm or a function that produces a
 * digest for an input String or Buffer.
 * @param {(String|Buffer)} x The element to map.
 * @returns {Promise<Buffer>} The digest.
 * @private
 */
async function hash(H, x) {
  tf(tf.tuple(type.Hash, type.Data), arguments)
  if (typeof(H) === 'string') {
    return await subtle.digest(H, x)
  }
  return H(x)
}

/**
 * Hash an element and interpret it as a number.
 * @param {(String|Buffer)} x The element to map.
 * @returns {Promise<Buffer>} The digest.
 * @private
 */
async function mapToBigInt(H, x) {
  tf(tf.tuple(type.Hash, type.Data), arguments)
  const maxPrime = 1n << BigInt(constants.PRIME_BITS)
  return BigInt('0x' + bufferToHex(await hash(H, x))) & (maxPrime - 1n)
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
  const maxPrime = 1n << BigInt(constants.PRIME_BITS)
  const d = await mapToBigInt(H, x)
  const y = nextPrime(d) % maxPrime
  const nonce = y - d
  return {y, nonce}
}

module.exports = {
  Accumulator,
  Witness,
  Update,
}
