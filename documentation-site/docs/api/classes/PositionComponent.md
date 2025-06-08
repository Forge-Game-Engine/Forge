# Class: PositionComponent

Defined in: [common/components/position-component.ts:7](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/components/position-component.ts#L7)

Component to represent the position of an entity in 2D space.

## Extends

- [`Vector2`](Vector2.md)

## Implements

- [`Component`](../interfaces/Component.md)

## Constructors

### Constructor

> **new PositionComponent**(`x`, `y`): `PositionComponent`

Defined in: [common/components/position-component.ts:17](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/components/position-component.ts#L17)

Creates an instance of PositionComponent.

#### Parameters

##### x

`number` = `0`

The x-coordinate of the position.

##### y

`number` = `0`

The y-coordinate of the position.

#### Returns

`PositionComponent`

#### Overrides

[`Vector2`](Vector2.md).[`constructor`](Vector2.md#constructor)

## Properties

### name

> **name**: `symbol`

Defined in: [common/components/position-component.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/components/position-component.ts#L8)

The unique name of the component.

#### Implementation of

[`Component`](../interfaces/Component.md).[`name`](../interfaces/Component.md#name)

***

### x

> **x**: `number`

Defined in: [math/vector2.ts:7](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L7)

The x-coordinate component of the vector

#### Inherited from

[`Vector2`](Vector2.md).[`x`](Vector2.md#x)

***

### y

> **y**: `number`

Defined in: [math/vector2.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L10)

The y-coordinate component of the vector

#### Inherited from

[`Vector2`](Vector2.md).[`y`](Vector2.md#y)

***

### symbol

> `readonly` `static` **symbol**: *typeof* [`symbol`](#symbol)

Defined in: [common/components/position-component.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/components/position-component.ts#L10)

## Accessors

### down

#### Get Signature

> **get** `static` **down**(): [`Vector2`](Vector2.md)

Defined in: [math/vector2.ts:104](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L104)

Returns a unit vector pointing downward (0, -1).

##### Returns

[`Vector2`](Vector2.md)

#### Inherited from

[`Vector2`](Vector2.md).[`down`](Vector2.md#down)

***

### left

#### Get Signature

> **get** `static` **left**(): [`Vector2`](Vector2.md)

Defined in: [math/vector2.ts:111](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L111)

Returns a unit vector pointing left (-1, 0).

##### Returns

[`Vector2`](Vector2.md)

#### Inherited from

[`Vector2`](Vector2.md).[`left`](Vector2.md#left)

***

### one

#### Get Signature

> **get** `static` **one**(): [`Vector2`](Vector2.md)

Defined in: [math/vector2.ts:132](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L132)

Returns a vector with components of 1 (1, 1).

##### Returns

[`Vector2`](Vector2.md)

#### Inherited from

[`Vector2`](Vector2.md).[`one`](Vector2.md#one)

***

### right

#### Get Signature

> **get** `static` **right**(): [`Vector2`](Vector2.md)

Defined in: [math/vector2.ts:118](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L118)

Returns a unit vector pointing right (1, 0).

##### Returns

[`Vector2`](Vector2.md)

#### Inherited from

[`Vector2`](Vector2.md).[`right`](Vector2.md#right)

***

### up

#### Get Signature

> **get** `static` **up**(): [`Vector2`](Vector2.md)

Defined in: [math/vector2.ts:97](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L97)

Returns a unit vector pointing upward (0, 1).

##### Returns

[`Vector2`](Vector2.md)

#### Inherited from

[`Vector2`](Vector2.md).[`up`](Vector2.md#up)

***

### zero

#### Get Signature

> **get** `static` **zero**(): [`Vector2`](Vector2.md)

Defined in: [math/vector2.ts:125](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L125)

Returns a zero vector (0, 0).

##### Returns

[`Vector2`](Vector2.md)

#### Inherited from

[`Vector2`](Vector2.md).[`zero`](Vector2.md#zero)

## Methods

### add()

> **add**(`value`): [`Vector2`](Vector2.md)

Defined in: [math/vector2.ts:39](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L39)

Returns a new vector that is the sum of this vector and another vector.

#### Parameters

##### value

[`Vector2`](Vector2.md)

The vector to add

#### Returns

[`Vector2`](Vector2.md)

A new Vector2 representing the sum

#### Inherited from

[`Vector2`](Vector2.md).[`add`](Vector2.md#add)

***

### clone()

> **clone**(): [`Vector2`](Vector2.md)

Defined in: [math/vector2.ts:179](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L179)

Creates a deep copy of this vector.

#### Returns

[`Vector2`](Vector2.md)

A new Vector2 with the same component values

#### Inherited from

[`Vector2`](Vector2.md).[`clone`](Vector2.md#clone)

***

### distanceTo()

> **distanceTo**(`other`): `number`

Defined in: [math/vector2.ts:213](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L213)

Calculates the distance between this vector and another vector.

#### Parameters

##### other

[`Vector2`](Vector2.md)

The other vector

#### Returns

`number`

The distance between the two vectors

#### Inherited from

[`Vector2`](Vector2.md).[`distanceTo`](Vector2.md#distanceto)

***

### divide()

> **divide**(`scalar`): [`Vector2`](Vector2.md)

Defined in: [math/vector2.ts:87](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L87)

Divides this vector by a scalar value.

#### Parameters

##### scalar

`number`

The scalar value to divide by

#### Returns

[`Vector2`](Vector2.md)

A new Vector2 divided by the scalar

#### Inherited from

[`Vector2`](Vector2.md).[`divide`](Vector2.md#divide)

***

### equals()

> **equals**(`value`): `boolean`

Defined in: [math/vector2.ts:196](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L196)

Checks if this vector is equal to another vector.

#### Parameters

##### value

[`Vector2`](Vector2.md)

The vector to compare

#### Returns

`boolean`

True if the vectors have the same components, false otherwise

#### Inherited from

[`Vector2`](Vector2.md).[`equals`](Vector2.md#equals)

***

### floorComponents()

> **floorComponents**(): [`Vector2`](Vector2.md)

Defined in: [math/vector2.ts:171](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L171)

Returns a new vector with components rounded down to the nearest integer.

#### Returns

[`Vector2`](Vector2.md)

A new Vector2 with floored components

#### Inherited from

[`Vector2`](Vector2.md).[`floorComponents`](Vector2.md#floorcomponents)

***

### magnitude()

> **magnitude**(): `number`

Defined in: [math/vector2.ts:140](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L140)

Calculates the magnitude (length) of this vector.

#### Returns

`number`

The magnitude of the vector

#### Inherited from

[`Vector2`](Vector2.md).[`magnitude`](Vector2.md#magnitude)

***

### magnitudeSquared()

> **magnitudeSquared**(): `number`

Defined in: [math/vector2.ts:149](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L149)

Calculates the squared magnitude of this vector.
This is faster than magnitude() as it avoids the square root.

#### Returns

`number`

The squared magnitude of the vector

#### Inherited from

[`Vector2`](Vector2.md).[`magnitudeSquared`](Vector2.md#magnitudesquared)

***

### multiply()

> **multiply**(`scalar`): [`Vector2`](Vector2.md)

Defined in: [math/vector2.ts:63](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L63)

Multiplies this vector by a scalar value.

#### Parameters

##### scalar

`number`

The scalar value to multiply by

#### Returns

[`Vector2`](Vector2.md)

A new Vector2 scaled by the input value

#### Inherited from

[`Vector2`](Vector2.md).[`multiply`](Vector2.md#multiply)

***

### multiplyComponents()

> **multiplyComponents**(`vector`): [`Vector2`](Vector2.md)

Defined in: [math/vector2.ts:75](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L75)

Multiplies this vector's components by another vector's components.

#### Parameters

##### vector

[`Vector2`](Vector2.md)

The vector to multiply components with

#### Returns

[`Vector2`](Vector2.md)

A new Vector2 with multiplied components

#### Inherited from

[`Vector2`](Vector2.md).[`multiplyComponents`](Vector2.md#multiplycomponents)

***

### normalize()

> **normalize**(): [`Vector2`](Vector2.md)

Defined in: [math/vector2.ts:157](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L157)

Returns a normalized (unit length) version of this vector.

#### Returns

[`Vector2`](Vector2.md)

A new Vector2 with magnitude 1 in the same direction

#### Inherited from

[`Vector2`](Vector2.md).[`normalize`](Vector2.md#normalize)

***

### rotate()

> **rotate**(`angleInRadians`): [`Vector2`](Vector2.md)

Defined in: [math/vector2.ts:222](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L222)

rotates this vector by a given angle in radians.

#### Parameters

##### angleInRadians

`number`

The angle in radians to rotate the vector

#### Returns

[`Vector2`](Vector2.md)

A new Vector2 representing the rotated vector

#### Inherited from

[`Vector2`](Vector2.md).[`rotate`](Vector2.md#rotate)

***

### set()

> **set**(`value`): `PositionComponent`

Defined in: [math/vector2.ts:27](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L27)

Sets this vector's components to match another vector.

#### Parameters

##### value

[`Vector2`](Vector2.md)

The vector to copy components from

#### Returns

`PositionComponent`

This vector for chaining

#### Inherited from

[`Vector2`](Vector2.md).[`set`](Vector2.md#set)

***

### subtract()

> **subtract**(`value`): [`Vector2`](Vector2.md)

Defined in: [math/vector2.ts:51](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L51)

Returns a new vector that is the difference between this vector and another vector.

#### Parameters

##### value

[`Vector2`](Vector2.md)

The vector to subtract

#### Returns

[`Vector2`](Vector2.md)

A new Vector2 representing the difference

#### Inherited from

[`Vector2`](Vector2.md).[`subtract`](Vector2.md#subtract)

***

### toFloat32Array()

> **toFloat32Array**(): `Float32Array`

Defined in: [math/vector2.ts:204](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L204)

Converts the 2d vector to a glsl-compatible float32 array.

#### Returns

`Float32Array`

The 2d vector array (e.g. `[5, 3]` for a `new Vector2(5, 3)`).

#### Inherited from

[`Vector2`](Vector2.md).[`toFloat32Array`](Vector2.md#tofloat32array)

***

### toString()

> **toString**(): `string`

Defined in: [math/vector2.ts:187](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/math/vector2.ts#L187)

Returns a string representation of this vector.

#### Returns

`string`

A string in the format "(x, y)" with components rounded to 1 decimal place

#### Inherited from

[`Vector2`](Vector2.md).[`toString`](Vector2.md#tostring)
