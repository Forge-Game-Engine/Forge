---
sidebar_position: 5
---

# Matrices

A [`Matrix4`](/Forge/docs/api/type-aliases/Matrix4) is a 4x4 matrix for 3D
transforms, views and projections, and a
[`Matrix3`](/Forge/docs/api/type-aliases/Matrix3) a 3x3 matrix for
rotations, normal matrices and inertia tensors. Both are plain `number[]`s
of 16 and 9 numbers, operated on by the static methods of
[`Mat4`](/Forge/docs/api/classes/Mat4) and
[`Mat3`](/Forge/docs/api/classes/Mat3).
[`Matrix3x3`](/Forge/docs/api/classes/Matrix3x3) is a separate class for
2D transforms, which the 2D renderer uses for its projection.

Game code rarely builds a matrix: positions, rotations and scales are set
on an entity's transform components (see
[Transforms](../common/transforms.md)). Matrices are for code that draws,
culls, or converts between spaces itself.

## Matrix layout

Matrices are column-major and multiply column vectors (`M * v`), the same
as GLSL. Element `m[c * 4 + r]` of a `Matrix4` is row `r`, column `c`, so a
transform's translation is `m[12]`, `m[13]` and `m[14]`. A `Matrix3` is
laid out the same way with 3 rows.

The types are branded: a `Matrix3` can't be passed where a `Matrix4` is
expected, or the other way round.

## Creating a matrix

