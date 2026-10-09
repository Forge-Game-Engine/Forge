---
sidebar_position: 6
---

# Rays, Planes, Bounds and Frustums

The math module has five 3D shapes for picking, culling and spatial
queries: a [`Ray`](/Forge/docs/api/interfaces/Ray), a
[`Plane`](/Forge/docs/api/interfaces/Plane), a
[`BoundingBox`](/Forge/docs/api/interfaces/BoundingBox), a
[`BoundingSphere`](/Forge/docs/api/interfaces/BoundingSphere) and a
[`Frustum`](/Forge/docs/api/interfaces/Frustum). Each is a plain object,
operated on by the static methods of
[`Rays`](/Forge/docs/api/classes/Rays),
[`Planes`](/Forge/docs/api/classes/Planes),
[`BoundingBoxes`](/Forge/docs/api/classes/BoundingBoxes),
[`BoundingSpheres`](/Forge/docs/api/classes/BoundingSpheres) and
[`Frustums`](/Forge/docs/api/classes/Frustums), as `Rect` is by `Rects`.
A method that writes a shape or point writes into its first argument and
returns it.

## Shapes

| Shape            | Fields                | Holds                                                                                |
| ---------------- | --------------------- | ------------------------------------------------------------------------------------ |
| `Ray`            | `origin`, `direction` | The points `origin + direction * t` for `t >= 0`; `direction` is unit length         |
| `Plane`          | `normal`, `constant`  | The points `p` with `dot(normal, p) + constant = 0`; `normal` is unit length         |
| `BoundingBox`    | `min`, `max`          | The axis-aligned box between two corners                                             |
| `BoundingSphere` | `center`, `radius`    | The sphere around a center                                                           |
| `Frustum`        | `planes`              | Six planes (left, right, bottom, top, near, far) whose normals point into the volume |

## Casting a ray

The `Rays` intersection tests return the distance along the ray to the
first point where it meets a shape, or `null` when it misses:

