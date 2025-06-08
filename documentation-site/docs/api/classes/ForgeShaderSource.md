# Class: ForgeShaderSource

Defined in: [rendering/shaders/dependency-resolution/forge-shader-source.ts:1](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/rendering/shaders/dependency-resolution/forge-shader-source.ts#L1)

## Constructors

### Constructor

> **new ForgeShaderSource**(`rawSource`): `ForgeShaderSource`

Defined in: [rendering/shaders/dependency-resolution/forge-shader-source.ts:12](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/rendering/shaders/dependency-resolution/forge-shader-source.ts#L12)

Constructs a new instance of the `ShaderMetadata` class.

#### Parameters

##### rawSource

`string`

The raw source code of the shader.

#### Returns

`ForgeShaderSource`

## Accessors

### includes

#### Get Signature

> **get** **includes**(): `Set`\<`string`\>

Defined in: [rendering/shaders/dependency-resolution/forge-shader-source.ts:28](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/rendering/shaders/dependency-resolution/forge-shader-source.ts#L28)

Gets the includes of the shader.

##### Returns

`Set`\<`string`\>

***

### name

#### Get Signature

> **get** **name**(): `string`

Defined in: [rendering/shaders/dependency-resolution/forge-shader-source.ts:35](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/rendering/shaders/dependency-resolution/forge-shader-source.ts#L35)

Gets the name of the shader.

##### Returns

`string`

***

### rawSource

#### Get Signature

> **get** **rawSource**(): `string`

Defined in: [rendering/shaders/dependency-resolution/forge-shader-source.ts:21](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/rendering/shaders/dependency-resolution/forge-shader-source.ts#L21)

Gets the raw source of the shader.

##### Returns

`string`

## Methods

### getPropertyValue()

> **getPropertyValue**(`name`): `null` \| `string`

Defined in: [rendering/shaders/dependency-resolution/forge-shader-source.ts:44](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/rendering/shaders/dependency-resolution/forge-shader-source.ts#L44)

Gets the value of a property by its name.

#### Parameters

##### name

`string`

The name of the property.

#### Returns

`null` \| `string`

The value of the property, or `null` if the property does not exist.
