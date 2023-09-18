'use strict'
const tf = require('typeforce')

/**
 * @typedef {Object} BigInt
 */
function BigInt(x) {
  return typeof x === 'bigint'
}
BigInt.toJSON = () => 'bigint'

const Data = tf.oneOf(tf.String, tf.Buffer)

const Hash = tf.oneOf(tf.String, tf.Function)

/**
 * @typedef {Object} Primes
 * @property {BigInt} p The larger prime.
 * @property {BigInt} q The lesser prime.
 */
const Primes = tf.object({
  p: BigInt,
  q: BigInt,
})

/**
 * @typedef {Object} Update
 * @property {(String|Buffer)} x The element.
 * @property {BigInt} n The modulus.
 * @property {BigInt} z The accumulation.
 */
const Update = tf.quacksLike('Update')

/**
 * @typedef {Object} Witness
 * @property {(String|Buffer)} x The element.
 * @property {BigInt} w The witness.
 * @property {BigInt} n The modulus.
 * @property {BigInt} z The accumulation.
 */
const Witness = tf.quacksLike('Witness')

module.exports = {
  BigInt,
  Data,
  Hash,
  Primes,
  Update,
  Witness,
}
