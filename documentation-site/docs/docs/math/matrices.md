---
sidebar_position: 4
---

# Transformation Matrices

[`Matrix3x3`](/Forge/docs/api/classes/Matrix3x3) represents a 3x3 2D
transformation matrix, stored as a flat, column-major `Float32Array` of 9
numbers. Forge's renderer uses it to build the projection matrix passed to
shaders each frame, converting world-space coordinates into clip space.

## Matrices mutate in place

Unlike [`Vector2`](/Forge/docs/api/classes/Vector2) and
[`Vector3`](/Forge/docs/api/classes/Vector3), whose arithmetic methods
return new instances, [`translate`](/Forge/docs/api/classes/Matrix3x3#translate),
[`rotate`](/Forge/docs/api/classes/Matrix3x3#rotate), and
[`scale`](/Forge/docs/api/classes/Matrix3x3#scale) **mutate the matrix in
place** and return `this` for chaining:

```ts
const projectionMatrix = Matrix3x3.identity;

projectionMatrix.scale(2 / width, -2 / height);
projectionMatrix.scale(zoom, zoom);
projectionMatrix.translate(-cameraPosition.x, -cameraPosition.y);
```

Each call composes the new transform onto the matrix's current state, so
**order matters**. The example above (Forge's own projection matrix) scales
to clip space, then applies zoom, then re-centers on the camera; applying
`translate` before the scales would translate by a different amount, since
the translation itself would then be scaled.

## Identity: `Matrix3x3.identity` vs `resetToIdentity()`

[`Matrix3x3.identity`](/Forge/docs/api/classes/Matrix3x3#identity) is a
static getter that allocates a **new** identity matrix every time it's
accessed, use it when you need a fresh matrix, for example at the start of
building a new projection matrix as above.

[`resetToIdentity()`](/Forge/docs/api/classes/Matrix3x3#resettoidentity)
resets an **existing** matrix's values back to identity without allocating a
new `Float32Array`. If you keep a `Matrix3x3` instance around (for example,
one rebuilt every frame), call `resetToIdentity()` on it rather than
replacing it with `Matrix3x3.identity`, to avoid creating garbage every
frame.

## Using a matrix as a shader uniform

`Matrix3x3` instances can be passed directly to
[`Material.setUniform`](/Forge/docs/api/classes/Material#setuniform).
Internally, the material reads [`matrix`](/Forge/docs/api/classes/Matrix3x3#matrix),
the underlying `Float32Array`, and uploads it as a `mat3` uniform:

```ts
renderable.material.setUniform('u_projection', projectionMatrix);
```

You don't need to call `.matrix` yourself, `setUniform` checks `instanceof Matrix3x3`
and extracts the array for you.
