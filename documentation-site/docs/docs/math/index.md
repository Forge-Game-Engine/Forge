# Math

The `@forge-game-engine/forge/math` module holds the vector, rectangle,
matrix and numeric types and functions the rest of the engine uses for
positions, directions, sizes, bounds and transforms. They are plain data and
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
- [Angles](./angles-and-rotation.md): the engine's angle convention and the
  functions that convert between radians, degrees and direction vectors.
- [Interpolation and smoothing](./interpolation-and-smoothing.md): `lerp`,
  `clamp`, `smoothDampVector2` and `signedSquare`.
- [Matrices](./matrices.md): [`Matrix3x3`](/Forge/docs/api/classes/Matrix3x3),
  a 2D transformation matrix.
- [Seeded random numbers](./seeded-random.md):
  [`Random`](/Forge/docs/api/classes/Random), a random number generator that
  produces the same sequence for the same seed.
