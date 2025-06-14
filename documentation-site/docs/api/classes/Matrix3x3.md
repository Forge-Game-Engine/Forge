# Class: Matrix3x3

Defined in: [math/matrices/matrix3x3.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/math/matrices/matrix3x3.ts#L10)

Represents a 3x3 transformation matrix used for 2D graphics operations.
The matrix is stored in column-major order as a flat array of 9 numbers.

Matrix layout:
[0 3 6]
[1 4 7]
[2 5 8]

## Constructors

### Constructor

> **new Matrix3x3**(`matrix`): `Matrix3x3`

Defined in: [math/matrices/matrix3x3.ts:18](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/math/matrices/matrix3x3.ts#L18)

Creates a new 3x3 matrix from the given array.

#### Parameters

##### matrix

`number`[]

An array of 9 numbers representing the matrix in column-major order

#### Returns

`Matrix3x3`

## Accessors

### data

#### Get Signature

> **get** **data**(): `number`[]

Defined in: [math/matrices/matrix3x3.ts:83](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/math/matrices/matrix3x3.ts#L83)

##### Returns

`number`[]

***

### matrix

#### Get Signature

> **get** **matrix**(): `number`[]

Defined in: [math/matrices/matrix3x3.ts:30](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/math/matrices/matrix3x3.ts#L30)

Gets the underlying matrix array.

##### Returns

`number`[]

The matrix data as a flat array in column-major order

## Methods

### rotate()

> **rotate**(`radians`): `Matrix3x3`

Defined in: [math/matrices/matrix3x3.ts:52](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/math/matrices/matrix3x3.ts#L52)

Applies a rotation transformation to the matrix.

#### Parameters

##### radians

`number`

The rotation angle in radians

#### Returns

`Matrix3x3`

This matrix for chaining

***

### scale()

> **scale**(`x`, `y`): `Matrix3x3`

Defined in: [math/matrices/matrix3x3.ts:74](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/math/matrices/matrix3x3.ts#L74)

Applies a scale transformation to the matrix.

#### Parameters

##### x

`number`

The x-axis scale factor

##### y

`number`

The y-axis scale factor

#### Returns

`Matrix3x3`

This matrix for chaining

***

### translate()

> **translate**(`x`, `y`): `Matrix3x3`

Defined in: [math/matrices/matrix3x3.ts:40](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/math/matrices/matrix3x3.ts#L40)

Applies a translation transformation to the matrix.

#### Parameters

##### x

`number`

The x-coordinate translation

##### y

`number`

The y-coordinate translation

#### Returns

`Matrix3x3`

This matrix for chaining
