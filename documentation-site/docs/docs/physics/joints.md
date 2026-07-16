---
sidebar_position: 4
---

# Joints

A joint constrains the distance between an anchor point on one
[`RigidBody`](/Forge/docs/api/classes/RigidBody) and an anchor point on
another. Forge has two kinds:
[`DistanceJoint`](/Forge/docs/api/classes/DistanceJoint) for a rigid
connection, like a rod or rope segment, and
[`SpringJoint`](/Forge/docs/api/classes/SpringJoint) for a soft, damped
connection, like a suspension. Register a joint with
[`PhysicsWorld.addJoint`](/Forge/docs/api/classes/PhysicsWorld#addjoint) the
same way you register a body with `addBody`; it's solved automatically as
part of every [`step`](/Forge/docs/api/classes/PhysicsWorld#step).

## DistanceJoint: rigid connections

A `DistanceJoint` holds its two anchors at a fixed distance, defaulting to
whatever distance separates them when the joint is created. Use it for
anything that should behave like a rigid rod or a taut rope: a wrecking
ball on a swinging arm, a rigid tow bar, or a fixed-length crane cable.

```ts
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  CircleShape,
  DistanceJoint,
  PhysicsWorld,
  RigidBody,
} from '@forge-game-engine/forge/physics';

const physicsWorld = new PhysicsWorld({ gravity: new Vector2(0, -300) });

const anchor = new RigidBody({
  shape: new CircleShape(4),
  position: new Vector2(0, 200),
  isStatic: true,
});
const wreckingBall = new RigidBody({
  shape: new CircleShape(16),
  position: new Vector2(150, 200),
  density: 4,
});

physicsWorld.addBody(anchor);
physicsWorld.addBody(wreckingBall);

// length defaults to 150, the distance between the two bodies above, so the
// ball swings on a rigid 150-unit arm rather than snapping to some other
// length.
physicsWorld.addJoint(
  new DistanceJoint({ bodyA: anchor, bodyB: wreckingBall }),
);
```

## SpringJoint: soft connections

A `SpringJoint` pulls its two anchors toward a rest distance using a damped
spring force rather than a hard constraint, so it compresses and stretches.
Use it for suspension, cloth-like give, or anything that should bounce back
toward a resting shape rather than lock rigidly.

```ts
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  PhysicsWorld,
  PolygonShape,
  RigidBody,
  SpringJoint,
} from '@forge-game-engine/forge/physics';

const physicsWorld = new PhysicsWorld({ gravity: new Vector2(0, -300) });

const ceiling = new RigidBody({
  shape: PolygonShape.rectangle(20, 20),
  position: new Vector2(0, 300),
  isStatic: true,
});
const platform = new RigidBody({
  shape: PolygonShape.rectangle(120, 20),
  position: new Vector2(0, 200),
  density: 2,
});

physicsWorld.addBody(ceiling);
physicsWorld.addBody(platform);
physicsWorld.addJoint(
  new SpringJoint({
    bodyA: ceiling,
    bodyB: platform,
    stiffness: 4_000,
    damping: 200,
  }),
);
```

`stiffness` and `damping` have no built-in defaults; they interact with each
body's mass and your world's scale, so tune them for your scene rather than
copying the values above directly. A good starting point is to raise
`damping` until the platform settles without visibly overshooting, then
raise `stiffness` until it holds its shape under the loads you expect.

## collideConnected

By default (`collideConnected: false`), a joint's two bodies don't generate
collision events or collision response against each other, even while
overlapping. This is deliberate: a joint's bodies are usually meant to sit
adjacent to, or overlap, one another by design (a wheel tucked against a
chassis, a platform touching the ceiling bracket it hangs from), and letting
ordinary collision resolution push them apart every step fights the joint,
which shows up as visible jitter.

Set `collideConnected: true` only if you specifically want the two jointed
bodies to still collide, for example a rope with two endpoints that
shouldn't be allowed to pass through each other.

## Suspension: two joints per wheel

Neither `DistanceJoint` nor `SpringJoint` constrains rotation, only the
distance between two anchor points. That means a wheel's `RigidBody`
connected to a chassis by a single `SpringJoint` already spins completely
freely, there's nothing extra to unlock for rolling. But it also means that
single joint lets the wheel swing in a full arc around its anchor, like a
pendulum, rather than travel straight up and down the way a real suspension
strut does.

For a convincing suspension, connect each wheel to **two** different anchor
points on the chassis: one `SpringJoint` for vertical compliance, plus a
second, stiffer `SpringJoint` (or a `DistanceJoint`) to resist fore-aft
swing. See [Building a Vehicle](./building-a-vehicle.md) for a complete
example combining this with motorized wheels and
[terrain](./terrain.md).

:::caution
If you only need to *lock* a wheel's rotation relative to the chassis (for
example a decorative, non-rolling wheel), neither joint does that either;
both only ever move `position`, never `angle`. That's a much rarer need than
free rotation, and isn't covered by either joint type.
:::
