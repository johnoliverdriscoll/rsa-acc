'use strict'
const tf = require('typeforce')

/**
 * @typedef {Object} BigInteger
 */
const BigInteger = tf.quacksLike('Integer')
BigInteger.toJSON = () => 'BigInteger'

const Data = tf.oneOf(tf.String, tf.Buffer)

const Hash = tf.oneOf(tf.String, tf.Function)

/**
 * @typedef {Object} Primes
 * @property {BigInteger} p The larger prime.
 * @property {BigInteger} q The lesser prime.
 */
const Primes = tf.object({
  p: BigInteger,
  q: BigInteger,
})

/**
 * @typedef {Object} Update
 * @property {(String|Buffer)} x The element.
 * @property {BigInteger} n The modulus.
 * @property {BigInteger} z The accumulation.
 */
const Update = tf.object({
  x: tf.oneOf(tf.String, tf.Buffer),
  w: tf.Null,
  n: BigInteger,
  z: BigInteger,
})

/**
 * @typedef {Object} Witness
 * @property {(String|Buffer)} x The element.
 * @property {BigInteger} w The witness.
 * @property {BigInteger} n The modulus.
 * @property {BigInteger} z The accumulation.
 */
const Witness = tf.object({
  x: tf.oneOf(tf.String, tf.Buffer),
  w: BigInteger,
  n: BigInteger,
  z: BigInteger,
})

module.exports = {
  BigInteger,
  Data,
  Hash,
  Primes,
  Update,
  Witness,
}
