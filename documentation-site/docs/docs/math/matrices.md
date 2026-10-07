---
sidebar_position: 4
---

# Transformation Matrices

[`Matrix3x3`](/Forge/docs/api/classes/Matrix3x3) is a 3x3 matrix for 2D
transforms (translation, rotation and scale), stored as a column-major
`Float32Array` of 9 numbers. The renderer uses one as the projection matrix
that maps world coordinates to clip space.

## Creating a matrix

[`Matrix3x3.identity`](/Forge/docs/api/classes/Matrix3x3#identity) returns a
new identity matrix on every access. The constructor takes the 9 values in
column-major order and throws if there aren't exactly 9:

```ts
import { Matrix3x3 } from '@forge-game-engine/forge/math';

const transform = Matrix3x3.identity;
```

## Transforming a matrix

[`translate`](/Forge/docs/api/classes/Matrix3x3#translate),
[`rotate`](/Forge/docs/api/classes/Matrix3x3#rotate) and
[`scale`](/Forge/docs/api/classes/Matrix3x3#scale) change the matrix in place
and return it, so calls can be chained:

```ts
transform
  .translate(100, 50)
  .rotate(Math.PI / 4)
  .scale(2, 2);
```

Each call multiplies onto the right of the current matrix, so the last call
is the first transform applied to a point. The example above scales a point,
then rotates it, then translates it by `(100, 50)`.

## Resetting a matrix

[`resetToIdentity`](/Forge/docs/api/classes/Matrix3x3#resettoidentity) sets
an existing matrix back to identity without allocating a new array. Use it
for a matrix that's rebuilt every frame:

```ts
transform.resetToIdentity().translate(position.x, position.y);
```

## Using a matrix as a shader uniform

Pass a `Matrix3x3` to
[`Material.setUniform`](/Forge/docs/api/classes/Material#setuniform) for a
uniform declared as `mat3`:

```ts
material.setUniform('u_transform', transform);
```

The material reads the matrix's
[`matrix`](/Forge/docs/api/classes/Matrix3x3#matrix) array each time it is
bound, so changes made to the matrix after `setUniform` are uploaded the next
time the material is bound. See [Material Uniforms](../rendering/material-uniforms.md).
