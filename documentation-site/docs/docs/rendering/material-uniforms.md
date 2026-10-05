---
sidebar_position: 8
---

# Material Uniforms

A [`Material`](/Forge/docs/api/classes/Material) pairs a compiled shader
program with the values of its uniforms. Set a uniform with
[`setUniform`](/Forge/docs/api/classes/Material#setuniform); the value is
uploaded every time the material is bound for drawing, so set it once for a
constant and again whenever it changes (for example, each frame for a time
uniform).

```ts
import {
  ForgeShaderSource,
  Material,
  RenderContext,
} from '@forge-game-engine/forge/rendering';

const shockwaveShader = `#version 300 es
#pragma forge name(shockwave.frag)

precision highp float;

uniform sampler2D u_texture;
uniform float u_time;
uniform vec4 u_waves[4]; // xy = center, z = radius, w = strength

// ...
`;

const createShockwaveMaterial = (
  renderContext: RenderContext,
  texture: WebGLTexture,
): Material => {
  const { shaderCache, gl } = renderContext;

  shaderCache.addShader(new ForgeShaderSource(shockwaveShader));

  const material = new Material(
    shaderCache.getShader('sprite.vert'),
    shaderCache.getShader('shockwave.frag'),
    gl,
  );

  material.setUniform('u_texture', texture);
  material.setUniform('u_time', 0);
  material.setUniform('u_waves', new Float32Array(16));

  return material;
};
```

## Which value fits which uniform

The upload is chosen from the type the uniform is declared with in GLSL, so
the value has to fit that type:

| GLSL type                                          | Value                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `float`                                            | `number` or `Float32Array` of length 1                             |
| `vec2`                                             | `Vector2` or `Float32Array` of length 2                            |
| `vec3`, `vec4`                                     | `Float32Array` of length 3 or 4                                    |
| `mat3`                                             | `Matrix3x3` or `Float32Array` of length 9                          |
| `mat2`, `mat4`, `matNxM`                           | `Float32Array` of length 4, 16, or N × M                           |
| `int`                                              | `number`, `boolean`, or `Int32Array` of length 1                   |
| `ivec2`, `ivec3`, `ivec4`                          | `Int32Array` of length 2, 3, or 4                                  |
| `uint` / `uvec2`, `uvec3`, `uvec4`                 | `number` (`uint` only) or `Uint32Array` of length 1, 2, 3, or 4    |
| `bool` / `bvec2`, `bvec3`, `bvec4`                 | `boolean` (`bool` only) or `Int32Array` of length 1, 2, 3, or 4    |
| `sampler2D`, `sampler3D`, `samplerCube`, and so on | `WebGLTexture`, bound to the texture target the sampler type reads |

[`setColorUniform`](/Forge/docs/api/classes/Material#setcoloruniform) fills a
`vec4`, and
[`setVectorUniform`](/Forge/docs/api/classes/Material#setvectoruniform) fills
a `vec2` or `vec3`, depending on whether the vector has a `z`.

`setUniform` throws when the value doesn't fit, naming the declared type,
what it accepts, and what it received. A `Float32Array` of 16 floats is a
`mat4` only for a uniform declared `mat4`; the same array set on a
`vec4[4]` or `float[16]` uploads four `vec4`s or sixteen `float`s.

## Uniform arrays

A uniform array can be set by its declared name (`u_waves`) or by the name
WebGL reports for it (`u_waves[0]`); both refer to the same uniform. Pass
the elements flattened into one typed array:

```ts
// uniform vec4 u_waves[4];
const waves = new Float32Array(4 * 4);

waves.set([0.25, 0.5, 0.1, 0.03], 0); // element 0
waves.set([0.75, 0.5, 0.2, 0.02], 4); // element 1

material.setUniform('u_waves', waves);
```

The array's length must be a whole number of elements, and no more than the
declared size. A shorter array updates only the leading elements; the rest
keep whatever was last uploaded to them. To clear trailing elements, upload
the full length with zeros in them.

Sampler arrays (`uniform sampler2D u_textures[4]`) can't be set through a
`Material`. Declare one sampler uniform per texture instead.

## Gotchas

- **Unused uniforms don't exist.** The GLSL compiler removes any uniform the
  shader never reads, and `setUniform` throws for a name the linked program
  doesn't have. Comment out the code that reads a uniform, and the
  `setUniform` call for it starts throwing too.
- **Values are read when the material is bound, not when they're set.** A
  `Float32Array`, `Matrix3x3`, or `Vector2` you keep and mutate after
  `setUniform` uploads its current contents on the next draw. That lets you
  update one array in place each frame instead of allocating a new one, but
  it also means mutating an array you passed to one material changes what
  that material draws.
- **Textures take consecutive texture units** in the order their uniforms
  appear in the program, starting at unit 0 each time the material is bound.
