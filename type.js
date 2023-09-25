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

const Accumulator = tf.quacksLike('Accumulator')

const Update = tf.quacksLike('Update')

const Witness = tf.quacksLike('Witness')

module.exports = {
  BigInt,
  Data,
  Hash,
  Primes,
  Accumulator,
  Update,
  Witness,
}
