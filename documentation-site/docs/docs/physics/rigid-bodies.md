---
sidebar_position: 1
---

# Bodies and Shapes

A simulated body is an entity with a `ColliderEcsComponent` (a shape) plus,
for anything that isn't static, a `RigidBodyEcsComponent` (mass, velocity,
and how it participates in the simulation). Both sit alongside the entity's
`PositionEcsComponent`/`RotationEcsComponent` and an `AabbEcsComponent` used
for broad-phase culling. This page covers the choices that aren't obvious
from the component options: which collider shape to use, static vs.
kinematic vs. dynamic bodies, and how to wire up the systems that actually
simulate them.

```ts
import { addPositionComponent, addRotationComponent } from '@forge-game-engine/forge/common';
import {
  addAabbComponent,
  addColliderComponent,
  addRigidBodyComponent,
  CircleCollider,
} from '@forge-game-engine/forge/physics';
import { Vec2 } from '@forge-game-engine/forge/math';

const ball = world.createEntity();
const collider = new CircleCollider(16);

addPositionComponent(world, ball, { world: { x: 0, y: 100 } });
addRotationComponent(world, ball);
addColliderComponent(world, ball, {
  collider,
  restitution: 0.6,
  friction: 0.4,
});
addAabbComponent(world, ball);
addRigidBodyComponent(world, ball, {
  mass: collider.mass,
  momentOfInertia: collider.momentOfInertia,
});
```

## Choosing a shape

Use `CircleCollider` for anything round. Its area, bounding radius, and
moment of inertia are all closed-form, and circle-circle/circle-polygon
collision checks are the cheapest narrow-phase tests in the engine.

Use `PolygonCollider` for everything else, including straight-edged shapes
built from raw vertices (see `_spawn-shapes.ts`'s `rectangleVertices` in the
[Physics demo](/Forge/demos/physics) for a boxes-and-triangles example). For
non-convex ground built from a heightmap, use `TerrainCollider` instead - see
[Terrain](./terrain.md).

:::caution
`PolygonCollider` requires at least 3 vertices forming a **convex** polygon,
and throws otherwise. If you need a concave shape, such as an L-shape,
decompose it into multiple convex `PolygonCollider`s on separate entities
rather than trying to pass the concave outline directly.
:::

A collider's `mass`/`momentOfInertia` are computed from its shape (and, for
`CircleCollider`, an optional `density`) - pass them straight into
`addRigidBodyComponent` as shown above, rather than picking mass values by
hand.

## Static, kinematic, and dynamic bodies

`RigidBodyEcsComponent.type` (`'dynamic'`, `'kinematic'`, or `'static'`,
defaulting to `'dynamic'`) controls how a body participates in the
simulation:

- **Dynamic** (the default): gravity (via `GravityEcsComponent`), impulses,
  and collisions all affect it, and `createEulerIntegrationEcsSystem`
  integrates its `velocity`/`angularVelocity` into position/rotation every
  tick. Use this for anything that should move and react physically, such
  as crates, characters, and projectiles.
- **Static**: infinite effective mass, never affected by anything, never
  integrated. The simplest way to make a body static is to give its entity
  a `ColliderEcsComponent` (plus `PositionEcsComponent`/
  `RotationEcsComponent`/`AabbEcsComponent`) and **no**
  `RigidBodyEcsComponent` at all - every static entity in the physics demos
  (floors, walls, `TerrainCollider` ground) follows this convention, and it
  still applies unchanged. Attaching a `RigidBodyEcsComponent` with
  `type: 'static'` behaves identically; only do so when something else on
  the entity (a motor, a joint) requires the component to be present.
- **Kinematic**: driven directly by your own code, most commonly by setting
  `velocity` (and letting `createEulerIntegrationEcsSystem` move it) or by
  writing to `PositionEcsComponent`/`RotationEcsComponent` yourself. Like a
  static body, it's never affected by gravity, forces, or collision/joint
  impulses (its effective mass is infinite to the solver), but unlike a
  static body it's still integrated every tick and its velocity still shows
  up in contact/joint solving, so it correctly pushes any dynamic body it
  touches. Use this for moving platforms and other scripted movers that
  dynamic bodies should react to.

```ts
import { addRigidBodyComponent } from '@forge-game-engine/forge/physics';

// A moving platform: velocity is set once (or updated by your own game
// code), and createEulerIntegrationEcsSystem moves it every tick from
// there. Dynamic bodies standing on it get carried along and pushed by it,
// but nothing (gravity included) ever changes the platform's own velocity.
addRigidBodyComponent(world, platformEntity, {
  mass: platformCollider.mass,
  momentOfInertia: platformCollider.momentOfInertia,
  type: 'kinematic',
  velocity: { x: 40, y: 0 },
});
```

:::caution
A `'kinematic'` body still needs `mass`/`momentOfInertia` values to satisfy
`RigidBodyEcsComponent`'s required options, even though they're never used
by the solver (its effective mass is always treated as infinite). Pass its
collider's `mass`/`momentOfInertia` the same as for a dynamic body.
:::

## ECS integration

There's no single "physics world" object to step - each concern is its own
system, registered on the `EcsWorld` alongside your other systems. A typical
setup (see the [Physics demo](/Forge/demos/physics)'s `_create-game.ts` for
the full, working version):

```ts
import { Time } from '@forge-game-engine/forge/common';
import {
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
} from '@forge-game-engine/forge/physics';

const collisionPairs: CollisionPair[] = [];
const collisionManifolds: CollisionManifold[] = [];
const contactConstraints: ContactConstraint[] = [];

// Order matters: gravity/forces before collision resolution, before
// integration, so each tick's forces are reflected in that same tick's
// position update.
world.addSystem(createGravityEcsSystem(time));
world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
world.addSystem(createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds));
world.addSystem(
  createCollisionResolutionEcsSystem(collisionManifolds, contactConstraints, time),
);
world.addSystem(createEulerIntegrationEcsSystem(time));
```

Add joint (`createRevoluteJointEcsSystem`/`createPrismaticJointEcsSystem`)
and force-generator (`createLinearSpringEcsSystem`/
`createLinearDamperEcsSystem`) systems the same way; see
[Applying Forces](./forces.md), [Prismatic Joints](./joints.md), and
[Revolute Joints](./revolute-joints.md) for their registration order
relative to the systems above.

## Mapping collisions back to entities

Because everything is ECS-native, there's no separate body object or
`userData` mapping to bridge: `collisionManifolds` (populated by
`createNarrowPhaseEcsSystem`) already holds the raw `entityA`/`entityB`
entity ids for every confirmed collision each tick.

```ts
for (const manifold of collisionManifolds) {
  // check tags/components on manifold.entityA and manifold.entityB to
  // award a pickup, apply damage, play a sound, etc.
}
```

Read `collisionManifolds` after `createCollisionResolutionEcsSystem` has run
(later in the same tick, or at the start of the next one) if you need it to
reflect this tick's resolved contacts; the array is cleared and refilled by
`createNarrowPhaseEcsSystem` every tick, so hold onto anything you need
before that system runs again.
