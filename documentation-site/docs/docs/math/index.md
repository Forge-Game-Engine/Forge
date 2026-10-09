# Math

The `@forge-game-engine/forge/math` module holds the vector, rectangle,
quaternion, matrix, geometric and numeric types and functions the rest of
the engine uses for positions, directions, rotations, sizes, bounds and
transforms. They are plain data and
pure functions with no dependency on an `EcsWorld`, so components and
systems use them directly.

The module is made of:

- [Vectors and rectangles](./vectors.md):
  [`Vector2`](/Forge/docs/api/interfaces/Vector2),
  [`Vector3`](/Forge/docs/api/interfaces/Vector3) and
  [`Rect`](/Forge/docs/api/interfaces/Rect) are plain objects, operated on
  by the static methods of [`Vec2`](/Forge/docs/api/classes/Vec2),
  [`Vec3`](/Forge/docs/api/classes/Vec3) and
  [`Rects`](/Forge/docs/api/classes/Rects).
- [Angles](./angles-and-rotation.md): the engine's angle convention in 2D
  and 3D, and the functions that convert between radians, degrees and
  direction vectors.
- [Quaternions](./quaternions.md):
  [`Quaternion`](/Forge/docs/api/interfaces/Quaternion), a 3D rotation,
  operated on by the static methods of
  [`Quat`](/Forge/docs/api/classes/Quat).
- [Interpolation and smoothing](./interpolation-and-smoothing.md): `lerp`,
  `clamp`, `smoothDampVector2` and `signedSquare`.
- [Matrices](./matrices.md): [`Matrix4`](/Forge/docs/api/type-aliases/Matrix4)
  and [`Matrix3`](/Forge/docs/api/type-aliases/Matrix3), operated on by
  [`Mat4`](/Forge/docs/api/classes/Mat4) and
  [`Mat3`](/Forge/docs/api/classes/Mat3), for 3D transforms, views and
  projections, and [`Matrix3x3`](/Forge/docs/api/classes/Matrix3x3), a 2D
  transformation matrix.
- [Rays, planes, bounds and frustums](./geometry.md): 3D shapes for
  picking, culling and spatial queries.
- [Seeded random numbers](./seeded-random.md):
  [`Random`](/Forge/docs/api/classes/Random), a random number generator that
  produces the same sequence for the same seed.
