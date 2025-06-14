# Function: createShader()

> **createShader**(`gl`, `source`, `type`): `WebGLShader`

Defined in: [rendering/shaders/utils/compile-shader.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/rendering/shaders/utils/compile-shader.ts#L10)

Creates and compiles a WebGL shader.

## Parameters

### gl

`WebGL2RenderingContext`

The WebGL2 rendering context.

### source

`string`

The GLSL source code for the shader.

### type

`number`

The type of shader (e.g., gl.VERTEX_SHADER or gl.FRAGMENT_SHADER).

## Returns

`WebGLShader`

The compiled shader.

## Throws

An error if the shader creation or compilation fails.
