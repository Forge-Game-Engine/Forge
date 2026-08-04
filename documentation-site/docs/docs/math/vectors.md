---
sidebar_position: 1
---

# Vectors and Rectangles

[`Vector2`](/Forge/docs/api/interfaces/Vector2) is the workhorse type in
Forge: positions, velocities, sizes, directions, and collision normals are
all `Vector2`. [`Vector3`](/Forge/docs/api/interfaces/Vector3) shares the
same shape and is mostly used for shader uniforms (colors, 3D data) via
[`Vec3.toFloat32Array`](/Forge/docs/api/classes/Vec3#tofloat32array).
[`Rect`](/Forge/docs/api/classes/Rect) pairs two `Vector2`s into an
axis-aligned bounding box.

`Vector2`/`Vector3` are plain `{ x, y }`/`{ x, y, z }` objects, not classes -
create one with [`Vec2.create(x, y)`](/Forge/docs/api/classes/Vec2#create)/
[`Vec3.create(x, y, z)`](/Forge/docs/api/classes/Vec3#create) rather than
`new Vector2(x, y)`, and operate on them with [`Vec2`](/Forge/docs/api/classes/Vec2)/
[`Vec3`](/Forge/docs/api/classes/Vec3)'s static methods below rather than
instance methods.

## Vector operations mutate in place

[`Vec2.add`](/Forge/docs/api/classes/Vec2#add),
[`Vec2.subtract`](/Forge/docs/api/classes/Vec2#subtract),
[`Vec2.multiply`](/Forge/docs/api/classes/Vec2#multiply),
[`Vec2.divide`](/Forge/docs/api/classes/Vec2#divide),
[`Vec2.normalize`](/Forge/docs/api/classes/Vec2#normalize),
[`Vec2.rotate`](/Forge/docs/api/classes/Vec2#rotate),
[`Vec2.perpendicular`](/Forge/docs/api/classes/Vec2#perpendicular),
[`Vec2.negate`](/Forge/docs/api/classes/Vec2#negate), and
[`Vec2.set`](/Forge/docs/api/classes/Vec2#set) all **mutate their first
argument in place** (the `target`) and return it (for chaining), rather than
allocating a new `Vector2`. This is a deliberate performance choice: the
physics engine integrates every rigid body's motion every tick, and this way
that no longer allocates a fresh vector per body per frame:

```ts
Vec2.add(body.velocity, Vec2.multiply(Vec2.clone(gravity), deltaTimeInSeconds));
Vec2.add(body.position, Vec2.multiply(Vec2.clone(body.velocity), deltaTimeInSeconds));
```

:::caution
Because these methods mutate their first argument, **clone before
operating on any vector you still need unchanged** -
[`Vec2.clone(v)`](/Forge/docs/api/classes/Vec2#clone) returns an
independent copy. This matters most for two things: a component's live
field (e.g. `entity.position.world`) that other code reads later in the
same tick, and a value you need for more than one computation. In the
example above, `gravity` and `body.velocity` are cloned before being scaled,
since scaling them in place would permanently corrupt the constant gravity
vector and double-apply velocity into itself. `body.velocity`/`body.position`
themselves are mutated directly with no clone, since mutating the entity's
own live state in place every tick is the entire point.
:::

[`Vec2.clone`](/Forge/docs/api/classes/Vec2#clone),
[`Vec2.magnitude`](/Forge/docs/api/classes/Vec2#magnitude),
[`Vec2.magnitudeSquared`](/Forge/docs/api/classes/Vec2#magnitudesquared),
[`Vec2.dot`](/Forge/docs/api/classes/Vec2#dot),
[`Vec2.cross`](/Forge/docs/api/classes/Vec2#cross),
[`Vec2.distanceTo`](/Forge/docs/api/classes/Vec2#distanceto),
[`Vec2.equals`](/Forge/docs/api/classes/Vec2#equals),
[`Vec2.toString`](/Forge/docs/api/classes/Vec2#tostring), and
[`Vec2.toFloat32Array`](/Forge/docs/api/classes/Vec2#tofloat32array)
never mutate their arguments - they only read them (or, for `clone`, copy
into a brand new vector).

`Vec3` mirrors this with a static method of the same name for each: `add`,
`subtract`, `multiply`, `multiplyComponents`, `divide`, `normalize`,
`floorComponents`, `set`, `clone`, and so on. Note that `Vec3` has no
`rotate`/`dot`/`cross`/`perpendicular`/`negate`/`distanceTo` - those are
`Vec2`-only.

## Static directions and the y-down convention

[`Vec2.up`](/Forge/docs/api/classes/Vec2#up),
[`Vec2.down`](/Forge/docs/api/classes/Vec2#down),
[`Vec2.left`](/Forge/docs/api/classes/Vec2#left),
[`Vec2.right`](/Forge/docs/api/classes/Vec2#right),
[`Vec2.zero`](/Forge/docs/api/classes/Vec2#zero), and
[`Vec2.one`](/Forge/docs/api/classes/Vec2#one) are convenience getters -
each access returns a **fresh vector**, not a shared instance, so it's
always safe to mutate the result. Forge's y-axis points **down** the screen
(matching canvas coordinates), so `Vec2.up` is `(0, -1)` and `Vec2.down` is
`(0, 1)`. Keep this in mind whenever "up" means "toward the top of the
screen" - for example, gravity that pulls things down the screen is a
_positive_ y value.

`Vec3` has the same `zero`/`one` getters plus
`up`/`down`/`left`/`right`/`forward`/`backward` for the z-axis, but does not
use the y-down convention since it isn't tied to screen space.

## Length, direction, and normalization

- [`Vec2.magnitude(v)`](/Forge/docs/api/classes/Vec2#magnitude) returns the
  vector's length; [`Vec2.magnitudeSquared(v)`](/Forge/docs/api/classes/Vec2#magnitudesquared)
  skips the `Math.sqrt` call.
- [`Vec2.normalize(v)`](/Forge/docs/api/classes/Vec2#normalize) scales `v`
  in place to unit length, in the same direction.
- [`Vec2.distanceTo(a, b)`](/Forge/docs/api/classes/Vec2#distanceto),
  [`Vec2.dot(a, b)`](/Forge/docs/api/classes/Vec2#dot),
  [`Vec2.cross(a, b)`](/Forge/docs/api/classes/Vec2#cross), and
  [`Vec2.perpendicular(v)`](/Forge/docs/api/classes/Vec2#perpendicular)
  are the standard tools for collision normals, tangents, and angle-free
  direction comparisons; the physics module's collision resolver builds its
  friction tangent with `Vec2.perpendicular(Vec2.clone(normal))` and
  projects relative velocity onto it with `Vec2.dot`.

:::caution
`Vec2.normalize(v)` **throws** if `v` has zero length, since its direction
is undefined. If a zero-length input is possible in your code (for example,
two overlapping bodies with no separation vector), check
`Vec2.magnitude(v) === 0` explicitly before normalizing rather than letting
the call throw.
:::

### Performance: prefer `Vec2.magnitudeSquared` for comparisons

Whenever you only need to **compare** distances or radii, use
`Vec2.magnitudeSquared(v)` to avoid the square root. `PolygonCollider`
computes its bounding radius this way, comparing every vertex's
`Vec2.magnitudeSquared()` and taking a single `Math.sqrt` only at the end,
rather than calling `Vec2.magnitude()` once per vertex.

## Scaling around a pivot

[`scaleRelativeToPoint(point, pivot, scale)`](/Forge/docs/api/functions/scaleRelativeToPoint)
scales `point` by `scale`, keeping `pivot` fixed, returning a new vector
(this one does not mutate `point`). This is the function you want for
"zoom toward the cursor" or scaling a shape around something other than the
origin, where `Vec2.multiplyComponents(point, scale)` would also shift the
shape's position.

## Rect: axis-aligned bounding boxes

A [`Rect`](/Forge/docs/api/classes/Rect) is an `origin` (top-left corner) and
a `size` (width/height), with two methods:

- [`containsPoint(point)`](/Forge/docs/api/classes/Rect#containspoint): is a
  point inside the rectangle?
- [`intersects(other)`](/Forge/docs/api/classes/Rect#intersects): do two
  rectangles overlap?

```ts
const button = new Rect(Vec2.create(10, 10), Vec2.create(120, 32));

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
fixed speed, combining `Vec2.subtract`, `Vec2.magnitude`, `Vec2.normalize`,
`Vec2.multiply`, and `Vec2.add`:

```ts
import { Vec2, Vec3 } from '@forge-game-engine/forge/math';
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
      const toTarget = Vec2.subtract(Vec2.clone(target.value), position.world);
      const distance = Vec2.magnitude(toTarget);

      if (distance < 1) {
        continue;
      }

      const step = Vec2.multiply(
        Vec2.normalize(toTarget),
        seekSpeed * deltaTimeInSeconds,
      );

      Vec2.add(position.world, step);
    }
  },
};
```

The early `return` when `distance < 1` avoids calling `Vec2.normalize` on a
near-zero vector, which would otherwise make the entity jitter in place as
`toTarget` flips direction on tiny floating-point differences once it
reaches the target.
