# rsa-acc

This is an implementation of a cryptographic accumulator over the RSA cryptosystem.

Features:

* __Constant time accumulation__: Updating the accumulation does not require access
to all previously accumulated values.
* __Constant size accumulation__: Components of the accumulation are constant size.
* __Trustless proofs__: An untrusted prover may compute a witness of membership
for any accumulated element without knowledge of any sensitive information.
* __Constant time witness updates__: Updating witness does not require access
to all previously accumulated values.

## Setup

```shell
$ git clone https://github.com/johnoliverdriscoll/rsa-acc
$ cd rsa-acc
$ npm install
```

## Tutorial

Constructing an accumulator requires generating an RSA key (a random key is generated
if you do not give it one).

```javascript
// Import rsa-acc.
const {Accumulator, updateWitness} = require('rsa-acc')
// An algorithm used to map data to elements in Z_q.
const hash = 'sha256'
// Construct a trusted accumulator.
const accumulator = new Accumulator(hash)
```

When adding an element, the accumulator returns a witness that can be used to verify
its membership later.

```javascript
// Add an element.
const d1 = '1'
const u1 = accumulator.add(d1)
// Verify the result.
assert(accumulator.verify(u1))
```

Subsequent additions of elements invalidate the previously returned witnesses. 

```javascript
// Add a new element.
const d2 = '2'
const u2 = accumulator.add(d2)
// Verify the result.
assert(accumulator.verify(u2))
// Demonstrate that the witness for d1 is no longer valid.
assert(accumulator.verify(u1) === false)
```

Previous witnesses can be updated using the witnesses returned from subsequent
additions.

```javascript
// Update the witness for d1.
const w1 = updateWitness(H, u2, u1)
// Verify the result.
assert(accumulator.verify(w1))
```

An element can be deleted from the accumulator, which invalidates its witness.

```javascript
// Delete d1 from the accumulator.
const u3 = accumulator.del(w1)
// Demonstrate that the original witness is no longer valid.
assert(accumulator.verify(w1) === false)
```

Previous witnesses must be updated after a deletion as well.

```javascript
// Update the witness for the remaining element.
const w2 = updateWitness(H, u3, w1)
// Demonstrate that the new witness is valid.
assert(accumulator.verify(w2))
```

The witness for the deleted item will not be valid until it is added to the
accumulator again.

```javascript
// Update the witness for the deleted element.
const w3 = updateWitness(H, u3, u2)
// Demonstrate that the new witness is not valid either.
assert(accumulator.verify(w3) === false)
```

# API Reference

## Classes

<dl>
<dt><a href="#Accumulator">Accumulator</a></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#updateWitness">updateWitness(updateOrWitness, witness)</a> ⇒ <code><a href="#Witness">Witness</a></code></dt>
<dd><p>Update an element&#39;s witness. This must be called after each addition to or deletion
from the accumulation for each remaining element before it may be successfully verified.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#BigInteger">BigInteger</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#Primes">Primes</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#Update">Update</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#Witness">Witness</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a name="Accumulator"></a>

## Accumulator
**Kind**: global class  

* [Accumulator](#Accumulator)
    * [new Accumulator(H, [primes])](#new_Accumulator_new)
    * [.add(x)](#Accumulator+add) ⇒ [<code>Witness</code>](#Witness)
    * [.del(update)](#Accumulator+del) ⇒ [<code>Update</code>](#Update)
    * [.verify(updateOrWitness)](#Accumulator+verify) ⇒ <code>Boolean</code>

<a name="new_Accumulator_new"></a>

### new Accumulator(H, [primes])
Creates a new Accumulator instance. An Accumulator is a trusted party that stores a secret
and can modify the accumulation of member elements.


| Param | Type | Description |
| --- | --- | --- |
| H | <code>String</code> \| <code>function</code> | The name of a hash algorithm or a function that returns a digest for an input String or Buffer. |
| [primes] | [<code>Primes</code>](#Primes) | Optional secret primes. |

<a name="Accumulator+add"></a>

### accumulator.add(x) ⇒ [<code>Witness</code>](#Witness)
Add an element to the accumulator.

**Kind**: instance method of [<code>Accumulator</code>](#Accumulator)  
**Returns**: [<code>Witness</code>](#Witness) - An object that includes the element added and its witness. This object
can be passed to [updateWitness](#updateWitness),
[Accumulator.verify](#Accumulator+update), and [Accumulator.del](#Accumulator+del).  

| Param | Type | Description |
| --- | --- | --- |
| x | <code>String</code> \| <code>Buffer</code> | The element to add. |

<a name="Accumulator+del"></a>

### accumulator.del(update) ⇒ [<code>Update</code>](#Update)
Delete an element from the accumulation.

**Kind**: instance method of [<code>Accumulator</code>](#Accumulator)  
**Returns**: [<code>Update</code>](#Update) - An update object. This object can be passed to
[updateWitness](#updateWitness).  

| Param | Type | Description |
| --- | --- | --- |
| update | [<code>Witness</code>](#Witness) | An object previously returned from [Accumulator.add](#Accumulator+add), [Accumulator.del](#Accumulator+del), or [updateWitness](#updateWitness). |

<a name="Accumulator+verify"></a>

### accumulator.verify(updateOrWitness) ⇒ <code>Boolean</code>
Verify an element is a member of the accumulation.

**Kind**: instance method of [<code>Accumulator</code>](#Accumulator)  
**Returns**: <code>Boolean</code> - True if element is a member of the accumulation; false otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| updateOrWitness | [<code>Update</code>](#Update) \| [<code>Witness</code>](#Witness) | An update object returned from [Accumulator.add](#Accumulator+add) or a witness object returned from [updateWitness](#updateWitness). |

<a name="updateWitness"></a>

## updateWitness(updateOrWitness, witness) ⇒ [<code>Witness</code>](#Witness)
Update an element's witness. This must be called after each addition to or deletion
from the accumulation for each remaining element before it may be successfully verified.

**Kind**: global function  
**Returns**: [<code>Witness</code>](#Witness) - An updated witness.  

| Param | Type | Description |
| --- | --- | --- |
| updateOrWitness | [<code>Update</code>](#Update) \| [<code>Witness</code>](#Witness) | An update or witness object returned from [Accumulator.add](#Accumulator+add) or [Accumulator.del](#Accumulator+del). |
| witness | [<code>Witness</code>](#Witness) | A witness object returned from [Accumulator.add](#Accumulator+add) or [updateWitness](#updateWitness). |

<a name="BigInteger"></a>

## BigInteger : <code>Object</code>
**Kind**: global typedef  
<a name="Primes"></a>

## Primes : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| p | [<code>BigInteger</code>](#BigInteger) | The larger prime. |
| q | [<code>BigInteger</code>](#BigInteger) | The lesser prime. |

<a name="Update"></a>

## Update : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| x | <code>String</code> \| <code>Buffer</code> | The element. |
| n | [<code>BigInteger</code>](#BigInteger) | The modulus. |
| z | [<code>BigInteger</code>](#BigInteger) | The accumulation. |

<a name="Witness"></a>

## Witness : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| x | <code>String</code> \| <code>Buffer</code> | The element. |
| w | [<code>BigInteger</code>](#BigInteger) | The witness. |
| n | [<code>BigInteger</code>](#BigInteger) | The modulus. |
| z | [<code>BigInteger</code>](#BigInteger) | The accumulation. |

