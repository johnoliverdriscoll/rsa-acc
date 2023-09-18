'use strict'
const {webcrypto: {subtle}} = require('crypto')
const fixtures = require('./fixtures')
const {Accumulator, Update, Witness} = require('..')

describe('with sha256', function() {

  describe('with hash name', function() {

    const H = 'SHA-256'

    describe('with optional primes', function() {

      const primes = {
        p: BigInt(fixtures.p),
        q: BigInt(fixtures.q),
      }

      describe('Accumulator', function() {

        it('constructs accumulator', function() {
          new Accumulator(H, primes)
        })

        describe('add', function() {

          let accumulator

          before('constructs accumulator', function() {
            accumulator = new Accumulator(H, primes)
          })

          const items = fixtures.manyItems

          it('accumulates items', async function() {
            for (let item of items) {
              const witness = await accumulator.add(item)
              witness.should.be.instanceOf(Witness)
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
              const update = await accumulator.del(item)
              update.should.be.instanceOf(Update)
              witness = await witness.update(update)
              await accumulator.verify(witness).should.be.fulfilledWith(true)
            }
          })

        })

      })

      describe('Witness', function() {

        describe('update', function() {

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
                witness = await witness.update(witnesses[index++])
              }
              await accumulator.verify(witness).should.be.fulfilledWith(true)
            }
          })

        })

      })

    })

    describe('with public modulus', function() {

      const n = BigInt(fixtures.p) * BigInt(fixtures.q)

      it('constructs accumulator', function() {
        new Accumulator(H, n)
      })

      describe('add', function() {

        let accumulator

        before('constructs accumulator', function() {
          accumulator = new Accumulator(H, n)
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
          accumulator = new Accumulator(H, n)
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

      })

      describe('del', function() {

        let accumulator

        before('constructs accumulator', function() {
          accumulator = new Accumulator(H, n)
        })

        let witness

        before('accumulates item', async function() {
          witness = await accumulator.add('a')
        })

        it('throws', async function() {
          await accumulator.del(witness).should.be.rejected()
        })

      })

      describe('prove', function() {

        let accumulator

        before('constructs accumulator', function() {
          accumulator = new Accumulator(H, n)
        })

        const item = 'a'

        before('accumulates item', async function() {
          await accumulator.add(item)
        })

        it('throws', async function() {
          await accumulator.prove(item).should.be.rejected()
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
