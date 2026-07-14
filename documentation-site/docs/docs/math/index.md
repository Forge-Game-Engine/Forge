# Math

The `@forge-game-engine/forge/math` module provides the vector, matrix, and
numeric building blocks used throughout the engine: positions, velocities,
and directions on entities, bounding boxes for collision and raycasting, and
the rendering transforms that turn world coordinates into screen space.

Everything here is plain data and pure functions, there is no `World` or
`Entity` involved. You can use these types in your own components and
systems exactly as the engine does internally.

Core concepts:

- [`Vector2`](/Forge/docs/api/classes/Vector2) and
  [`Vector3`](/Forge/docs/api/classes/Vector3): immutable-style vectors with
  arithmetic, normalization, rotation, and dot/cross products.
- [`Rect`](/Forge/docs/api/classes/Rect): an axis-aligned bounding box used
  for broad-phase collision and point/area checks.
- [`Matrix3x3`](/Forge/docs/api/classes/Matrix3x3): a 2D transformation
  matrix used to build projection matrices for rendering.
- [`Random`](/Forge/docs/api/classes/Random): a seeded random number
  generator for reproducible randomness.
- Free functions for clamping, interpolation, smoothing, and converting
  between angles and direction vectors.

Guides in this section:

- [Vectors and Rectangles](./vectors.md): `Vector2`, `Vector3`, and `Rect`
  for positions, directions, and bounding boxes.
- [Angles and Rotation](./angles-and-rotation.md): converting between
  radians, degrees, and direction vectors.
- [Interpolation and Smoothing](./interpolation-and-smoothing.md): `lerp`,
  `clamp`, `smoothDampVector2`, and `signedSquare`.
- [Transformation Matrices](./matrices.md): `Matrix3x3` for 2D transforms.
- [Seeded Random Numbers](./seeded-random.md): `Random` for reproducible
  randomness.
