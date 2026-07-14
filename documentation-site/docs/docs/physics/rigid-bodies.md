---
sidebar_position: 1
---

# Bodies and Shapes

A [`RigidBody`](/Forge/docs/api/classes/RigidBody) pairs a transform
(position, angle, velocity) with a collision shape. For the full set of
constructor options and properties, see
[`RigidBody`](/Forge/docs/api/classes/RigidBody) and
[`RigidBodyOptions`](/Forge/docs/api/interfaces/RigidBodyOptions) in the API
reference. This page covers the choices that aren't obvious from the options
list: which shape to use, what `isStatic`/`isSensor`/`isKinematic` actually
do, and how to get back from a collision to the ECS entity that caused it.

```ts
import { Vector2 } from '@forge-game-engine/forge/math';
import { CircleShape, RigidBody } from '@forge-game-engine/forge/physics';

const ball = new RigidBody({
  shape: new CircleShape(16),
  position: new Vector2(0, 100),
  restitution: 0.6,
  friction: 0.4,
});
```

## Choosing a shape

Use [`CircleShape`](/Forge/docs/api/classes/CircleShape) for anything round.
Its area, bounding radius, and moment of inertia are all closed-form, and
circle-circle/circle-polygon collision checks are the cheapest narrow-phase
tests in the engine.

Use [`PolygonShape`](/Forge/docs/api/classes/PolygonShape) for everything
else, including the `rectangle(width, height)` static helper for boxes.

:::caution
`PolygonShape` requires at least 3 vertices forming a **convex** polygon, and
throws otherwise. If you need a concave shape, such as an L-shape, decompose
it into multiple convex `PolygonShape`s on separate bodies rather than
trying to pass the concave outline directly.
:::

## Static, dynamic, sensor, and kinematic bodies

Most of the time spent configuring a body goes into deciding how it should
participate in the simulation:

- **Dynamic** (the default): gravity, collisions, and impulses all affect
  it. Use this for anything that should move and react physically, such as
  crates, characters, and projectiles.
- **Static** (`isStatic: true`): infinite mass, never moves. Use this for
  floors, walls, and other immovable geometry. A pair of two static bodies
  never produces collision events, since neither side can move.
- **Sensor** (`isSensor: true`): still participates in collision _detection_
  (and so still raises `collisionStarts`/`collisionEnds`), but produces no
  impulses or positional correction. Use this for trigger volumes, such as
  pickups, checkpoints, and damage zones, where you want to know that
  something overlapped without physically blocking it.
- **Kinematic** (ECS only: `isKinematic: true` on `PhysicsBodyEcsComponent`
  with `isStatic: false`): like static, the entity's position/rotation drive
  the body every frame, but unlike static, it still participates in
  collision detection against non-static bodies. Use this for moving
  platforms or scripted actors whose motion is driven by another system but
  that still need to raise collision events.

:::caution
A sensor that needs to detect overlaps with a static body (for example, a
pressure plate built into a wall) won't work if both bodies are static,
since the pair never generates an event. Make the sensor `isKinematic: true`
instead of `isStatic: true` if its position is externally controlled.
:::

## ECS Integration

Add a `PhysicsBodyEcsComponent`, keyed by
[`PhysicsBodyId`](/Forge/docs/api/variables/PhysicsBodyId), alongside
`PositionEcsComponent` and `RotationEcsComponent`, then register
[`createPhysicsEcsSystem`](/Forge/docs/api/functions/createPhysicsEcsSystem)`(physicsWorld, time)`.
See [`PhysicsBodyEcsComponent`](/Forge/docs/api/interfaces/PhysicsBodyEcsComponent)
for the full component shape.

```ts
import { positionId, rotationId } from '@forge-game-engine/forge/common';
import {
  CircleShape,
  PhysicsBodyId,
  RigidBody,
} from '@forge-game-engine/forge/physics';
import { Vector2 } from '@forge-game-engine/forge/math';

const entity = world.createEntity();

world.addComponent(entity, positionId, {
  world: new Vector2(0, 100),
  local: new Vector2(0, 100),
});
world.addComponent(entity, rotationId, { world: 0, local: 0 });
world.addComponent(entity, PhysicsBodyId, {
  physicsBody: new RigidBody({ shape: new CircleShape(16) }),
});
```

The system registers each body with `physicsWorld` the first time its entity
is queried, removes it when the entity stops matching (or is removed), and
sets `physicsBody.userData` to the entity id, which is how you map
collisions back to entities below.

:::caution[Coordinate spaces]
`RotationEcsComponent.world` is in render space (Y-down), while
`RigidBody.angle` is in physics world space (Y-up). The two are mirrored, so
the angle is negated whenever it crosses between the ECS and the physics
simulation. If you read or write `physicsBody.angle` directly, remember it's
the negation of the entity's render-space rotation, not the same value.
:::

## Mapping collisions back to entities

After each step (handled for you by `createPhysicsEcsSystem`),
[`collisionStarts`/`collisionEnds`](/Forge/docs/api/classes/PhysicsWorld#collisionstarts)
list the body pairs that started or stopped touching. Since
`createPhysicsEcsSystem` sets `body.userData` to the entity id, you can
recover the ECS entities involved:

```ts
for (const { bodyA, bodyB } of physicsWorld.collisionStarts) {
  const entityA = bodyA.userData as number;
  const entityB = bodyB.userData as number;

  // check tags/components on entityA and entityB to award a pickup,
  // apply damage, play a sound, etc.
}
```

## Performance: cached bounding boxes and world-space geometry

`RigidBody.aabb` and `PolygonShape.getWorldVertices`/`getWorldNormals` are
recomputed only when the body's position or angle has changed since the last
call (compared by value, so mutating `position.x` in place still invalidates
the cache correctly). Reading them repeatedly within the same frame, as the
broad- and narrow-phase collision detector does, is essentially free.

:::caution
The cached result is returned by reference, not copied. Treat the value
returned from `aabb`, `getWorldVertices`, and `getWorldNormals` as read-only.
Mutating it in place, for example `body.aabb.origin.x += 1`, corrupts the
cached value for every later call until the body's position or angle next
changes.
:::
