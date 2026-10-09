---
sidebar_position: 6
---

# Materials

A [`Material`](/Forge/docs/api/classes/Material) is a shader program (a
vertex shader and a fragment shader) and the values of its uniforms.
Sprites draw with a [`SpriteMaterial`](/Forge/docs/api/classes/SpriteMaterial)
(see [Drawing sprites with a custom shader](./sprites.md#drawing-sprites-with-a-custom-shader)),
and [full-screen passes](./multipass-rendering.md#writing-a-full-screen-pass)
draw with any `Material`.

## Registering a shader

A shader's source names the shader with `#pragma forge name(...)`. Wrap the
source in a [`ForgeShaderSource`](/Forge/docs/api/classes/ForgeShaderSource)
and add it to the render context's
[`shaderCache`](/Forge/docs/api/classes/ShaderCache):

```ts
import { ForgeShaderSource } from '@forge-game-engine/forge/rendering';

const tintShader = `#version 300 es
#pragma forge name(tint.frag)

precision highp float;

uniform sampler2D u_texture;
uniform vec4 u_tint;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  fragColor = texture(u_texture, v_texCoord) * u_tint;
}
`;

renderContext.shaderCache.addShader(new ForgeShaderSource(tintShader));
```

`#pragma forge include(<name>)` inserts one of the engine's shader
includes, such as `spriteMask`, into the source. The shader cache already
holds the engine's own shaders, such as `sprite.vert` and
`passthrough.vert`.

## Creating a material

Create a material from a vertex shader and a fragment shader in the shader
cache:

```ts
import { Material } from '@forge-game-engine/forge/rendering';

const { shaderCache } = renderContext;

const tintMaterial = new Material(
  renderContext,
  shaderCache.getShader('passthrough.vert'),
  shaderCache.getShader('tint.frag'),
);
```

The render context compiles and links a pair of shaders the first time a
material uses them, and every later material with the same pair shares the
linked program. Each material keeps its own uniform values, so create one
material for each set of values (for example one per color) rather than
changing one material's values between draws.

## Setting uniforms

[`setUniform`](/Forge/docs/api/classes/Material#setuniform) sets a
uniform's value:

```ts
tintMaterial.setUniform('u_texture', texture);
tintMaterial.setUniform('u_tint', new Float32Array([1, 0.5, 0.5, 1]));
```

The value has to fit the type the uniform is declared with in GLSL:

| GLSL type                          | Value                                                           |
| ---------------------------------- | --------------------------------------------------------------- |
| `float`                            | `number` or `Float32Array` of length 1                          |
| `vec2`                             | `Vector2` or `Float32Array` of length 2                         |
| `vec3`, `vec4`                     | `Float32Array` of length 3 or 4                                 |
| `mat3`                             | `Matrix3`, `Matrix3x3` or `Float32Array` of length 9            |
| `mat4`                             | `Matrix4` or `Float32Array` of length 16                        |
| `mat2`, `matNxM`                   | `Float32Array` of length 4 or N × M                             |
| `int`                              | `number`, `boolean`, or `Int32Array` of length 1                |
| `ivec2`, `ivec3`, `ivec4`          | `Int32Array` of length 2, 3, or 4                               |
| `uint` / `uvec2`, `uvec3`, `uvec4` | `number` (`uint` only) or `Uint32Array` of length 1, 2, 3, or 4 |
| `bool` / `bvec2`, `bvec3`, `bvec4` | `boolean` (`bool` only) or `Int32Array` of length 1, 2, 3, or 4 |
| `sampler2D`                        | [`Texture`](./textures.md)                                      |

[`setColorUniform`](/Forge/docs/api/classes/Material#setcoloruniform) sets
a `vec4` from a `Color`, and
[`setVectorUniform`](/Forge/docs/api/classes/Material#setvectoruniform)
sets a `vec2` or `vec3` from a vector, depending on whether it has a `z`.
`sampler2D` is the only sampler type a material supports.

`setUniform` throws for a name that neither shader declares, listing the
declared uniforms, and for a value that doesn't fit the declared type.
[`hasUniform`](/Forge/docs/api/classes/Material#hasuniform) returns whether
the shaders declare a uniform.

A uniform the GLSL compiler removed because the shader doesn't use it can
still be set: the value is checked and stored, and isn't uploaded. Which
uniforms a compiler removes depends on the GPU and driver.

A uniform the material hasn't set is drawn with zero, or with the render
context's [`blackTexture`](./textures.md#the-white-and-black-textures) for
a sampler, not with a value another material set on the shared program.

## Setting uniform arrays

Set a uniform array by its declared name (`u_points`), with its elements
flattened into one typed array:

```ts
// uniform vec4 u_points[4];
const points = new Float32Array(4 * 4);

points.set([0.25, 0.5, 0.1, 0.03], 0); // element 0
points.set([0.75, 0.5, 0.2, 0.02], 4); // element 1

material.setUniform('u_points', points);
```

The array's length must be a whole number of elements, and no more than the
declared size.

:::caution
An array shorter than the declared size sets only the leading elements. The
other elements keep the values last uploaded to the program, which can be
another material's when materials share shaders. Set the full length to
control every element.
:::

## When values are uploaded

A material uploads its uniform values each time it's bound for drawing, not
when they're set. A `Float32Array`, `Matrix3`, `Matrix4`, `Matrix3x3` or
`Vector2` passed to `setUniform` and changed afterwards is uploaded with its
contents at the next draw. A [`Matrix3` or `Matrix4`](../math/matrices.md)
is converted to 32-bit floats when it's uploaded. A value that changes every frame, such as a time uniform, can be
one array updated in place:

```ts
const time = new Float32Array(1);

material.setUniform('u_time', time);

// Each frame:
time[0] += deltaSeconds;
```
