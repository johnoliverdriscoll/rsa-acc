'use strict'
const bn = require('big-integer')
const crypto = require('crypto')
const fixtures = require('./fixtures')
const {Accumulator, updateWitness} = require('..')

describe('with sha256', function() {

  describe('with hash name', function() {

    const H = 'sha256'

    describe('with optional primes', function() {

      const primes = {
        p: new bn(fixtures.p, 10),
        q: new bn(fixtures.q, 10),
      }

      const items = fixtures.manyItems
      let accumulator
      let witnesses

      it('constructs accumulator', function() {
        accumulator = new Accumulator(H, primes)
      })

      it('accumulates items', function() {
        witnesses = items.map((item) => {
          const witness = accumulator.add(item)
          accumulator.verify(witness).should.equal(true)
          return witness
        })
      })

      it('fails to verify outdated witnesses', function() {
        witnesses.slice(0, -1).forEach(witness => accumulator.verify(witness).should.equal(false))
      })

      it('updates witnesses', function() {
        witnesses = witnesses.slice(0, -1).map((witness, index) => {
          index++
          while (index < witnesses.length) {
            witness = updateWitness(H, witnesses[index++], witness)
          }
          return witness
        })
        witnesses.forEach(witness => accumulator.verify(witness).should.equal(true))
      })

      it('deletes items', function() {
        const updates = []
        witnesses.forEach((witness, index) => {
          updates.forEach(update => witness = updateWitness(H, update, witness))
          updates.push(accumulator.del(witness))
          accumulator.verify(witness).should.equal(false)
        })
      })

    })

    describe('with random primes', function() {

      const items = fixtures.fewItems

      it('accumulates items', function() {
        const accumulator = new Accumulator('sha256')
        items.forEach(item => accumulator.verify(accumulator.add(item)).should.equal(true))
      })

    })

  })

  describe('with hash function', function() {

    const H = x => crypto.createHash('sha256').update(x).digest()
    const primes = {
      p: new bn(fixtures.p),
      q: new bn(fixtures.q),
    }
    const items = fixtures.fewItems

    it('accumulates items', function() {
      const accumulator = new Accumulator(H, primes)
      items.forEach(item => accumulator.verify(accumulator.add(item)).should.equal(true))
    })

  })

})
