---
sidebar_position: 2
---

# Angles and Rotation

Every angle in Forge is in radians: `RotationEcsComponent`'s `local` and
`world`, [`Vec2.rotate`](/Forge/docs/api/classes/Vec2#rotate),
[`Matrix3x3.rotate`](/Forge/docs/api/classes/Matrix3x3#rotate), the
[quaternion](./quaternions.md) builders and the particle emitter's
direction and rotation ranges. The math module converts angles to and from
degrees and direction vectors.

## The angle convention

Angle `0` points along `+X`, and a positive angle turns `+X` towards `+Y`.
The world is Y-up, so a positive angle turns counter-clockwise on screen,
and `Math.PI / 2` points up.

## The angle convention in 3D

In 3D, a positive angle about an axis turns counter-clockwise when looking
down the axis towards the origin: the right-hand rule. The space is
right-handed with `+Z` towards the viewer, so a positive angle about `Z`
turns `+X` towards `+Y`, the same as the 2D convention. A 2D angle and a 3D
rotation about `Z` by the same angle turn a vector the same way:

```ts
import { Quat, Vec2, Vec3 } from '@forge-game-engine/forge/math';

Vec2.rotate({ x: 1, y: 0 }, Math.PI / 2); // (0, 1)
Vec3.rotate(Vec3.right, Quat.fromAngleZ(Quat.identity, Math.PI / 2)); // (0, 1, 0)
```

3D rotations are stored as quaternions, not angles. See
[Quaternions](./quaternions.md).

## Converting between degrees and radians

[`degreesToRadians`](/Forge/docs/api/functions/degreesToRadians) and
[`radiansToDegrees`](/Forge/docs/api/functions/radiansToDegrees) convert an
angle between the two units. Use them for values authored or displayed in
degrees:

```ts
import { degreesToRadians } from '@forge-game-engine/forge/math';

rotation.local = degreesToRadians(45);
```

## Converting between angles and directions

[`radiansToVector(angle)`](/Forge/docs/api/functions/radiansToVector)
returns the unit vector `(cos angle, sin angle)`, so `radiansToVector(0)` is
`(1, 0)` and `radiansToVector(Math.PI / 2)` is `(0, 1)`.
[`vectorToRadians(vector)`](/Forge/docs/api/functions/vectorToRadians)
returns the angle of a vector, `Math.atan2(vector.y, vector.x)`, from `-π`
to `π`. Each is the inverse of the other:

```ts
import {
  radiansToVector,
  vectorToRadians,
} from '@forge-game-engine/forge/math';

const direction = radiansToVector(rotation.world);
const angle = vectorToRadians(direction); // rotation.world, in -π to π
```

:::note
`vectorToRadians({ x: 0, y: 0 })` returns `0`. A zero vector has no
direction, so check a vector's length before turning it into an angle.
:::

## Rotating a vector

[`Vec2.rotate(vector, angle)`](/Forge/docs/api/classes/Vec2#rotate) rotates
`vector` by `angle`, changing it in place, and returns it. Rotating an
offset by an entity's `rotation.world` turns it from the entity's frame into
the world's:

```ts
import { Vec2 } from '@forge-game-engine/forge/math';

const offset = Vec2.rotate({ x: 0, y: 20 }, rotation.world);
const pointInWorld = Vec2.add(Vec2.clone(position.world), offset);
```

## Facing a direction

A sprite at rotation `0` is drawn as its image is, so the direction the
image faces is the entity's forward direction. For an image that faces
`+X` (right), the rotation that faces a direction is the angle of that
direction, and the entity's forward direction is
`radiansToVector(rotation.world)`:

```ts
rotation.local = vectorToRadians(direction);
```

For an image that faces up, subtract a quarter turn:

```ts
rotation.local = vectorToRadians(direction) - Math.PI / 2;
```
