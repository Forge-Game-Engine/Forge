---
sidebar_position: 1
---

# Vectors and Rectangles

[`Vector2`](/Forge/docs/api/interfaces/Vector2) is the workhorse type in
Forge: positions, velocities, sizes, directions, and collision normals are
all `Vector2`. [`Vector3`](/Forge/docs/api/interfaces/Vector3) shares the
same shape and is mostly used for shader uniforms (colors, 3D data) via
[`vector3ToFloat32Array`](/Forge/docs/api/functions/vector3ToFloat32Array).
[`Rect`](/Forge/docs/api/classes/Rect) pairs two `Vector2`s into an
axis-aligned bounding box.

`Vector2`/`Vector3` are plain `{ x, y }`/`{ x, y, z }` objects, not classes -
create one with [`createVector2(x, y)`](/Forge/docs/api/functions/createVector2)/[`createVector3(x, y, z)`](/Forge/docs/api/functions/createVector3)
rather than `new Vector2(x, y)`, and operate on them with the standalone
functions below rather than instance methods.

## Vector operations mutate in place

[`vector2Add`](/Forge/docs/api/functions/vector2Add),
[`vector2Subtract`](/Forge/docs/api/functions/vector2Subtract),
[`vector2Multiply`](/Forge/docs/api/functions/vector2Multiply),
[`vector2Divide`](/Forge/docs/api/functions/vector2Divide),
[`vector2Normalize`](/Forge/docs/api/functions/vector2Normalize),
[`vector2Rotate`](/Forge/docs/api/functions/vector2Rotate),
[`vector2Perpendicular`](/Forge/docs/api/functions/vector2Perpendicular),
[`vector2Negate`](/Forge/docs/api/functions/vector2Negate), and
[`vector2Set`](/Forge/docs/api/functions/vector2Set) all **mutate their first
argument in place** and return it (for chaining), rather than allocating a
new `Vector2`. This is a deliberate performance choice: the physics engine
integrates every rigid body's motion every tick, and this way that no longer
allocates a fresh vector per body per frame:

```ts
vector2Add(body.velocity, vector2Multiply(vector2Clone(gravity), deltaTimeInSeconds));
vector2Add(body.position, vector2Multiply(vector2Clone(body.velocity), deltaTimeInSeconds));
```

:::caution
Because these functions mutate their first argument, **clone before
operating on any vector you still need unchanged** -
[`vector2Clone(v)`](/Forge/docs/api/functions/vector2Clone) returns an
independent copy. This matters most for two things: a component's live
field (e.g. `entity.position.world`) that other code reads later in the
same tick, and a value you need for more than one computation. In the
example above, `gravity` and `body.velocity` are cloned before being scaled,
since scaling them in place would permanently corrupt the constant gravity
vector and double-apply velocity into itself. `body.velocity`/`body.position`
themselves are mutated directly with no clone, since mutating the entity's
own live state in place every tick is the entire point.
:::

[`vector2Clone`](/Forge/docs/api/functions/vector2Clone),
[`vector2Magnitude`](/Forge/docs/api/functions/vector2Magnitude),
[`vector2MagnitudeSquared`](/Forge/docs/api/functions/vector2MagnitudeSquared),
[`vector2Dot`](/Forge/docs/api/functions/vector2Dot),
[`vector2Cross`](/Forge/docs/api/functions/vector2Cross),
[`vector2DistanceTo`](/Forge/docs/api/functions/vector2DistanceTo),
[`vector2Equals`](/Forge/docs/api/functions/vector2Equals),
[`vector2ToString`](/Forge/docs/api/functions/vector2ToString), and
[`vector2ToFloat32Array`](/Forge/docs/api/functions/vector2ToFloat32Array)
never mutate their arguments - they only read them (or, for `clone`, copy
into a brand new vector).

`Vector3` mirrors this with a `vector3`-prefixed function for each: `vector3Add`,
`vector3Subtract`, `vector3Multiply`, `vector3MultiplyComponents`, `vector3Divide`,
`vector3Normalize`, `vector3FloorComponents`, `vector3Set`, `vector3Clone`, and so on.
Note that `Vector3` has no `vector3Rotate`/`vector3Dot`/`vector3Cross`/`vector3Perpendicular`/
`vector3Negate`/`vector3DistanceTo` - those are Vector2-only.

## Static directions and the y-down convention

[`vector2Up`](/Forge/docs/api/functions/vector2Up),
[`vector2Down`](/Forge/docs/api/functions/vector2Down),
[`vector2Left`](/Forge/docs/api/functions/vector2Left),
[`vector2Right`](/Forge/docs/api/functions/vector2Right),
[`vector2Zero`](/Forge/docs/api/functions/vector2Zero), and
[`vector2One`](/Forge/docs/api/functions/vector2One) are convenience
factories - each call returns a **fresh vector**, not a shared instance, so
it's always safe to mutate the result. Forge's y-axis points **down** the
screen (matching canvas coordinates), so `vector2Up()` is `(0, -1)` and
`vector2Down()` is `(0, 1)`. Keep this in mind whenever "up" means "toward
the top of the screen" - for example, gravity that pulls things down the
screen is a _positive_ y value.

