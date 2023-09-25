# rsa-acc

This is an implementation of a CL cryptographic accumulator over the RSA cryptosystem.

Features:

* __Constant time accumulation__: Updating the accumulation does not require access
to all previously accumulated values.
* __Constant size accumulation__: Components of the accumulation are constant size.
* __Trustless proofs__: An untrusted prover may compute a witness of membership
for any accumulated element without knowledge of any sensitive information.
* __Constant time witness updates__: Trustless witness updates are $O(1)$.

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
const {Accumulator, Update} = require('rsa-acc')
// An algorithm used to map data to elements in Z_q.
const hash = 'SHA-256'
// Construct a trusted accumulator.
const accumulator = new Accumulator(hash)
```

When adding an element, the accumulator returns a witness that can be used to verify
its membership later.

```javascript
// Add an element.
const d1 = '1'
const d1w1 = await accumulator.add(d1)
// Verify the result.
assert(await accumulator.verify(d1w1))
```

Subsequent additions of elements invalidate the previously returned witnesses. 

```javascript
// Add a new element.
const d2 = '2'
const d2w1 = await accumulator.add(d2)
// Verify the result.
assert(await accumulator.verify(d2w1))
// Demonstrate that the witness for d1 is no longer valid.
assert(await accumulator.verify(d1w1) === false)
```

Previous witnesses can be updated using the witnesses returned from subsequent
additions.

```javascript
// Update the witness for d1.
const update = new Update(accumulator)
await update.add(d2w1)
const d1w2 = await update.update(d1w1)
// Verify the result.
assert(await accumulator.verify(d1w2))
```

An element can be deleted from the accumulator, which invalidates its witness.

```javascript
// Delete d1 from the accumulator.
await accumulator.del(d1w2)
// Demonstrate that the element's witnesses are no longer valid.
assert(await accumulator.verify(d1w1) === false)
assert(await accumulator.verify(d1w2) === false)
```

Previous witnesses must be updated after a deletion as well.

```javascript
// Update the witness for the remaining element.
const update = new Update(accumulator)
await update.del(d1w2)
const d2w2 = await update.update(d2w1)
// Demonstrate that the new witness is valid.
assert(await accumulator.verify(d2w2))
```

# API Reference

## Classes

<dl>
<dt><a href="#Accumulator">Accumulator</a></dt>
<dd></dd>
<dt><a href="#Witness">Witness</a></dt>
<dd></dd>
<dt><a href="#Update">Update</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#BigInt">BigInt</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#Primes">Primes</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a name="Accumulator"></a>

## Accumulator
**Kind**: global class  

* [Accumulator](#Accumulator)
    * [new Accumulator(H, [key])](#new_Accumulator_new)
    * [.add(x)](#Accumulator+add) ⇒ [<code>Promise.&lt;Witness&gt;</code>](#Witness)
    * [.del(witness)](#Accumulator+del) ⇒ [<code>Promise.&lt;BigInt&gt;</code>](#BigInt)
    * [.verify(witness)](#Accumulator+verify) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.prove(x)](#Accumulator+prove) ⇒ [<code>Promise.&lt;Witness&gt;</code>](#Witness)

<a name="new_Accumulator_new"></a>

### new Accumulator(H, [key])
Creates a new Accumulator instance. An Accumulator is a trusted party that stores a secret
and can modify the accumulation of member elements.


| Param | Type | Description |
| --- | --- | --- |
| H | <code>String</code> \| <code>function</code> | The name of a hash algorithm or a function that returns a digest for an input String or Buffer. |
| [key] | [<code>Primes</code>](#Primes) \| [<code>BigInt</code>](#BigInt) | Optional secret primes or public modulus. If no argument given, secret primes will be generated. |

<a name="Accumulator+add"></a>

### accumulator.add(x) ⇒ [<code>Promise.&lt;Witness&gt;</code>](#Witness)
Add an element to the accumulator.

**Kind**: instance method of [<code>Accumulator</code>](#Accumulator)  
**Returns**: [<code>Promise.&lt;Witness&gt;</code>](#Witness) - A witness of the element's membership.  

| Param | Type | Description |
| --- | --- | --- |
| x | <code>String</code> \| <code>Buffer</code> | The element to add. |

<a name="Accumulator+del"></a>

### accumulator.del(witness) ⇒ [<code>Promise.&lt;BigInt&gt;</code>](#BigInt)
Delete an element from the accumulation.

**Kind**: instance method of [<code>Accumulator</code>](#Accumulator)  
**Returns**: [<code>Promise.&lt;BigInt&gt;</code>](#BigInt) - The new accumulation.  

| Param | Type | Description |
| --- | --- | --- |
| witness | [<code>Witness</code>](#Witness) | Witness of element to delete. |

<a name="Accumulator+verify"></a>

### accumulator.verify(witness) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Verify an element is a member of the accumulation.

**Kind**: instance method of [<code>Accumulator</code>](#Accumulator)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - True if element is a member of the accumulation;
false otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| witness | [<code>Witness</code>](#Witness) | A witness of the element's membership. |

<a name="Accumulator+prove"></a>

### accumulator.prove(x) ⇒ [<code>Promise.&lt;Witness&gt;</code>](#Witness)
Prove an element's membership.

**Kind**: instance method of [<code>Accumulator</code>](#Accumulator)  
**Returns**: [<code>Promise.&lt;Witness&gt;</code>](#Witness) - A witness of the element's membership.  

| Param | Type | Description |
| --- | --- | --- |
| x | <code>String</code> \| <code>Buffer</code> | The element to prove. |

<a name="Witness"></a>

## Witness
**Kind**: global class  
<a name="new_Witness_new"></a>

### new Witness(x, nonce, w)
Creates a new Witness instance.


| Param | Type | Description |
| --- | --- | --- |
| x | <code>Data</code> | The element. |
| nonce | [<code>BigInt</code>](#BigInt) | Sums to a prime when added to `H(x)`. |
| w | [<code>BigInt</code>](#BigInt) | The accumulation value less the element. |

<a name="Update"></a>

## Update
**Kind**: global class  

* [Update](#Update)
    * [new Update(accumulator)](#new_Update_new)
    * [.add(witness)](#Update+add)
    * [.del(witness)](#Update+del)
    * [.undoAdd(witness)](#Update+undoAdd)
    * [.undoDel(witness)](#Update+undoDel)
    * [.update(witness)](#Update+update) ⇒ [<code>Promise.&lt;Witness&gt;</code>](#Witness)

<a name="new_Update_new"></a>

### new Update(accumulator)
Creates a new Update instance.


| Param | Type | Description |
| --- | --- | --- |
| accumulator | [<code>Accumulator</code>](#Accumulator) | The current accumulation. |

<a name="Update+add"></a>

### update.add(witness)
Absorb an addition to the update.

**Kind**: instance method of [<code>Update</code>](#Update)  

| Param | Type | Description |
| --- | --- | --- |
| witness | [<code>Witness</code>](#Witness) | A witness of the element's addition. |

<a name="Update+del"></a>

### update.del(witness)
Absorb a deletion to the update.

**Kind**: instance method of [<code>Update</code>](#Update)  

| Param | Type | Description |
| --- | --- | --- |
| witness | [<code>Witness</code>](#Witness) | A witness of the element's addition. |

<a name="Update+undoAdd"></a>

### update.undoAdd(witness)
Remove an addition from the update.

**Kind**: instance method of [<code>Update</code>](#Update)  

| Param | Type | Description |
| --- | --- | --- |
| witness | [<code>Witness</code>](#Witness) | A witness of the element's addition. |

<a name="Update+undoDel"></a>

### update.undoDel(witness)
Remove a deletion from the update.

**Kind**: instance method of [<code>Update</code>](#Update)  

| Param | Type | Description |
| --- | --- | --- |
| witness | [<code>Witness</code>](#Witness) | A witness of the element's addition. |

<a name="Update+update"></a>

### update.update(witness) ⇒ [<code>Promise.&lt;Witness&gt;</code>](#Witness)
Update the witness. This must be called after each addition to or deletion
from the accumulation for each remaining element before it may be successfully verified.

**Kind**: instance method of [<code>Update</code>](#Update)  
**Returns**: [<code>Promise.&lt;Witness&gt;</code>](#Witness) - An updated witness.  

| Param | Type | Description |
| --- | --- | --- |
| witness | [<code>Witness</code>](#Witness) | The witness to update. |

<a name="BigInt"></a>

## BigInt : <code>Object</code>
**Kind**: global typedef  
<a name="Primes"></a>

## Primes : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| p | [<code>BigInt</code>](#BigInt) | The larger prime. |
| q | [<code>BigInt</code>](#BigInt) | The lesser prime. |

