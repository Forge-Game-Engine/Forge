---
sidebar_position: 7
---

# Continuous Collision Detection

Collision detection runs once per tick, against where each body is at the
start of that tick. A body that integration then moves further than the gap
to a surface ends the tick deep inside it, or out the other side, before the
next tick's test ever sees the contact. A wheel landing hard after a jump
sinks visibly into the ground; a ball fast enough to cross a thin wall in a
single tick passes straight through it.

`createContinuousCollisionEcsSystem` fixes this for fast dynamic circles
against static colliders. Each tick it sweeps every dynamic body with a
`CircleCollider` along the path integration just moved it, and if that path
would take the circle deep into a static collider, it moves the body back to
where it first touched that collider.

## Registering it

Register it directly after `createEulerIntegrationEcsSystem`. It takes no
arguments:

```ts
import {
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
} from '@forge-game-engine/forge/physics';

// ...transform, gravity, broad phase, narrow phase, collision resolution,
// joints...
world.addSystem(createEulerIntegrationEcsSystem(time));
world.addSystem(createContinuousCollisionEcsSystem());
```

It sweeps the circle's center in a straight line from where this tick's
collision detection saw it (placed by `position.world` and `rotation.world`)
to where integration moved it (placed by `position.local` and
`rotation.local`), so it has to run after integration and before the next
tick's `createTransformEcsSystem`.
See [Bodies and Shapes](./rigid-bodies.md) for the full registration order.

## What it does

- **Which bodies are swept**: `'dynamic'` bodies with a `CircleCollider`
  that isn't a sensor. Kinematic bodies follow the velocity your code gives
  them and aren't stopped.
- **What they're swept against**: static colliders, meaning collider
  entities with no `RigidBodyEcsComponent` or a `'static'` one, of every
  shape (`CircleCollider`, `PolygonCollider` and `TerrainCollider`), as
  long as the two colliders' `category` and `mask` let them collide.
  Sensors are skipped, since nothing is ever resolved against them. Against
  a terrain, the sweep only meets the surface, the same as
  [narrow-phase collision](./terrain.md#how-collision-works).
- **When it steps in**: only when the circle would end the tick more than a
  tenth of its radius inside a surface. Shallower contacts are left to
  collision resolution, which pushes them out within a tick or two. A body
  rolling fast over bumpy ground therefore isn't slowed down at every bend.
- **What it changes**: the body's `local` position, which it moves back so
  the circle's center is at the point of first contact, plus a hundredth of
  the radius into the surface so that the next tick's narrow phase reports
  the contact. Rotation and velocity are left alone: collision resolution handles that contact on the
  next tick (friction, restitution and so on) like any other.

A stopped body covers less ground than its velocity says it should that
tick. This is the trade-off Box2D also makes. Gravity applied this tick still
counts in full.

## Gotchas

:::caution[Teleport before the transform system]
A body moved by writing its `local` position between
`createTransformEcsSystem` and this system looks to the sweep like a fast
move. If a static collider lies between the old and new position, the sweep
stops the body against it. Write teleports before `createTransformEcsSystem`
runs (the Car demo's reset system does this).
:::

- **Polygon bodies aren't swept.** A fast `PolygonCollider` body can still
  sink into, or pass through, thin static geometry. Keep fast polygon bodies
  slow relative to their size, or make walls thicker than the distance the
  body travels in one tick.
- **Moving targets aren't swept against.** Two fast dynamic bodies, or a
  fast body and a kinematic platform, can still pass through each other in a
  single tick.

## Sweeping shapes yourself

The sweeps the system uses are public, for gameplay questions like "will
this projectile hit that wall before the end of the tick?":
`sweepCircleCircle`, `sweepCirclePolygon` and `sweepCircleTerrain`. Each
takes the moving circle's collider (for its radius), the target body, and
the circle's world center at the start and end of the move (see
`CircleCollider.getWorldCenter`), and returns a `SweepHit` (the first contact's
`point`, the target's surface `normal` there, and `t`, how far along the
move it happened, from `0` to `1`) or `null`.

```ts
import { Vec2 } from '@forge-game-engine/forge/math';
import { sweepCirclePolygon } from '@forge-game-engine/forge/physics';

const start = projectileCollider.getWorldCenter(
  projectilePosition,
  projectileRotation,
);
const hit = sweepCirclePolygon(
  projectileCollider,
  { position: wallPosition, rotation: wallRotation, collider: wallCollider },
  start,
  Vec2.add(Vec2.clone(start), plannedMove),
);

if (hit !== null) {
  // Impact after `hit.t` of the move, at `hit.point`.
}
```

A sweep that starts with the circle already touching the target (or, for a
terrain, already touching that stretch of ground) ignores that contact and
returns the next one, if any. Use `detectCollision` or `raycast` to ask about
contacts that already exist.

## Performance

The system only sweeps circles that move more than a tenth of their radius in
a tick, and only against static colliders whose bounding box overlaps the
circle's path. Bodies at rest or moving slowly cost one length check each.
