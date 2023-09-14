'use strict'
const {webcrypto: {subtle}} = require('crypto')
const fixtures = require('./fixtures')
const {Accumulator, updateWitness} = require('..')

describe('with sha256', function() {

  describe('with hash name', function() {

    const H = 'SHA-256'

    describe('with optional primes', function() {

      const primes = {
        p: BigInt(fixtures.p),
        q: BigInt(fixtures.q),
      }

      let accumulator

      it('constructs accumulator', function() {
        accumulator = new Accumulator(H, primes)
      })

      describe('add', function() {

        let accumulator

        before('constructs accumulator', function() {
          accumulator = new Accumulator(H, primes)
        })

        const items = fixtures.manyItems

        it('accumulates items', async function() {
          for (let item of items) {
            await accumulator.add(item)
          }
        })

      })

      describe('verify', function() {

        let accumulator

        before('constructs accumulator', function() {
          accumulator = new Accumulator(H, primes)
        })

        const items = fixtures.manyItems
        const witnesses = []

        before('accumulates items', async function() {
          for (let item of items) {
            witnesses.push(await accumulator.add(item))
          }
        })

        it('verifies recent witness', async function() {
          await accumulator.verify(witnesses[witnesses.length - 1]).should.be.fulfilledWith(true)
        })

        it('fails to verify outdated witnesses', async function() {
          for (let witness of witnesses.slice(0, -1)) {
            await accumulator.verify(witness).should.be.fulfilledWith(false)
          }
        })

      })

      describe('prove', function() {

        let accumulator

        before('constructs accumulator', function() {
          accumulator = new Accumulator(H, primes)
        })

        const items = fixtures.fewItems

        before('accumulates items', async function() {
          for (let item of items) {
            await accumulator.add(item)
          }
        })

        it('proves membership', async function() {
          for (let item of items) {
            await accumulator.verify(await accumulator.prove(item)).should.be.fulfilledWith(true)
          }
        })

      })

      describe('updateWitnesses', function() {

        let accumulator

        before('constructs accumulator', function() {
          accumulator = new Accumulator(H, primes)
        })

        const items = fixtures.fewItems
        const witnesses = []

        before('accumulates items', async function() {
          for (let item of items) {
            witnesses.push(await accumulator.add(item))
          }
        })

        it('updates witnesses', async function() {
          for (let i = 0; i < witnesses.length; i++) {
            let index = i + 1
            let witness = witnesses[i]
            while (index < witnesses.length) {
              witness = await updateWitness(H, witnesses[index++], witness)
            }
            await accumulator.verify(witness).should.be.fulfilledWith(true)
          }
        })

      })

      describe('del', function() {

        let accumulator

        before('constructs accumulator', function() {
          accumulator = new Accumulator(H, primes)
        })

        const items = fixtures.fewItems
        const witnesses = []

        before('accumulates items', async function() {
          for (let item of items) {
            witnesses.push(await accumulator.add(item))
          }
        })

        it('deletes items', async function() {
          let witness = witnesses.pop()
          for (let item of items.slice(0, -1)) {
            witness = await updateWitness(H, await accumulator.del(item), witness)
            await accumulator.verify(witness).should.be.fulfilledWith(true)
          }
        })

      })

    })

    describe('with random primes', function() {

      const items = fixtures.fewItems

      it('accumulates items', async function() {
        const accumulator = new Accumulator('SHA-256')
        for (let item of items) {
          await accumulator.verify(await accumulator.add(item)).should.be.fulfilledWith(true)
        }
      })

    })

  })

  describe('with hash function', function() {

    const H = async d => await subtle.digest('SHA-256', d)
    const primes = {
      p: BigInt(fixtures.p),
      q: BigInt(fixtures.q),
    }
    const items = fixtures.fewItems

    it('accumulates items', async function() {
      const accumulator = new Accumulator(H, primes)
      for (let item in items) {
        await accumulator.verify(await accumulator.add(item)).should.be.fulfilledWith(true)
      }
    })

  })

})
