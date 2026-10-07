---
sidebar_position: 7
---

# Continuous Collision Detection

The narrow phase tests each body where it is at the start of a tick. A body
that `createEulerIntegrationEcsSystem` then moves further than the gap to a
surface ends the tick deep inside that surface, or past it, before any
collision is detected.
[`createContinuousCollisionEcsSystem`](/Forge/docs/api/functions/createContinuousCollisionEcsSystem)
moves a fast dynamic circle that would sink deep into a static collider
back to the point where it first touches that collider.

## Registering the system

Register `createContinuousCollisionEcsSystem` directly after
`createEulerIntegrationEcsSystem`. It takes no arguments:

```ts
import {
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
} from '@forge-game-engine/forge/physics';

world.addSystem(createEulerIntegrationEcsSystem(time));
world.addSystem(createContinuousCollisionEcsSystem());
```

The system sweeps each circle in a straight line from its position at the
start of the tick (from `position.world` and `rotation.world`) to the
position integration moved it to (from `position.local` and
`rotation.local`). It must run after integration and before the next
tick's `createTransformEcsSystem`. See
[Registering the physics systems](./index.md#registering-the-physics-systems)
for the full order.

:::caution
A body teleported by writing its `local` position after
`createTransformEcsSystem` has run is swept from its old position to its new
one, and is stopped at any static collider in between. Write teleports in a
system registered before `createTransformEcsSystem`.
:::

## Which bodies are swept

- **Swept bodies**: dynamic bodies with a `CircleCollider` that isn't a
  sensor.
- **Targets**: static colliders (entities with no `RigidBodyEcsComponent`,
  or a `'static'` one) of every shape, whose bounds overlap the circle's
  path and whose category and mask let the two collide. Sensors aren't
  targets. Against a `TerrainCollider`, the sweep only meets the surface,
  as [terrain collision](./terrain.md#colliding-with-terrain) does.
- **When it stops a body**: when the circle would end the tick more than a
  tenth of its radius inside a target. Collision resolution pushes out
  shallower contacts. A circle that moves less than a tenth of its radius
  in a tick isn't swept.
- **What it changes**: the body's `local` position, so that the circle's
  center is where it first touches the target, a hundredth of its radius
  inside the surface. The next tick's narrow phase detects that contact,
  and collision resolution handles it like any other. The body's rotation
  and velocity aren't changed, so a stopped body moves less than its
  velocity says it does in that tick.

:::caution
Polygon bodies aren't swept, so a fast `PolygonCollider` body can still
pass into or through thin static geometry. Dynamic and kinematic bodies
aren't targets, so two fast bodies, or a fast body and a kinematic one, can
still pass through each other within one tick.
:::

## Sweeping a circle yourself

[`sweepCircleCircle`](/Forge/docs/api/functions/sweepCircleCircle),
[`sweepCirclePolygon`](/Forge/docs/api/functions/sweepCirclePolygon) and
[`sweepCircleTerrain`](/Forge/docs/api/functions/sweepCircleTerrain) find
where a circle moving in a straight line first touches a target collider.
Each takes the moving `CircleCollider`, the target's position, rotation and
collider, and the circle's world-space center at the start and end of the
movement (see `CircleCollider.getWorldCenter`). It returns a
[`SweepHit`](/Forge/docs/api/interfaces/SweepHit), or `null` if the circle
doesn't touch the target:

```ts
import { Vec2 } from '@forge-game-engine/forge/math';
import { sweepCirclePolygon } from '@forge-game-engine/forge/physics';

const start = circleCollider.getWorldCenter(circlePosition, circleRotation);
const end = Vec2.add(Vec2.clone(start), movement);

const hit = sweepCirclePolygon(
  circleCollider,
  {
    position: targetPosition,
    rotation: targetRotation,
    collider: targetCollider,
  },
  start,
  end,
);

if (hit !== null) {
  const { point, normal, t } = hit;
}
```

`point` is where the circle first touches the target's surface, `normal` is
the target's surface normal there, and `t` is how far along the movement
that happens, from `0` at `start` to `1` at `end`.

A sweep ignores a contact that already exists at `start` and returns the
next one, if any.
[`detectCollision`](/Forge/docs/api/functions/detectCollision) tests two
bodies for a contact that already exists.
