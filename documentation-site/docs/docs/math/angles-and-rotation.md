---
sidebar_position: 2
---

# Angles and Rotation

Forge represents rotation as **radians** everywhere: `RotationEcsComponent.local`/`world`,
`RigidBody.angle`, [`Vector2.rotate`](/Forge/docs/api/classes/Vector2#rotate),
and [`Matrix3x3.rotate`](/Forge/docs/api/classes/Matrix3x3#rotate) all take
or store radians. The math module provides conversions for the cases where
you need degrees or a direction vector instead.

## Degrees and radians

[`degreesToRadians`](/Forge/docs/api/functions/degreesToRadians) and
[`radiansToDegrees`](/Forge/docs/api/functions/radiansToDegrees) are plain
conversions. Reach for these at the edges of your code, when authoring
content in degrees (level data, a debug slider) or displaying a rotation in
a UI, then work in radians everywhere internally:

```ts
import { degreesToRadians } from '@forge-game-engine/forge/math';

rotation.local = degreesToRadians(45);
```

## Rotating a vector

[`Vector2.rotate(angleInRadians)`](/Forge/docs/api/classes/Vector2#rotate)
returns a new vector rotated by the given angle. Use it to turn a local-space
offset into a world-space offset based on an entity's current rotation, for
example positioning a turret or weapon mount relative to its parent:

```ts
const localOffset = new Vector2(0, -20); // 20px "above" the entity, in local space
const worldOffset = localOffset.rotate(rotation.world);
const turretPosition = position.world.add(worldOffset);
```

## Converting between angles and direction vectors

[`radiansToVector(radians)`](/Forge/docs/api/functions/radiansToVector) and
[`vectorToRadians(vector)`](/Forge/docs/api/functions/vectorToRadians) convert
between an angle and a unit `Vector2`, but they use **different zero
references**:

- `radiansToVector(0)` returns `(0, -1)`, i.e. `Vector2.up`. Angle `0` means
  "facing up the screen", matching how `RotationEcsComponent` represents an
  unrotated entity.
- `vectorToRadians` is a plain `Math.atan2(vector.y, vector.x)`, so
  `vectorToRadians(Vector2.right)` (i.e. `(1, 0)`) returns `0`.

Both conventions increase the angle **clockwise** (a consequence of Forge's
y-down coordinate system), but `radiansToVector` is offset from
`vectorToRadians` by a quarter turn.

:::caution
`radiansToVector` and `vectorToRadians` are **not inverses** of each other:

```ts
const angle = Math.PI / 3;

vectorToRadians(radiansToVector(angle)); // angle - Math.PI / 2, not angle
```

If you need to round-trip a `RotationEcsComponent`-style angle through a
direction vector and back, add `Math.PI / 2` after `vectorToRadians`:

```ts
const direction = radiansToVector(rotation.world);
// ... later, recover the rotation from a direction vector:
rotation.world = vectorToRadians(direction) + Math.PI / 2;
```
:::

### Worked example: facing the movement direction

A common pattern is rotating an entity to face whichever direction it's
moving. `vectorToRadians` gives the angle of the velocity vector using its
own (right-is-zero) convention, so add `Math.PI / 2` to convert it into the
"up-is-zero" convention `RotationEcsComponent` expects:

```ts
import { vectorToRadians } from '@forge-game-engine/forge/math';

const faceVelocitySystem = {
  query: [velocityId, rotationId] as const,
  run(result) {
    const [velocity, rotation] = result.components;

    if (velocity.value.magnitudeSquared() < 0.0001) {
      return;
    }

    rotation.local = vectorToRadians(velocity.value) + Math.PI / 2;
  },
};
```

The early `return` avoids calling `vectorToRadians` on a near-zero velocity,
which would otherwise snap the rotation to an arbitrary angle as the
direction becomes undefined at zero magnitude.