- [`Rays.intersectPlane(ray, plane)`](/Forge/docs/api/classes/Rays#intersectplane)
- [`Rays.intersectSphere(ray, sphere)`](/Forge/docs/api/classes/Rays#intersectsphere)
- [`Rays.intersectBox(ray, box)`](/Forge/docs/api/classes/Rays#intersectbox)
- [`Rays.intersectTriangle(ray, a, b, c, cullBackFaces)`](/Forge/docs/api/classes/Rays#intersecttriangle)

[`Rays.at(out, ray, distance)`](/Forge/docs/api/classes/Rays#at) returns
the point at that distance:

```ts
import { Rays, Vec3 } from '@forge-game-engine/forge/math';

const ray = { origin: cameraPosition, direction: pointerDirection };
const distance = Rays.intersectPlane(ray, { normal: Vec3.up, constant: 0 });

if (distance !== null) {
  const pointOnGround = Rays.at(Vec3.zero, ray, distance);
}
```

A ray that starts inside a sphere or box hits the point where it leaves
it. A ray parallel to a plane or triangle, or one whose shape is entirely
behind its origin, returns `null`. A triangle's front face is the side from
which its corners are in counter-clockwise order; with `cullBackFaces` set
to `true`, a ray that meets the back face misses.

To test a ray against a shape in an object's local space, transform the
ray by the inverse of the object's world matrix with
[`Rays.transform(out, ray, matrix)`](/Forge/docs/api/classes/Rays#transform).
The transformed ray's direction is unit length again, so its distances are
in local units.

## Building a plane

[`Planes.fromPointAndNormal(out, point, normal)`](/Forge/docs/api/classes/Planes#frompointandnormal)
builds a plane through a point, and
[`Planes.fromPoints(out, a, b, c)`](/Forge/docs/api/classes/Planes#frompoints)
one through three points, facing the side from which they're
counter-clockwise.
[`Planes.signedDistance(plane, point)`](/Forge/docs/api/classes/Planes#signeddistance)
is positive in front of the plane and negative behind it, and
[`Planes.projectPoint(out, plane, point)`](/Forge/docs/api/classes/Planes#projectpoint)
returns the closest point on it:

```ts
import { Planes, Vec3 } from '@forge-game-engine/forge/math';

const ground = Planes.fromPointAndNormal(
  { normal: Vec3.zero, constant: 0 },
  Vec3.zero,
  Vec3.up,
);

Planes.signedDistance(ground, { x: 4, y: 3, z: 0 }); // 3
```

## Building bounds

[`BoundingBoxes.empty()`](/Forge/docs/api/classes/BoundingBoxes#empty)
creates an empty box, which the first point added with
[`expandByPoint`](/Forge/docs/api/classes/BoundingBoxes#expandbypoint) or
box added with [`union`](/Forge/docs/api/classes/BoundingBoxes#union) sets.
[`BoundingBoxes.fromPositions(out, positions, stride, offset)`](/Forge/docs/api/classes/BoundingBoxes#frompositions)
builds the box around a `Float32Array` of vertex positions:

```ts
import {
  BoundingBoxes,
  BoundingSpheres,
  Vec3,
} from '@forge-game-engine/forge/math';

const localBounds = BoundingBoxes.fromPositions(
  BoundingBoxes.empty(),
  positions,
  3,
  0,
);
const localSphere = BoundingSpheres.fromBox(
  { center: Vec3.zero, radius: 0 },
  localBounds,
);
```

[`BoundingSpheres.fromBox`](/Forge/docs/api/classes/BoundingSpheres#frombox)
builds the sphere around a box, and
[`BoundingSpheres.merge`](/Forge/docs/api/classes/BoundingSpheres#merge)
grows a sphere to contain another.

## Moving bounds into world space

[`BoundingBoxes.transform(out, box, matrix)`](/Forge/docs/api/classes/BoundingBoxes#transform)
sets `out` to the smallest axis-aligned box around `box` transformed by a
matrix, such as an object's world matrix.
[`BoundingSpheres.transform(out, sphere, matrix)`](/Forge/docs/api/classes/BoundingSpheres#transform)
moves the center and scales the radius by the matrix's largest scale:

```ts
BoundingBoxes.transform(worldBounds, localBounds, worldMatrix);
BoundingSpheres.transform(worldSphere, localSphere, worldMatrix);
```

## Testing bounds against each other

[`BoundingBoxes.intersects`](/Forge/docs/api/classes/BoundingBoxes#intersects)
and [`BoundingSpheres.intersects`](/Forge/docs/api/classes/BoundingSpheres#intersects)
return whether two boxes or two spheres overlap, and
[`BoundingBoxes.containsPoint`](/Forge/docs/api/classes/BoundingBoxes#containspoint)
whether a point is inside a box. Touching counts as overlapping.

## Culling with a frustum

[`Frustums.fromViewProjection(out, matrix, depthRange)`](/Forge/docs/api/classes/Frustums#fromviewprojection)
extracts a camera's frustum from its view-projection matrix (the projection
times the view matrix, see [Matrices](./matrices.md)), with planes in world
space. Pass the same depth range the projection was built with.
[`Frustums.intersectsSphere`](/Forge/docs/api/classes/Frustums#intersectssphere)
and [`Frustums.intersectsBox`](/Forge/docs/api/classes/Frustums#intersectsbox)
return `false` for bounds entirely outside it:

```ts
import { Frustums, Mat4 } from '@forge-game-engine/forge/math';

const viewProjection = Mat4.multiply(Mat4.clone(projection), view);
const frustum = Frustums.fromViewProjection(
  Frustums.create(),
  viewProjection,
  'negativeOneToOne',
);

if (Frustums.intersectsSphere(frustum, worldSphere)) {
  // draw the object
}
```

The tests can return `true` for bounds just outside a corner of the
frustum, so they never cull something visible.
[`Frustums.containsPoint`](/Forge/docs/api/classes/Frustums#containspoint)
tests a single point exactly.

A projection with no far plane
([`Mat4.perspectiveInfinite`](/Forge/docs/api/classes/Mat4#perspectiveinfinite))
gives a far plane that every point is in front of.

## Finding a frustum's corners

[`Frustums.corners(out, inverseMatrix, depthRange)`](/Forge/docs/api/classes/Frustums#corners)
writes the eight corners of the frustum of a view-projection matrix into
an array of eight vectors, given the matrix's inverse: the near plane's
four corners, then the far plane's. The projection needs a far plane.

```ts
const inverse = Mat4.invert(Mat4.create(), viewProjection);

if (inverse !== null) {
  Frustums.corners(corners, inverse, 'negativeOneToOne');
}
```
