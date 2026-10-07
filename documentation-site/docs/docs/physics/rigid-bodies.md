---
sidebar_position: 1
---

# Bodies and Shapes

A simulated body is an entity with a `ColliderEcsComponent` (a shape) plus,
for anything that isn't static, a `RigidBodyEcsComponent` (mass, velocity,
and how it participates in the simulation). Both sit alongside the entity's
`PositionEcsComponent`/`RotationEcsComponent`. `RotationEcsComponent` is
optional for collision detection: a collider entity without one is treated as unrotated, so a
static, axis-aligned wall or trigger volume can leave it off. A dynamic or
kinematic body still needs one, since `createEulerIntegrationEcsSystem` only
integrates entities that have it. This page covers the choices that aren't obvious
from the component options: which collider shape to use, static vs.
kinematic vs. dynamic bodies, and how to wire up the systems that actually
simulate them.

```ts
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import {
  addColliderComponent,
  addRigidBodyComponent,
  CircleCollider,
} from '@forge-game-engine/forge/physics';
import { Vec2 } from '@forge-game-engine/forge/math';

const ball = world.createEntity();
const collider = new CircleCollider(16);

addPositionComponent(world, ball, { local: { x: 0, y: 100 } });
addRotationComponent(world, ball);
addColliderComponent(world, ball, {
  collider,
  restitution: 0.6,
  friction: 0.4,
});
addRigidBodyComponent(world, ball);
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

## Placing a shape on its entity

A collider's shape is in its entity's local space and stays where you
author it: the entity's world position and rotation place it in the world.
A `PolygonCollider`'s vertices are used as given, so a shape drawn around a
sprite's pivot lines up with the sprite. A `CircleCollider` takes an
optional `center` (its third argument), a local position that turns with
the entity like a polygon's vertices:

```ts
import {
  CircleCollider,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';

// A right triangle drawn around its entity's origin, not its centroid.
const ramp = new PolygonCollider([
  { x: -16, y: 16 },
  { x: -16, y: -16 },
  { x: 16, y: -16 },
]);

// A circle of radius 8, 20 units in front of its entity (along local +X).
const bumper = new CircleCollider(8, 1, { x: 20, y: 0 });
```

## Mass and center of mass

A dynamic body's mass, moment of inertia and center of mass come from the
`Collider` in its
`ColliderEcsComponent`: `mass` is the shape's area times its `density` (the
constructors' second argument), `localCenterOfMass` is the shape's centroid
(a circle's `center`), and `momentOfInertia` is measured about that
centroid. `RigidBodyEcsComponent` has no mass fields of its own, and a
dynamic body with no `ColliderEcsComponent` throws when it's simulated.
To change how heavy a body is, change its collider's density.

A dynamic body turns about its center of mass, and its
`RigidBodyEcsComponent.velocity` is the velocity of its center of mass, so
a shape authored off its entity's origin swings that origin around the
centroid as it spins. Kinematic and static bodies turn about their
entity's origin, whatever their shape.

For a dynamic body that needs mass but shouldn't collide with anything
(an invisible part of a jointed assembly, for example), give it a
collider with a `mask` of `0`: it collides with nothing, and the body
still takes its mass from it.

```ts
addColliderComponent(world, wheelMount, {
  collider: new CircleCollider(4),
  mask: 0,
});
addRigidBodyComponent(world, wheelMount);
```

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
  a `ColliderEcsComponent` (plus `PositionEcsComponent`, and a
  `RotationEcsComponent` if it's rotated) and **no**
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
  dynamic bodies should react to. See the
  [Moving Platform demo](/Forge/demos/moving-platform) for a working example.

```ts
import { addRigidBodyComponent } from '@forge-game-engine/forge/physics';

// A moving platform: velocity is set once (or updated by your own game
// code), and createEulerIntegrationEcsSystem moves it every tick from
// there. Dynamic bodies standing on it get carried along and pushed by it,
// but nothing (gravity included) ever changes the platform's own velocity.
addRigidBodyComponent(world, platformEntity, {
  type: 'kinematic',
  velocity: { x: 40, y: 0 },
});
```

## ECS integration

There's no single "physics world" object to step - each concern is its own
system, registered on the `EcsWorld` alongside your other systems. A typical
setup (see the [Physics demo](/Forge/demos/physics)'s `_create-game.ts` for
the full, working version):

```ts
import {
  createTransformEcsSystem,
  Time,
} from '@forge-game-engine/forge/common';
import {
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
} from '@forge-game-engine/forge/physics';

const collisionPairs: CollisionPair[] = [];
const collisionManifolds: CollisionManifold[] = [];
const contactConstraints: ContactConstraint[] = [];

// Order matters: the transform system first, so every system below reads
// this tick's world transforms, then gravity/forces before collision
// resolution, before integration, so each tick's forces are reflected in
// that same tick's position update. Continuous collision detection checks
// integration's result, so it runs right after it.
world.addSystem(createTransformEcsSystem());
world.addSystem(createGravityEcsSystem(time));
world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
world.addSystem(createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds));
world.addSystem(
  createCollisionResolutionEcsSystem(
    collisionManifolds,
    contactConstraints,
    time,
  ),
);
world.addSystem(createEulerIntegrationEcsSystem(time));
world.addSystem(createContinuousCollisionEcsSystem());
```

Add joint (`createRevoluteJointEcsSystem`/`createPrismaticJointEcsSystem`)
and force-generator (`createLinearSpringEcsSystem`/
`createLinearDamperEcsSystem`) systems the same way; see
[Applying Forces](./forces.md), [Prismatic Joints](./joints.md), and
[Revolute Joints](./revolute-joints.md) for their registration order
relative to the systems above.

`createEulerIntegrationEcsSystem` integrates velocity into each body's
`local` position and rotation, and every physics system reads `world`. To
move or teleport a body yourself, write its `local` transform too. A
dynamic or kinematic body must be a root entity (no `ParentEcsComponent`),
since its velocity is in world space; integration throws otherwise. Connect
bodies with joints or springs instead. See
[Transforms](../common/transforms.md).

## Reacting to collisions

To find out what an entity touched, give it a `ContactsEcsComponent` and
read its `touching`, `started` and `ended` lists in your own system. See
[Collisions](./collisions.md), which also covers filtering which colliders
collide and sensor colliders for trigger zones.
