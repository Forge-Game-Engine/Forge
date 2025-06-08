# Class: GradientMaterial

Defined in: [rendering/materials/gradient.material.ts:5](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/materials/gradient.material.ts#L5)

## Extends

- [`Material`](Material.md)

## Constructors

### Constructor

> **new GradientMaterial**(`gl`, `shaderStore`, `resolution`, `gradientTexture`, `center`): `GradientMaterial`

Defined in: [rendering/materials/gradient.material.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/materials/gradient.material.ts#L8)

#### Parameters

##### gl

`WebGL2RenderingContext`

##### shaderStore

[`ShaderStore`](ShaderStore.md)

##### resolution

[`Vector2`](Vector2.md)

##### gradientTexture

`HTMLImageElement`

##### center

[`Vector2`](Vector2.md) = `...`

#### Returns

`GradientMaterial`

#### Overrides

[`Material`](Material.md).[`constructor`](Material.md#constructor)

## Properties

### gradientTexture

> `readonly` **gradientTexture**: `HTMLImageElement`

Defined in: [rendering/materials/gradient.material.ts:6](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/materials/gradient.material.ts#L6)

***

### program

> `readonly` **program**: `WebGLProgram`

Defined in: [rendering/materials/material.ts:13](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/materials/material.ts#L13)

#### Inherited from

[`Material`](Material.md).[`program`](Material.md#program)

## Methods

### beforeBind()

> `protected` **beforeBind**(`_gl`): `void`

Defined in: [rendering/materials/material.ts:158](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/materials/material.ts#L158)

Called before binding the material to allow for custom behavior.
Override this method in subclasses to implement custom logic.

#### Parameters

##### \_gl

`WebGL2RenderingContext`

The WebGL2 rendering context passed into beforeBind.

#### Returns

`void`

#### Inherited from

[`Material`](Material.md).[`beforeBind`](Material.md#beforebind)

***

### bind()

> **bind**(`gl`): `void`

Defined in: [rendering/materials/material.ts:34](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/materials/material.ts#L34)

Binds the material (program, uniforms, textures).

#### Parameters

##### gl

`WebGL2RenderingContext`

#### Returns

`void`

#### Inherited from

[`Material`](Material.md).[`bind`](Material.md#bind)

***

### convertToFloat32Array()

> `protected` **convertToFloat32Array**(`vector`): `Float32Array`

Defined in: [rendering/materials/material.ts:165](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/materials/material.ts#L165)

Converts a vector3 to a float32 array.

#### Parameters

##### vector

[`Vector3`](Vector3.md)

#### Returns

`Float32Array`

#### Inherited from

[`Material`](Material.md).[`convertToFloat32Array`](Material.md#converttofloat32array)

***

### setColorUniform()

> **setColorUniform**(`name`, `color`): `void`

Defined in: [rendering/materials/material.ts:140](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/materials/material.ts#L140)

Sets a color uniform as a float32 array using the color's RGBA values.

#### Parameters

##### name

`string`

##### color

[`Color`](Color.md)

#### Returns

`void`

#### Inherited from

[`Material`](Material.md).[`setColorUniform`](Material.md#setcoloruniform)

***

### setUniform()

> **setUniform**(`name`, `value`): `void`

Defined in: [rendering/materials/material.ts:133](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/materials/material.ts#L133)

Sets a uniform value (number, vec2, matrix, texture, etc.).

#### Parameters

##### name

`string`

##### value

`UniformValue`

#### Returns

`void`

#### Inherited from

[`Material`](Material.md).[`setUniform`](Material.md#setuniform)

***

### setVectorUniform()

> **setVectorUniform**(`name`, `vector`): `void`

Defined in: [rendering/materials/material.ts:147](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/materials/material.ts#L147)

Sets a vector2 or Vector3 uniform as a float32 array using the vector's elements.

#### Parameters

##### name

`string`

##### vector

[`Vector2`](Vector2.md) | [`Vector3`](Vector3.md)

#### Returns

`void`

#### Inherited from

[`Material`](Material.md).[`setVectorUniform`](Material.md#setvectoruniform)
