# Function: createProgram()

> **createProgram**(`gl`, `vertexSource`, `fragmentSource`): `WebGLProgram`

Defined in: [rendering/shaders/utils/create-shader-program.ts:12](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/rendering/shaders/utils/create-shader-program.ts#L12)

Creates and links a WebGL shader program.

## Parameters

### gl

`WebGL2RenderingContext`

The WebGL2 rendering context.

### vertexSource

`string`

The GLSL source code for the vertex shader.

### fragmentSource

`string`

The GLSL source code for the fragment shader.

## Returns

`WebGLProgram`

The linked shader program.

## Throws

An error if the shader program creation or linking fails.