`Vector3` has the same `vector3Zero()`/`vector3One()` factories plus
`vector3Up()`/`vector3Down()`/`vector3Left()`/`vector3Right()`/`vector3Forward()`/`vector3Backward()`
for the z-axis, but does not use the y-down convention since it isn't tied
to screen space.

## Length, direction, and normalization

- [`vector2Magnitude(v)`](/Forge/docs/api/functions/vector2Magnitude) returns
  the vector's length; [`vector2MagnitudeSquared(v)`](/Forge/docs/api/functions/vector2MagnitudeSquared)
  skips the `Math.sqrt` call.
- [`vector2Normalize(v)`](/Forge/docs/api/functions/vector2Normalize) scales
  `v` in place to unit length, in the same direction.
- [`vector2DistanceTo(a, b)`](/Forge/docs/api/functions/vector2DistanceTo),
  [`vector2Dot(a, b)`](/Forge/docs/api/functions/vector2Dot),
  [`vector2Cross(a, b)`](/Forge/docs/api/functions/vector2Cross), and
  [`vector2Perpendicular(v)`](/Forge/docs/api/functions/vector2Perpendicular)
  are the standard tools for collision normals, tangents, and angle-free
  direction comparisons; the physics module's collision resolver builds its
  friction tangent with `vector2Perpendicular(vector2Clone(normal))` and
  projects relative velocity onto it with `vector2Dot`.

:::caution
`vector2Normalize(v)` on a zero-length vector leaves `v` as the **same
zero vector** unchanged, not `NaN`. This is a safe default (no crash), but it
silently means "no direction". If a zero-length input is meaningful in your
code (for example, two overlapping bodies with no separation vector), check
`vector2Magnitude(v) === 0` explicitly rather than trusting the normalized
result to signal it.
:::

### Performance: prefer `vector2MagnitudeSquared` for comparisons

Whenever you only need to **compare** distances or radii, use
`vector2MagnitudeSquared(v)` to avoid the square root. `PolygonCollider`
computes its bounding radius this way, comparing every vertex's
`vector2MagnitudeSquared()` and taking a single `Math.sqrt` only at the end,
rather than calling `vector2Magnitude()` once per vertex.

## Scaling around a pivot

[`scaleRelativeToPoint(point, pivot, scale)`](/Forge/docs/api/functions/scaleRelativeToPoint)
scales `point` by `scale`, keeping `pivot` fixed, returning a new vector
(this one does not mutate `point`). This is the function you want for
"zoom toward the cursor" or scaling a shape around something other than the
origin, where `vector2MultiplyComponents(point, scale)` would also shift the
shape's position.

## Rect: axis-aligned bounding boxes

A [`Rect`](/Forge/docs/api/classes/Rect) is an `origin` (top-left corner) and
a `size` (width/height), with two methods:

- [`containsPoint(point)`](/Forge/docs/api/classes/Rect#containspoint): is a
  point inside the rectangle?
- [`intersects(other)`](/Forge/docs/api/classes/Rect#intersects): do two
  rectangles overlap?

```ts
const button = new Rect(createVector2(10, 10), createVector2(120, 32));

if (button.containsPoint(mousePosition)) {
  // mouse is over the button
}
```

:::caution
Both methods are **inclusive of edges**: two rectangles that only touch along
an edge or at a corner count as intersecting, and a zero-size `Rect` still
contains its single `origin` point. This is the right behavior for
broad-phase collision (touching counts as a potential collision), but can be
surprising for UI hit-testing where you might expect adjacent elements to be
mutually exclusive.
:::

See [Bodies and Shapes](../physics/rigid-bodies.md) and
[Raycasting](../physics/raycasting.md) for how `Rect` is used in the physics
module.

## Worked example: seeking a target

A common gameplay pattern is moving an entity toward a target position at a
fixed speed, combining `vector2Subtract`, `vector2Magnitude`,
`vector2Normalize`, `vector2Multiply`, and `vector2Add`:

```ts
import {
  vector2Add,
  vector2Clone,
  vector2Magnitude,
  vector2Multiply,
  vector2Normalize,
  vector2Subtract,
} from '@forge-game-engine/forge/math';
import { positionId } from '@forge-game-engine/forge/common';

const seekSpeed = 120; // pixels per second

const seekSystem = {
  query: [positionId, targetId] as const,
  update(world, { components: [positions, targets] }) {
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      const target = targets[i];

      // Clone before subtracting: `target.value` is still needed unchanged
      // next tick, and `position.world` is the entity's live position.
      const toTarget = vector2Subtract(vector2Clone(target.value), position.world);
      const distance = vector2Magnitude(toTarget);

      if (distance < 1) {
        continue;
      }

      const step = vector2Multiply(
        vector2Normalize(toTarget),
        seekSpeed * deltaTimeInSeconds,
      );

      vector2Add(position.world, step);
    }
  },
};
```

The early `return` when `distance < 1` avoids calling `vector2Normalize` on a
near-zero vector, which would otherwise make the entity jitter in place as
`toTarget` flips direction on tiny floating-point differences once it
reaches the target.
