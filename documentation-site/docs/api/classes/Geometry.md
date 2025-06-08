# Class: Geometry

Defined in: [rendering/geometry/geometry.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/geometry/geometry.ts#L11)

## Constructors

### Constructor

> **new Geometry**(): `Geometry`

#### Returns

`Geometry`

## Methods

### addAttribute()

> **addAttribute**(`gl`, `name`, `spec`): `void`

Defined in: [rendering/geometry/geometry.ts:21](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/geometry/geometry.ts#L21)

Adds a vertex attribute to the geometry.

#### Parameters

##### gl

`WebGL2RenderingContext`

##### name

`string`

##### spec

`AttributeSpec`

#### Returns

`void`

***

### bind()

> **bind**(`gl`, `program`): `void`

Defined in: [rendering/geometry/geometry.ts:46](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/geometry/geometry.ts#L46)

Binds the VAO for the given shader program. Will create it on first use.

#### Parameters

##### gl

`WebGL2RenderingContext`

##### program

`WebGLProgram`

#### Returns

`void`

***

### setIndexBuffer()

> **setIndexBuffer**(`buffer`): `void`

Defined in: [rendering/geometry/geometry.ts:39](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/geometry/geometry.ts#L39)

Optionally sets the index buffer for indexed drawing.

#### Parameters

##### buffer

`WebGLBuffer`

#### Returns

`void`
