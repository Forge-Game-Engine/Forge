# Function: createShaderStore()

> **createShaderStore**(): [`ShaderStore`](../classes/ShaderStore.md)

Defined in: [rendering/utilities/create-shader-store.ts:35](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/rendering/utilities/create-shader-store.ts#L35)

Creates and initializes a ShaderStore instance with predefined shader includes and shaders.

The shader includes added to the ShaderStore provide reusable shader code snippets, such as
cubic interpolation, Perlin noise, quintic interpolation, radial gradients, random gradients,
signed distance functions (SDF) for circles, and oriented boxes.

The shaders added to the ShaderStore include fragment and vertex shaders for rendering
radial gradients, Perlin noise, and sprites.

## Returns

[`ShaderStore`](../classes/ShaderStore.md)

A ShaderStore instance populated with the predefined shader includes
and shaders.
