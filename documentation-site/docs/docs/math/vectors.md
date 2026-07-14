---
sidebar_position: 1
---

# Vectors and Rectangles

[`Vector2`](/Forge/docs/api/classes/Vector2) is the workhorse type in Forge:
positions, velocities, sizes, directions, and collision normals are all
`Vector2`. [`Vector3`](/Forge/docs/api/classes/Vector3) shares the same
shape and is mostly used for shader uniforms (colors, 3D data) via
[`toFloat32Array`](/Forge/docs/api/classes/Vector3#tofloat32array).
[`Rect`](/Forge/docs/api/classes/Rect) pairs two `Vector2`s into an
axis-aligned bounding box.

## Vectors are immutable by convention

[`add`](/Forge/docs/api/classes/Vector2#add),
[`subtract`](/Forge/docs/api/classes/Vector2#subtract),
[`multiply`](/Forge/docs/api/classes/Vector2#multiply),
[`divide`](/Forge/docs/api/classes/Vector2#divide), and
[`normalize`](/Forge/docs/api/classes/Vector2#normalize) all return a **new**
`Vector2` and leave the original untouched. The only method that mutates is
[`set`](/Forge/docs/api/classes/Vector2#set), which copies another vector's
components into this one. This is how the physics engine integrates motion
every step:

```ts
body.velocity = body.velocity.add(gravity.multiply(deltaTimeInSeconds));
body.position = body.position.add(body.velocity.multiply(deltaTimeInSeconds));
```

Because every operation allocates a new vector, chaining several of them
inside a per-entity, per-frame loop (as above) is normal and fine at typical
entity counts. If you're iterating over thousands of entities and profiling
shows vector allocation as a hotspot, prefer mutating fields directly
(`position.x += velocity.x * dt`) in that one hot path rather than rewriting
the whole API to be mutable.

## Static directions and the y-down convention

`Vector2.up`, `down`, `left`, `right`, `zero`, and `one` are convenience
constants. Forge's y-axis points **down** the screen (matching canvas
coordinates), so `Vector2.up` is `(0, -1)` and `Vector2.down` is `(0, 1)`.
Keep this in mind whenever "up" means "toward the top of the screen", for
example gravity that pulls things down the screen is a _positive_ y value.

`Vector3` has the same `zero`/`one` constants plus `up`/`down`/`left`/`right`/`forward`/`backward`
for the z-axis, but does not use the y-down convention since it isn't tied
to screen space.

## Length, direction, and normalization

- [`magnitude()`](/Forge/docs/api/classes/Vector2#magnitude) returns the
  vector's length; [`magnitudeSquared()`](/Forge/docs/api/classes/Vector2#magnitudesquared)
  skips the `Math.sqrt` call.
- [`normalize()`](/Forge/docs/api/classes/Vector2#normalize) returns a unit
  vector pointing in the same direction.
- [`distanceTo(other)`](/Forge/docs/api/classes/Vector2#distanceto),
  [`dot(other)`](/Forge/docs/api/classes/Vector2#dot),
  [`cross(other)`](/Forge/docs/api/classes/Vector2#cross), and
  [`perpendicular()`](/Forge/docs/api/classes/Vector2#perpendicular) are the
  standard tools for collision normals, tangents, and angle-free direction
  comparisons; the physics module's collision resolver builds its friction
  tangent with `normal.perpendicular()` and projects relative velocity onto
  it with `dot`.

:::caution
`normalize()` on a zero-length vector returns the **same zero vector**
unchanged, not `NaN`. This is a safe default (no crash), but it silently
means "no direction". If a zero-length input is meaningful in your code
(for example, two overlapping bodies with no separation vector), check
`magnitude() === 0` explicitly rather than trusting the normalized result to
signal it.
:::

### Performance: prefer `magnitudeSquared` for comparisons

Whenever you only need to **compare** distances or radii, use
`magnitudeSquared()` to avoid the square root. `PolygonShape` computes its
bounding radius this way, comparing every vertex's `magnitudeSquared()` and
taking a single `Math.sqrt` only at the end, rather than calling `magnitude()`
once per vertex.

## Scaling around a pivot

[`scaleRelativeToPoint(point, pivot, scale)`](/Forge/docs/api/functions/scaleRelativeToPoint)
scales `point` by `scale`, keeping `pivot` fixed. This is the function you
want for "zoom toward the cursor" or scaling a shape around something other
than the origin, where a plain `point.multiplyComponents(scale)` would also
shift the shape's position.

## Rect: axis-aligned bounding boxes

A [`Rect`](/Forge/docs/api/classes/Rect) is an `origin` (top-left corner) and
a `size` (width/height), with two methods:

- [`containsPoint(point)`](/Forge/docs/api/classes/Rect#containspoint): is a
  point inside the rectangle?
- [`intersects(other)`](/Forge/docs/api/classes/Rect#intersects): do two
  rectangles overlap?

```ts
const button = new Rect(new Vector2(10, 10), new Vector2(120, 32));

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

`RigidBody` uses `Rect` as its [`aabb`](/Forge/docs/api/classes/RigidBody#aabb)
for broad-phase collision, and caches it, recomputing only when `position`
changes, since broad-phase collision checks read `aabb` for every body pair,
every step. See [Bodies and Shapes](../physics/rigid-bodies.md) and
[Raycasting](../physics/raycasting.md) for how `Rect` is used in the physics
module.

## Worked example: seeking a target

A common gameplay pattern is moving an entity toward a target position at a
fixed speed, combining `subtract`, `magnitude`, `normalize`, `multiply`, and
`add`:

```ts
import { Vector2 } from '@forge-game-engine/forge/math';
import { positionId } from '@forge-game-engine/forge/common';

const seekSpeed = 120; // pixels per second

const seekSystem = {
  query: [positionId, targetId] as const,
  run(result) {
    const [position, target] = result.components;

    const toTarget = target.value.subtract(position.world);
    const distance = toTarget.magnitude();

    if (distance < 1) {
      return;
    }

    const step = toTarget.normalize().multiply(seekSpeed * deltaTimeInSeconds);

    position.world = position.world.add(step);
  },
};
```

The early `return` when `distance < 1` avoids calling `normalize()` on a
near-zero vector, which would otherwise make the entity jitter in place as
`toTarget` flips direction on tiny floating-point differences once it
reaches the target.
