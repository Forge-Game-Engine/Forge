---
sidebar_position: 1
---

# Vectors and Rectangles

[`Vector2`](/Forge/docs/api/interfaces/Vector2) is a plain `{ x, y }`
object. The engine uses it for positions, velocities, sizes, directions and
normals. [`Vector3`](/Forge/docs/api/interfaces/Vector3) is a plain
`{ x, y, z }` object. [`Rect`](/Forge/docs/api/interfaces/Rect) is an
axis-aligned rectangle made of two `Vector2` corners.

## Creating a vector

Vectors are object literals, not class instances:

```ts
import { Vector2, Vector3 } from '@forge-game-engine/forge/math';

const position: Vector2 = { x: 10, y: 20 };
const color: Vector3 = { x: 1, y: 0.5, z: 0 };
```

The static getters [`Vec2.zero`](/Forge/docs/api/classes/Vec2#zero),
[`Vec2.one`](/Forge/docs/api/classes/Vec2#one),
[`Vec2.up`](/Forge/docs/api/classes/Vec2#up),
[`Vec2.down`](/Forge/docs/api/classes/Vec2#down),
[`Vec2.left`](/Forge/docs/api/classes/Vec2#left) and
[`Vec2.right`](/Forge/docs/api/classes/Vec2#right) return a new vector on
every access, so the result can be changed without affecting other code.
The world is Y-up: `Vec2.up` is `(0, 1)` and `Vec2.down` is `(0, -1)`.
[`Vec3`](/Forge/docs/api/classes/Vec3) has the same getters, plus
[`forward`](/Forge/docs/api/classes/Vec3#forward) `(0, 0, -1)`,
[`backward`](/Forge/docs/api/classes/Vec3#backward) `(0, 0, 1)` and
[`modelFront`](/Forge/docs/api/classes/Vec3#modelfront) `(0, 0, 1)`.

## Directions in 3D

The 3D space is right-handed and Y-up: `+X` is right, `+Y` is up and `+Z`
points towards the viewer. Cameras, lights and anything that aims look
along `Vec3.forward`, `-Z`. A model's front faces `Vec3.modelFront`, `+Z`,
as glTF specifies, so a model faces a camera that looks at it along `-Z`.

## Changing a vector

The static methods of [`Vec2`](/Forge/docs/api/classes/Vec2) and
[`Vec3`](/Forge/docs/api/classes/Vec3) that change a vector (`add`,
`subtract`, `multiply`, `multiplyComponents`, `divide`, `normalize`,
`floorComponents`, `negate`, `rotate`, for `Vec2` also `perpendicular`, and
for `Vec3` also `set`, `setComponents`, `cross`, `min`, `max`, `abs`,
`scaleAndAdd`, `lerp`, `projectOnPlane`, `reflect` and the `transform`
methods) write the result into their first argument and return it. No new
vector is created:

```ts
import { Vec2 } from '@forge-game-engine/forge/math';

const velocity = { x: 2, y: 0 };

Vec2.add(velocity, { x: 0, y: 1 }); // velocity is now (2, 1)
Vec2.multiply(velocity, 3); // velocity is now (6, 3)
```

Because each method returns its first argument, calls can be nested. To
compute a new vector without changing an existing one, pass a copy made with
[`Vec2.clone`](/Forge/docs/api/classes/Vec2#clone):

```ts
const offset = Vec2.multiply(Vec2.clone(velocity), deltaTimeInSeconds);

Vec2.add(position, offset);
```

:::caution
Passing a component's field or a shared constant as the first argument
changes it. Clone any vector that has to keep its value.
:::

## Reading a vector

[`magnitude`](/Forge/docs/api/classes/Vec2#magnitude),
[`magnitudeSquared`](/Forge/docs/api/classes/Vec2#magnitudesquared),
[`distanceTo`](/Forge/docs/api/classes/Vec2#distanceto),
[`dot`](/Forge/docs/api/classes/Vec2#dot),
[`cross`](/Forge/docs/api/classes/Vec2#cross),
[`equals`](/Forge/docs/api/classes/Vec2#equals),
[`toString`](/Forge/docs/api/classes/Vec2#tostring) and
[`toFloat32Array`](/Forge/docs/api/classes/Vec2#tofloat32array) return a
value and don't change their arguments:

```ts
const speed = Vec2.magnitude(velocity);
const distance = Vec2.distanceTo(position, target);
const facing = Vec2.dot(direction, Vec2.up);
```

`magnitudeSquared` returns the squared length without a square root. Compare
it with a squared distance to check a range:

```ts
if (Vec2.magnitudeSquared(offset) < radius * radius) {
  // offset is inside the radius
}
```

`Vec3` has the same methods, except that its distance methods are
[`distance`](/Forge/docs/api/classes/Vec3#distance) and
[`distanceSquared`](/Forge/docs/api/classes/Vec3#distancesquared) and its
[`cross`](/Forge/docs/api/classes/Vec3#cross) writes `target × value` into
`target`. [`Vec3.angleBetween`](/Forge/docs/api/classes/Vec3#anglebetween)
returns the angle between two vectors, from `0` to `π`.

## Normalizing a vector

[`Vec2.normalize`](/Forge/docs/api/classes/Vec2#normalize) scales a vector
to length `1` in the same direction:

```ts
const direction = Vec2.normalize(Vec2.subtract(Vec2.clone(target), position));
```

:::caution
`normalize` throws when the vector's length is `0`. When a vector can be
zero (for example, the offset between two equal positions), check
`Vec2.magnitudeSquared(vector) === 0` before normalizing it.
:::

## Rotating a vector

[`Vec2.rotate`](/Forge/docs/api/classes/Vec2#rotate) rotates a vector by an
angle in radians, counter-clockwise for a positive angle (see
[Angles and Rotation](./angles-and-rotation.md)).
[`Vec2.perpendicular`](/Forge/docs/api/classes/Vec2#perpendicular) rotates
it a quarter turn clockwise, to `(y, -x)`, and
[`Vec2.negate`](/Forge/docs/api/classes/Vec2#negate) reverses it:

```ts
Vec2.rotate(offset, Math.PI / 2); // (1, 0) becomes (0, 1)
Vec2.perpendicular(normal); // (0, 1) becomes (1, 0)
```

[`Vec3.rotate(vector, rotation)`](/Forge/docs/api/classes/Vec3#rotate)
rotates a 3D vector by a [quaternion](./quaternions.md), and
[`Vec3.transformPoint`](/Forge/docs/api/classes/Vec3#transformpoint) and
[`Vec3.transformDirection`](/Forge/docs/api/classes/Vec3#transformdirection)
transform it by a [matrix](./matrices.md).

## Building a 3D vector from a 2D one

[`Vec3.fromVector2(out, vector, z)`](/Forge/docs/api/classes/Vec3#fromvector2)
sets `out` to a `Vector2`'s `x` and `y` with the given `z`. `Vec2`'s methods
read and write only `x` and `y`, so they also work on a `Vector3`.

## Scaling around a pivot

[`scaleRelativeToPoint(point, pivot, scale)`](/Forge/docs/api/functions/scaleRelativeToPoint)
returns a new vector: `point` scaled by `scale` with `pivot` as the fixed
point. `point` isn't changed. `Vec2.multiplyComponents(point, scale)` scales
around the origin instead.

```ts
import { scaleRelativeToPoint } from '@forge-game-engine/forge/math';

const scaled = scaleRelativeToPoint(
  { x: 20, y: 10 },
  { x: 10, y: 10 },
  { x: 2, y: 2 },
); // (30, 10)
```

## Rectangles

A [`Rect`](/Forge/docs/api/interfaces/Rect) has a `min` corner (lower left)
and a `max` corner (upper right). The static methods of
[`Rects`](/Forge/docs/api/classes/Rects) operate on it:

- [`Rects.size`](/Forge/docs/api/classes/Rects#size) returns `max - min` as
  a new `Vector2`.
- [`Rects.contains`](/Forge/docs/api/classes/Rects#contains) returns whether
  a point is inside the rectangle.
- [`Rects.intersects`](/Forge/docs/api/classes/Rects#intersects) returns
  whether two rectangles overlap.
- [`Rects.clone`](/Forge/docs/api/classes/Rects#clone) returns a copy with
  new corner vectors.

```ts
import { Rect, Rects } from '@forge-game-engine/forge/math';

const area: Rect = { min: { x: 0, y: 0 }, max: { x: 100, y: 50 } };

if (Rects.contains(area, point)) {
  // point is inside area
}
```

:::note
`contains` and `intersects` include the edges: a point on an edge is inside,
and two rectangles that only share an edge or a corner intersect.
:::
