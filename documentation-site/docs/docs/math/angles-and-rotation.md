---
sidebar_position: 2
---

# Angles and Rotation

Forge represents rotation as **radians** everywhere: `RotationEcsComponent.local`/`world`,
`RigidBody.angle`, [`Vec2.rotate`](/Forge/docs/api/classes/Vec2#rotate),
[`Matrix3x3.rotate`](/Forge/docs/api/classes/Matrix3x3#rotate) and particle
emitter ranges all take or store radians. The math module provides
conversions for the cases where you need degrees or a direction vector
instead.

## The convention

Every angle in Forge follows one rule: **angles are radians, a positive
angle turns `+X` towards `+Y`, and angle `0` points along `+X`.** The world
is Y-up, so a positive angle turns counter-clockwise on screen, and
`Math.PI / 2` points up.

## Degrees and radians

[`degreesToRadians`](/Forge/docs/api/functions/degreesToRadians) and
[`radiansToDegrees`](/Forge/docs/api/functions/radiansToDegrees) are plain
conversions. Reach for these at the edges of your code, when authoring
content in degrees (level data, a debug slider) or displaying a rotation in
a UI, then work in radians everywhere internally:

```ts
import { degreesToRadians, Vec2 } from '@forge-game-engine/forge/math';

rotation.local = degreesToRadians(45);
```

## Rotating a vector

[`Vec2.rotate(v, angleInRadians)`](/Forge/docs/api/classes/Vec2#rotate)
rotates `v` in place by the given angle and returns it. Use it to turn a
local-space offset into a world-space offset based on an entity's current
rotation, for example positioning a turret or weapon mount relative to its
parent:

```ts
const localOffset = { x: 0, y: 20 }; // 20 units "above" the entity, in local space
const worldOffset = Vec2.rotate(localOffset, rotation.world);
// Clone before adding: `position.world` is the entity's live position.
const turretPosition = Vec2.add(Vec2.clone(position.world), worldOffset);
```

## Converting between angles and direction vectors

[`radiansToVector(radians)`](/Forge/docs/api/functions/radiansToVector) and
[`vectorToRadians(vector)`](/Forge/docs/api/functions/vectorToRadians) convert
between an angle and a unit `Vector2`, and they're inverses of each other:

- `radiansToVector(angle)` returns `(cos angle, sin angle)`, so
  `radiansToVector(0)` is `Vec2.right` and `radiansToVector(Math.PI / 2)` is
  `Vec2.up`.
- `vectorToRadians(vector)` is `Math.atan2(vector.y, vector.x)`, so
  `vectorToRadians(Vec2.right)` is `0`. It returns an angle in `(-π, π]`.

```ts
const angle = Math.PI / 3;

vectorToRadians(radiansToVector(angle)); // angle
```

## Which way a sprite faces

An unrotated sprite is drawn as its art is, so whichever way the art faces
is the entity's **forward** at rotation `0`. Art that faces `+X` (right)
needs no offset: to face a direction, set
`rotation = vectorToRadians(direction)`, and the entity's forward is
`radiansToVector(rotation.world)`.

Art drawn facing up has forward `Math.PI / 2` instead, so subtract a quarter
turn when facing a direction:

```ts
rotation.local = vectorToRadians(direction) - Math.PI / 2;
```

Drawing art facing right avoids the offset entirely.

### Worked example: facing the movement direction

A common pattern is rotating an entity to face whichever direction it's
moving. With art that faces right, the angle of the velocity is the
rotation:

```ts
import { Vec2, vectorToRadians } from '@forge-game-engine/forge/math';

const faceVelocitySystem = {
  query: [velocityId, rotationId] as const,
  update(world, { components: [velocities, rotations] }) {
    for (let i = 0; i < velocities.length; i++) {
      const velocity = velocities[i];
      const rotation = rotations[i];

      if (Vec2.magnitudeSquared(velocity.value) < 0.0001) {
        continue;
      }

      rotation.local = vectorToRadians(velocity.value);
    }
  },
};
```

The early `continue` avoids calling `vectorToRadians` on a near-zero
velocity, which would otherwise snap the rotation to an arbitrary angle as
the direction becomes undefined at zero magnitude.
