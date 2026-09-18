---
sidebar_position: 7
---

# Continuous Collision Detection

Ordinary collision detection only checks each entity's position at the
*start* of a tick. A fast-moving `CircleCollider` body - a thrown
projectile, a vehicle's wheel landing hard after a jump - can cover more
distance in a single tick than its own size, so its start-of-tick position
and its end-of-tick position can end up on opposite sides of a thin
obstacle, with nothing in between ever tested. The result is either a clean
miss (the body passes straight through) or a large, already-established
penetration that takes several ticks of solver correction to dig back out
of.

`createContinuousCollisionEcsSystem` closes that gap for dynamic
`CircleCollider` bodies moving against static geometry (`PolygonCollider`,
`TerrainCollider`, or another `CircleCollider`): it sweeps the body's actual
this-tick translation and, if that sweep would cross into a static body,
clamps the translation to stop it at the surface instead.

```ts
import {
  addAabbComponent,
  addColliderComponent,
  addRigidBodyComponent,
  CircleCollider,
} from '@forge-game-engine/forge/physics';

const projectile = world.createEntity();
const collider = new CircleCollider(6);

addColliderComponent(world, projectile, { collider });
addAabbComponent(world, projectile);
addRigidBodyComponent(world, projectile, {
  mass: collider.mass,
  momentOfInertia: collider.momentOfInertia,
  velocity: { x: 0, y: -4000 },
});
```

No extra opt-in is needed on the entity itself:
`RigidBodyEcsComponent.continuousDetection` defaults to `true` (see
[Bodies and Shapes](./rigid-bodies.md)), so any ordinary fast-moving
dynamic circle is covered automatically once the system is registered.

## Registering the system

Register it after every system that can still change `velocity` this tick
(gravity, springs/dampers, joints, `createCollisionResolutionEcsSystem`)
and immediately before `createEulerIntegrationEcsSystem`, whose
`velocity * deltaTime` translation it overrides for the bodies it clamps:

```ts
import {
  createCollisionResolutionEcsSystem,
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
} from '@forge-game-engine/forge/physics';

world.addSystem(
  createCollisionResolutionEcsSystem(
    collisionManifolds,
    contactConstraints,
    time,
  ),
);
// ...any joint/motor systems...
world.addSystem(createContinuousCollisionEcsSystem(time));
world.addSystem(createEulerIntegrationEcsSystem(time));
```

Registering it earlier means it sweeps a translation that a later system
(a joint, a motor) is still going to change, clamping against a trajectory
the body won't actually end up taking.

## The speed threshold

Sweeping every dynamic circle against every static body on every tick would
cost more than it's worth for the overwhelming majority of ticks, where a
body's ordinary discrete detection is already correct. The system only
sweeps a body once it's moving fast enough, relative to its own size, to
plausibly tunnel:

```ts
translationDistance > continuousDetectionThreshold * collider.radius
```

`continuousDetectionThreshold` defaults to `0.15` and is overridable as the
system's second argument:

```ts
world.addSystem(
  createContinuousCollisionEcsSystem(time, {
    continuousDetectionThreshold: 0.1,
  }),
);
```

Lower it if smaller or slower projectiles in your game still visibly
tunnel; raise it if profiling shows the sweep itself costing more than it's
worth for bodies that were never actually at risk.

## What it does and doesn't cover

- Only the **moving** body needs a `CircleCollider` - the static target can
  be a `CircleCollider`, `PolygonCollider`, or `TerrainCollider` (see
  [Terrain](./terrain.md)).
- A **static target** means any entity whose `RigidBodyEcsComponent.type`
  isn't `'dynamic'`, including a collider entity with no
  `RigidBodyEcsComponent` at all - the same convention the rest of the
  solver already uses.
- Dynamic-vs-dynamic sweeping (two fast circles hitting each other) isn't
  covered - it needs both endpoints of the sweep to move, not just one.
- A fast-moving `PolygonCollider` (a large vehicle chassis, say) isn't
  swept either. Only its circle-shaped parts (wheels) are.

A body a sweep would clamp still ends the tick with a small, ordinary
overlap at the surface - the sweep only stops the tunnel, it doesn't
resolve the contact. The next tick's regular broad/narrow-phase and
`createCollisionResolutionEcsSystem` pick that overlap up and solve it
exactly like any other contact, including warm-starting.

:::caution
Disable continuous detection on an entity you want to be able to move
through geometry at any speed - a fast, deliberately non-solid trigger
volume, for example - by setting `continuousDetection: false` in
`addRigidBodyComponent`'s options. Leaving it enabled on such an entity
will clamp its translation the moment it lines up with a static body's
surface.
:::

## Sweeping a shape yourself

The underlying sweep queries - `sweepCircleCircle`, `sweepCirclePolygon`,
`sweepCircleTerrain` - are public, standalone functions, not just an
implementation detail of the system above. Use them directly for a one-off
"would this fast-moving thing hit that wall if nothing changes?" query,
independent of the simulation loop - a dodge check for AI, or a
gameplay-scripted projectile preview:

```ts
import { sweepCircleTerrain } from '@forge-game-engine/forge/physics';

const hit = sweepCircleTerrain(
  movingCircleBody,
  terrainBody,
  currentPosition,
  candidateNextPosition,
);

if (hit !== null) {
  // hit.point, hit.normal, and hit.t (0..1, how far along the sweep the
  // first contact happens) describe the first surface the shape reaches.
}
```
