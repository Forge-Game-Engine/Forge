# Class: Vector3

Defined in: [math/vector3.ts:5](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L5)

Represents a three-dimensional vector with x, y, and z components.
Provides methods for common vector operations and transformations.

## Constructors

### Constructor

> **new Vector3**(`x`, `y`, `z`): `Vector3`

Defined in: [math/vector3.ts:21](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L21)

Creates a new Vector3.

#### Parameters

##### x

`number` = `0`

The x-coordinate component (default: 0)

##### y

`number` = `0`

The y-coordinate component (default: 0)

##### z

`number` = `0`

The z-coordinate component (default: 0)

#### Returns

`Vector3`

## Properties

### x

> **x**: `number`

Defined in: [math/vector3.ts:7](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L7)

The x-coordinate component of the vector

***

### y

> **y**: `number`

Defined in: [math/vector3.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L10)

The y-coordinate component of the vector

***

### z

> **z**: `number`

Defined in: [math/vector3.ts:13](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L13)

The z-coordinate component of the vector

## Accessors

### backward

#### Get Signature

> **get** `static` **backward**(): `Vector3`

Defined in: [math/vector3.ts:225](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L225)

Returns a unit vector pointing backward (0, 0, -1).

##### Returns

`Vector3`

***

### down

#### Get Signature

> **get** `static` **down**(): `Vector3`

Defined in: [math/vector3.ts:197](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L197)

Returns a unit vector pointing downward (0, -1, 0).

##### Returns

`Vector3`

***

### forward

#### Get Signature

> **get** `static` **forward**(): `Vector3`

Defined in: [math/vector3.ts:218](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L218)

Returns a unit vector pointing forward (0, 0, 1).

##### Returns

`Vector3`

***

### left

#### Get Signature

> **get** `static` **left**(): `Vector3`

Defined in: [math/vector3.ts:204](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L204)

Returns a unit vector pointing left (-1, 0, 0).

##### Returns

`Vector3`

***

### one

#### Get Signature

> **get** `static` **one**(): `Vector3`

Defined in: [math/vector3.ts:183](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L183)

Returns a vector with components of 1 (1, 1, 1).

##### Returns

`Vector3`

***

### right

#### Get Signature

> **get** `static` **right**(): `Vector3`

Defined in: [math/vector3.ts:211](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L211)

Returns a unit vector pointing right (1, 0, 0).

##### Returns

`Vector3`

***

### up

#### Get Signature

> **get** `static` **up**(): `Vector3`

Defined in: [math/vector3.ts:190](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L190)

Returns a unit vector pointing upward (0, 1, 0).

##### Returns

`Vector3`

***

### zero

#### Get Signature

> **get** `static` **zero**(): `Vector3`

Defined in: [math/vector3.ts:176](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L176)

Returns a zero vector (0, 0, 0).

##### Returns

`Vector3`

## Methods

### add()

> **add**(`value`): `Vector3`

Defined in: [math/vector3.ts:45](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L45)

Returns a new vector that is the sum of this vector and another vector.

#### Parameters

##### value

`Vector3`

The vector to add

#### Returns

`Vector3`

A new Vector3 representing the sum

***

### clone()

> **clone**(): `Vector3`

Defined in: [math/vector3.ts:152](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L152)

Creates a deep copy of this vector.

#### Returns

`Vector3`

A new Vector3 with the same component values

***

### divide()

> **divide**(`scalar`): `Vector3`

Defined in: [math/vector3.ts:97](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L97)

Divides this vector by a scalar value.

#### Parameters

##### scalar

`number`

The scalar value to divide by

#### Returns

`Vector3`

A new Vector3 divided by the scalar

***

### equals()

> **equals**(`value`): `boolean`

Defined in: [math/vector3.ts:169](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L169)

Checks if this vector is equal to another vector.

#### Parameters

##### value

`Vector3`

The vector to compare

#### Returns

`boolean`

True if the vectors have the same components, false otherwise

***

### floorComponents()

> **floorComponents**(): `Vector3`

Defined in: [math/vector3.ts:140](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L140)

Returns a new vector with components rounded down to the nearest integer.

#### Returns

`Vector3`

A new Vector3 with floored components

***

### magnitude()

> **magnitude**(): `number`

Defined in: [math/vector3.ts:109](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L109)

Calculates the magnitude (length) of this vector.

#### Returns

`number`

The magnitude of the vector

***

### magnitudeSquared()

> **magnitudeSquared**(): `number`

Defined in: [math/vector3.ts:118](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L118)

Calculates the squared magnitude of this vector.
This is faster than magnitude() as it avoids the square root.

#### Returns

`number`

The squared magnitude of the vector

***

### multiply()

> **multiply**(`scalar`): `Vector3`

Defined in: [math/vector3.ts:71](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L71)

Multiplies this vector by a scalar value.

#### Parameters

##### scalar

`number`

The scalar value to multiply by

#### Returns

`Vector3`

A new Vector3 scaled by the input value

***

### multiplyComponents()

> **multiplyComponents**(`vector`): `Vector3`

Defined in: [math/vector3.ts:84](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L84)

Multiplies this vector's components by another vector's components.

#### Parameters

##### vector

`Vector3`

The vector to multiply components with

#### Returns

`Vector3`

A new Vector3 with multiplied components

***

### normalize()

> **normalize**(): `Vector3`

Defined in: [math/vector3.ts:126](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L126)

Returns a normalized (unit length) version of this vector.

#### Returns

`Vector3`

A new Vector3 with magnitude 1 in the same direction

***

### set()

> **set**(`value`): `this`

Defined in: [math/vector3.ts:32](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L32)

Sets this vector's components to match another vector.

#### Parameters

##### value

`Vector3`

The vector to copy components from

#### Returns

`this`

This vector for chaining

***

### subtract()

> **subtract**(`value`): `Vector3`

Defined in: [math/vector3.ts:58](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L58)

Returns a new vector that is the difference between this vector and another vector.

#### Parameters

##### value

`Vector3`

The vector to subtract

#### Returns

`Vector3`

A new Vector3 representing the difference

***

### toFloat32Array()

> **toFloat32Array**(): `Float32Array`

Defined in: [math/vector3.ts:233](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L233)

Converts the 3d vector to a glsl-compatible float32 array.

#### Returns

`Float32Array`

The 3d vector array (e.g. `[5, 3, 8]` for a `new Vector3(5, 3, 8)`).

***

### toString()

> **toString**(): `string`

Defined in: [math/vector3.ts:160](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/math/vector3.ts#L160)

Returns a string representation of this vector.

#### Returns

`string`

A string in the format "(x, y, z)" with components rounded to 1 decimal place