[`Mat4.create()`](/Forge/docs/api/classes/Mat4#create) and
[`Mat3.create()`](/Forge/docs/api/classes/Mat3#create) return a new
identity matrix. Every other method that writes a matrix writes into its
first argument and returns it, so a matrix rebuilt every frame is created
once and reused:

```ts
import { Mat4 } from '@forge-game-engine/forge/math';

const world = Mat4.create();

Mat4.fromTransform(world, position, rotation, scale);
```

[`Mat4.fromTransform(out, position, rotation, scale)`](/Forge/docs/api/classes/Mat4#fromtransform)
builds the matrix that scales, then rotates (by a
[quaternion](./quaternions.md)), then translates.
[`fromTranslation`](/Forge/docs/api/classes/Mat4#fromtranslation),
[`fromQuat`](/Forge/docs/api/classes/Mat4#fromquat) and
[`fromScale`](/Forge/docs/api/classes/Mat4#fromscale) build one of the
three on its own. [`Mat4.clone`](/Forge/docs/api/classes/Mat4#clone) and
[`Mat4.copy`](/Forge/docs/api/classes/Mat4#copy) copy a matrix.

## Combining matrices

[`Mat4.multiply(target, value)`](/Forge/docs/api/classes/Mat4#multiply)
sets `target` to `target * value`: the transform that applies `value`
first, then `target`. A child's world matrix is its parent's world matrix
times its local matrix:

```ts
const childWorld = Mat4.multiply(Mat4.clone(parentWorld), childLocal);
```

[`Mat4.premultiply(target, value)`](/Forge/docs/api/classes/Mat4#premultiply)
sets `target` to `value * target`.
[`multiplyAffine`](/Forge/docs/api/classes/Mat4#multiplyaffine) and
[`premultiplyAffine`](/Forge/docs/api/classes/Mat4#premultiplyaffine) give
the same result for matrices whose bottom row is `0, 0, 0, 1` (every
transform and view matrix) with fewer operations.

## Transforming points and directions

[`Vec3.transformPoint(point, matrix)`](/Forge/docs/api/classes/Vec3#transformpoint)
applies a matrix to a point, including its translation, and
[`Vec3.transformDirection(direction, matrix)`](/Forge/docs/api/classes/Vec3#transformdirection)
to a direction, without it.
[`Vec3.transformPointProjective`](/Forge/docs/api/classes/Vec3#transformpointprojective)
also divides by `w`, for a projection matrix:

```ts
import { Vec3 } from '@forge-game-engine/forge/math';

const pointInWorld = Vec3.transformPoint(Vec3.clone(localPoint), world);
```

[`Vec3.transformByMatrix3`](/Forge/docs/api/classes/Vec3#transformbymatrix3)
applies a `Matrix3`.

## Inverting a matrix

[`Mat4.invert(out, matrix)`](/Forge/docs/api/classes/Mat4#invert) sets
`out` to the inverse, the transform that undoes `matrix`, for example from
world space back into an object's local space.
[`Mat4.invertAffine`](/Forge/docs/api/classes/Mat4#invertaffine) does the
same, faster, for a matrix whose bottom row is `0, 0, 0, 1`:

```ts
const worldToLocal = Mat4.invertAffine(Mat4.create(), world);

if (worldToLocal !== null) {
  Vec3.transformPoint(point, worldToLocal);
}
```

:::caution
`invert` and `invertAffine` return `null` for a matrix that has no inverse,
such as a transform with a zero scale, and leave `out` unchanged. Check for
`null` before using the result.
:::

## Reading a transform from a matrix

[`Mat4.decompose(outPosition, outRotation, outScale, matrix)`](/Forge/docs/api/classes/Mat4#decompose)
splits a matrix back into the position, rotation and scale that
`fromTransform` builds it from. A matrix that mirrors gets a negative X
scale. [`Mat4.getTranslation`](/Forge/docs/api/classes/Mat4#gettranslation)
reads only the position, and
[`Mat4.getMaxScale`](/Forge/docs/api/classes/Mat4#getmaxscale) the largest
scale along any axis.

## Building a view matrix

[`Mat4.lookAt(out, eye, target, up)`](/Forge/docs/api/classes/Mat4#lookat)
builds a view matrix: the transform from world space into the space of a
camera at `eye` looking at `target`. In view space, the camera looks along
`-Z` with `+Y` up.
[`Mat4.targetTo`](/Forge/docs/api/classes/Mat4#targetto) builds its
inverse, the world matrix of an object at `eye` whose `-Z` axis points at
`target`:

```ts
const view = Mat4.lookAt(Mat4.create(), cameraPosition, Vec3.zero, Vec3.up);
```

## Building a projection matrix

[`Mat4.perspective(out, fovY, aspect, near, far, depthRange)`](/Forge/docs/api/classes/Mat4#perspective),
[`Mat4.perspectiveInfinite(out, fovY, aspect, near, depthRange)`](/Forge/docs/api/classes/Mat4#perspectiveinfinite)
(no far plane) and
[`Mat4.orthographic(out, bounds, near, far, depthRange)`](/Forge/docs/api/classes/Mat4#orthographic)
build projection matrices for a camera looking along `-Z`. `fovY` is the
vertical field of view in radians and `aspect` the viewport's width divided
by its height. An orthographic projection's `bounds` is a `Rect` of the
visible area in view space.

`depthRange` is the clip-space depth range of the graphics backend:
`'negativeOneToOne'` for WebGL, `'zeroToOne'` for WebGPU:

```ts
const projection = Mat4.perspective(
  Mat4.create(),
  Math.PI / 3,
  width / height,
  0.1,
  1000,
  'negativeOneToOne',
);
```

## Building a normal matrix

[`Mat3.normalFromMatrix4(out, world)`](/Forge/docs/api/classes/Mat3#normalfrommatrix4)
builds the matrix that transforms an object's surface normals into world
space, which keeps them perpendicular to the surface under non-uniform
scale. It returns `null` for a world matrix with a zero scale.
[`Mat3.fromMatrix4`](/Forge/docs/api/classes/Mat3#frommatrix4) takes a
`Matrix4`'s rotation and scale without the normal correction, and
[`Mat3.fromQuat`](/Forge/docs/api/classes/Mat3#fromquat) builds a rotation
matrix.

## Using a matrix as a shader uniform

Pass a `Matrix4` to
[`Material.setUniform`](/Forge/docs/api/classes/Material#setuniform) for a
uniform declared as `mat4`, and a `Matrix3` or `Matrix3x3` for one declared
as `mat3`:

```ts
material.setUniform('u_world', world);
```

The material reads the matrix each time it's bound and converts it to
32-bit floats, so changes made to the matrix after `setUniform` are
uploaded the next time the material is bound. To write a matrix into a
`Float32Array` of your own, such as a buffer of many matrices, use
[`Mat4.toFloat32(out, offset, matrix)`](/Forge/docs/api/classes/Mat4#tofloat32).
See [Material Uniforms](../rendering/material-uniforms.md).

## 2D transforms with Matrix3x3

`Matrix3x3` holds a 2D transform in a column-major `Float32Array` of 9
numbers. [`Matrix3x3.identity`](/Forge/docs/api/classes/Matrix3x3#identity)
returns a new identity matrix, and
[`translate`](/Forge/docs/api/classes/Matrix3x3#translate),
[`rotate`](/Forge/docs/api/classes/Matrix3x3#rotate) and
[`scale`](/Forge/docs/api/classes/Matrix3x3#scale) change it in place and
return it:

```ts
import { Matrix3x3 } from '@forge-game-engine/forge/math';

const transform = Matrix3x3.identity
  .translate(100, 50)
  .rotate(Math.PI / 4)
  .scale(2, 2);
```

Each call multiplies onto the right of the current matrix, so the last call
is the first transform applied to a point: the example scales a point, then
rotates it, then translates it.
[`resetToIdentity`](/Forge/docs/api/classes/Matrix3x3#resettoidentity) sets
a matrix back to the identity without allocating.
