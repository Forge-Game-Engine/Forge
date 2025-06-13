# Class: Material

Defined in: [rendering/materials/material.ts:12](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/materials/material.ts#L12)

## Extended by

- [`SpriteMaterial`](SpriteMaterial.md)
- [`PerlinNoiseMaterial`](PerlinNoiseMaterial.md)
- [`GradientMaterial`](GradientMaterial.md)

## Constructors

### Constructor

> **new Material**(`vertexSourceName`, `fragmentSourceName`, `shaderStore`, `gl`): `Material`

Defined in: [rendering/materials/material.ts:18](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/materials/material.ts#L18)

#### Parameters

##### vertexSourceName

`string`

##### fragmentSourceName

`string`

##### shaderStore

[`ShaderStore`](ShaderStore.md)

##### gl

`WebGL2RenderingContext`

#### Returns

`Material`

## Properties

### program

> `readonly` **program**: `WebGLProgram`

Defined in: [rendering/materials/material.ts:13](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/materials/material.ts#L13)

## Methods

### beforeBind()

> `protected` **beforeBind**(`_gl`): `void`

Defined in: [rendering/materials/material.ts:158](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/materials/material.ts#L158)

Called before binding the material to allow for custom behavior.
Override this method in subclasses to implement custom logic.

#### Parameters

##### \_gl

`WebGL2RenderingContext`

The WebGL2 rendering context passed into beforeBind.

#### Returns

`void`

***

### bind()

> **bind**(`gl`): `void`

Defined in: [rendering/materials/material.ts:34](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/materials/material.ts#L34)

Binds the material (program, uniforms, textures).

#### Parameters

##### gl

`WebGL2RenderingContext`

#### Returns

`void`

***

### convertToFloat32Array()

> `protected` **convertToFloat32Array**(`vector`): `Float32Array`

Defined in: [rendering/materials/material.ts:165](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/materials/material.ts#L165)

Converts a vector3 to a float32 array.

#### Parameters

##### vector

[`Vector3`](Vector3.md)

#### Returns

`Float32Array`

***

### setColorUniform()

> **setColorUniform**(`name`, `color`): `void`

Defined in: [rendering/materials/material.ts:140](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/materials/material.ts#L140)

Sets a color uniform as a float32 array using the color's RGBA values.

#### Parameters

##### name

`string`

##### color

[`Color`](Color.md)

#### Returns

`void`

***

### setUniform()

> **setUniform**(`name`, `value`): `void`

Defined in: [rendering/materials/material.ts:133](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/materials/material.ts#L133)

Sets a uniform value (number, vec2, matrix, texture, etc.).

#### Parameters

##### name

`string`

##### value

`UniformValue`

#### Returns

`void`

***

### setVectorUniform()

> **setVectorUniform**(`name`, `vector`): `void`

Defined in: [rendering/materials/material.ts:147](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/materials/material.ts#L147)

Sets a vector2 or Vector3 uniform as a float32 array using the vector's elements.

#### Parameters

##### name

`string`

##### vector

[`Vector2`](Vector2.md) | [`Vector3`](Vector3.md)

#### Returns

`void`
