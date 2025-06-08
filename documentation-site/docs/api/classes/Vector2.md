# Class: Vector2

Defined in: [math/vector2.ts:5](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L5)

Represents a two-dimensional vector with x and y components.
Provides methods for common vector operations and transformations.

## Extended by

- [`PositionComponent`](PositionComponent.md)
- [`ScaleComponent`](ScaleComponent.md)

## Constructors

### Constructor

> **new Vector2**(`x`, `y`): `Vector2`

Defined in: [math/vector2.ts:17](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L17)

Creates a new Vector2.

#### Parameters

##### x

`number` = `0`

The x-coordinate component (default: 0)

##### y

`number` = `0`

The y-coordinate component (default: 0)

#### Returns

`Vector2`

## Properties

### x

> **x**: `number`

Defined in: [math/vector2.ts:7](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L7)

The x-coordinate component of the vector

***

### y

> **y**: `number`

Defined in: [math/vector2.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L10)

The y-coordinate component of the vector

## Accessors

### down

#### Get Signature

> **get** `static` **down**(): `Vector2`

Defined in: [math/vector2.ts:104](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L104)

Returns a unit vector pointing downward (0, -1).

##### Returns

`Vector2`

***

### left

#### Get Signature

> **get** `static` **left**(): `Vector2`

Defined in: [math/vector2.ts:111](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L111)

Returns a unit vector pointing left (-1, 0).

##### Returns

`Vector2`

***

### one

#### Get Signature

> **get** `static` **one**(): `Vector2`

Defined in: [math/vector2.ts:132](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L132)

Returns a vector with components of 1 (1, 1).

##### Returns

`Vector2`

***

### right

#### Get Signature

> **get** `static` **right**(): `Vector2`

Defined in: [math/vector2.ts:118](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L118)

Returns a unit vector pointing right (1, 0).

##### Returns

`Vector2`

***

### up

#### Get Signature

> **get** `static` **up**(): `Vector2`

Defined in: [math/vector2.ts:97](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L97)

Returns a unit vector pointing upward (0, 1).

##### Returns

`Vector2`

***

### zero

#### Get Signature

> **get** `static` **zero**(): `Vector2`

Defined in: [math/vector2.ts:125](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L125)

Returns a zero vector (0, 0).

##### Returns

`Vector2`

## Methods

### add()

> **add**(`value`): `Vector2`

Defined in: [math/vector2.ts:39](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L39)

Returns a new vector that is the sum of this vector and another vector.

#### Parameters

##### value

`Vector2`

The vector to add

#### Returns

`Vector2`

A new Vector2 representing the sum

***

### clone()

> **clone**(): `Vector2`

Defined in: [math/vector2.ts:179](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L179)

Creates a deep copy of this vector.

#### Returns

`Vector2`

A new Vector2 with the same component values

***

### distanceTo()

> **distanceTo**(`other`): `number`

Defined in: [math/vector2.ts:213](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L213)

Calculates the distance between this vector and another vector.

#### Parameters

##### other

`Vector2`

The other vector

#### Returns

`number`

The distance between the two vectors

***

### divide()

> **divide**(`scalar`): `Vector2`

Defined in: [math/vector2.ts:87](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L87)

Divides this vector by a scalar value.

#### Parameters

##### scalar

`number`

The scalar value to divide by

#### Returns

`Vector2`

A new Vector2 divided by the scalar

***

### equals()

> **equals**(`value`): `boolean`

Defined in: [math/vector2.ts:196](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L196)

Checks if this vector is equal to another vector.

#### Parameters

##### value

`Vector2`

The vector to compare

#### Returns

`boolean`

True if the vectors have the same components, false otherwise

***

### floorComponents()

> **floorComponents**(): `Vector2`

Defined in: [math/vector2.ts:171](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L171)

Returns a new vector with components rounded down to the nearest integer.

#### Returns

`Vector2`

A new Vector2 with floored components

***

### magnitude()

> **magnitude**(): `number`

Defined in: [math/vector2.ts:140](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L140)

Calculates the magnitude (length) of this vector.

#### Returns

`number`

The magnitude of the vector

***

### magnitudeSquared()

> **magnitudeSquared**(): `number`

Defined in: [math/vector2.ts:149](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L149)

Calculates the squared magnitude of this vector.
This is faster than magnitude() as it avoids the square root.

#### Returns

`number`

The squared magnitude of the vector

***

### multiply()

> **multiply**(`scalar`): `Vector2`

Defined in: [math/vector2.ts:63](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L63)

Multiplies this vector by a scalar value.

#### Parameters

##### scalar

`number`

The scalar value to multiply by

#### Returns

`Vector2`

A new Vector2 scaled by the input value

***

### multiplyComponents()

> **multiplyComponents**(`vector`): `Vector2`

Defined in: [math/vector2.ts:75](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L75)

Multiplies this vector's components by another vector's components.

#### Parameters

##### vector

`Vector2`

The vector to multiply components with

#### Returns

`Vector2`

A new Vector2 with multiplied components

***

### normalize()

> **normalize**(): `Vector2`

Defined in: [math/vector2.ts:157](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L157)

Returns a normalized (unit length) version of this vector.

#### Returns

`Vector2`

A new Vector2 with magnitude 1 in the same direction

***

### rotate()

> **rotate**(`angleInRadians`): `Vector2`

Defined in: [math/vector2.ts:222](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L222)

rotates this vector by a given angle in radians.

#### Parameters

##### angleInRadians

`number`

The angle in radians to rotate the vector

#### Returns

`Vector2`

A new Vector2 representing the rotated vector

***

### set()

> **set**(`value`): `Vector2`

Defined in: [math/vector2.ts:27](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L27)

Sets this vector's components to match another vector.

#### Parameters

##### value

`Vector2`

The vector to copy components from

#### Returns

`Vector2`

This vector for chaining

***

### subtract()

> **subtract**(`value`): `Vector2`

Defined in: [math/vector2.ts:51](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L51)

Returns a new vector that is the difference between this vector and another vector.

#### Parameters

##### value

`Vector2`

The vector to subtract

#### Returns

`Vector2`

A new Vector2 representing the difference

***

### toFloat32Array()

> **toFloat32Array**(): `Float32Array`

Defined in: [math/vector2.ts:204](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L204)

Converts the 2d vector to a glsl-compatible float32 array.

#### Returns

`Float32Array`

The 2d vector array (e.g. `[5, 3]` for a `new Vector2(5, 3)`).

***

### toString()

> **toString**(): `string`

Defined in: [math/vector2.ts:187](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/math/vector2.ts#L187)

Returns a string representation of this vector.

#### Returns

`string`

A string in the format "(x, y)" with components rounded to 1 decimal place
