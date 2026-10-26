---
sidebar_position: 7
---

# Continuous Collision Detection

The narrow phase tests each body where it is at the start of a step. A body
that `createEulerIntegrationEcsSystem` then moves further than the gap to a
surface ends the step deep inside that surface, or past it, before any
collision is detected.
[`createContinuousCollisionEcsSystem`](/Forge/docs/api/functions/createContinuousCollisionEcsSystem)
moves a fast dynamic circle that would sink deep into a static collider
back to the point where it first touches that collider.

## Registering the system

Register `createContinuousCollisionEcsSystem` directly after
`createEulerIntegrationEcsSystem`. It takes no arguments, and finds its
targets in the world's broad phase, so the world needs one, created with
`createBroadPhase(world)` and kept up to date by
`createBroadPhaseEcsSystem` earlier in the same step (see
[Creating the broad phase](./broad-phase.md#creating-the-broad-phase)):

```ts
import {
  createBroadPhase,
  createBroadPhaseEcsSystem,
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
} from '@forge-game-engine/forge/physics';

createBroadPhase(world);
world.addSystem(createBroadPhaseEcsSystem(collisionPairs), {
  group: fixedUpdate,
});
// ...
world.addSystem(createEulerIntegrationEcsSystem(time), { group: fixedUpdate });
world.addSystem(createContinuousCollisionEcsSystem(), { group: fixedUpdate });
```

The system throws when the world has no broad phase.

The system sweeps each circle in a straight line from its position at the
start of the step (from `position.world` and `rotation.world`) to the
position integration moved it to (from `position.local` and
`rotation.local`). It must run after integration and before the next
step's `createTransformEcsSystem`, the first system of the fixed-update
group. See
[Registering the physics systems](./index.md#registering-the-physics-systems)
for the full order.

:::caution
A body teleported by writing its `local` position after the fixed-update
group's `createTransformEcsSystem` has run in a step is swept from its old
position to its new one, and is stopped at any static collider in between.
Write teleports in the default group, or in the fixed-update group before
its `createTransformEcsSystem`. The next step's transform system writes the
new position to `world` before any physics system reads it.
:::

## Which bodies are swept

- **Swept bodies**: dynamic bodies with a `CircleCollider` that isn't a
  sensor. A [sleeping body](./sleeping.md) isn't swept, since integration
  doesn't move it. A sleeping body that gets a velocity or is moved before
  the step's integration is integrated and swept like an awake one.
- **Targets**: static colliders (entities with no `RigidBodyEcsComponent`,
  or a `'static'` one) of every shape, whose `aabb` overlaps the box
  around the circle's path and whose category and mask let the two
  collide. The system queries the broad phase's tree of static colliders
  with that box, so its cost depends on the static colliders near the
  path, not on every static collider in the world. Sensors aren't
  targets. Against a `TerrainCollider`, the sweep only meets the surface,
  as [terrain collision](./terrain.md#colliding-with-terrain) does.
  Against a `ChainCollider`, it only meets edges from the side their
  normals face, as [chain collision](./chain-colliders.md#colliding-with-a-chain)
  does, so a fast circle stops at the near side of a thin wall.
- **When it stops a body**: when the circle would end the step more than a
  tenth of its radius inside a target. Collision resolution pushes out
  shallower contacts. A circle that moves less than a tenth of its radius
  in a step isn't swept.
- **What it changes**: the body's `local` position, so that the circle's
  center is where it first touches the target, a hundredth of its radius
  inside the surface. The next step's narrow phase detects that contact,
  and collision resolution handles it like any other. The body's rotation
  and velocity aren't changed, so a stopped body moves less than its
  velocity says it does in that step.

:::caution
Polygon bodies aren't swept, so a fast `PolygonCollider` body can still
pass into or through thin static geometry. Dynamic and kinematic bodies
aren't targets, so two fast bodies, or a fast body and a kinematic one, can
still pass through each other within one step.
:::

:::note
The targets are the colliders that were static when the step's
`createBroadPhaseEcsSystem` ran. A static collider added after that, or a
body changed to `'static'` after that, isn't a target until the broad phase
runs in the next step, just as its `aabb` isn't computed until then. In the
same way, a body changed to `'dynamic'` or `'kinematic'` after that is
still a target for other circles until then.
:::

## Sweeping a circle yourself

[`sweepCircleCircle`](/Forge/docs/api/functions/sweepCircleCircle),
[`sweepCirclePolygon`](/Forge/docs/api/functions/sweepCirclePolygon),
[`sweepCircleTerrain`](/Forge/docs/api/functions/sweepCircleTerrain) and
[`sweepCircleChain`](/Forge/docs/api/functions/sweepCircleChain) find
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
