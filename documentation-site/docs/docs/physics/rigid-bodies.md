---
sidebar_position: 1
---

# Bodies and Shapes

A physics body is an entity with a
[`ColliderEcsComponent`](/Forge/docs/api/interfaces/ColliderEcsComponent),
which holds its collision shape, and a `PositionEcsComponent`, which places
it in the world. A body that moves also has a
[`RigidBodyEcsComponent`](/Forge/docs/api/interfaces/RigidBodyEcsComponent),
which holds its velocity and its body type.

## Body types

[`RigidBodyEcsComponent.type`](/Forge/docs/api/type-aliases/RigidBodyType)
is one of three values, `'dynamic'` by default:

- **Dynamic**: moved by gravity, forces, impulses, collisions and joints.
  `createEulerIntegrationEcsSystem` moves it by its `velocity` and
  `angularVelocity` every tick. Use it for anything that moves and reacts
  to other bodies.
- **Kinematic**: moved only by its own `velocity` and `angularVelocity`,
  which game code sets. Gravity, forces, collisions and joints don't change
  them. A dynamic body that touches a kinematic body is pushed by it. Use
  it for moving platforms and other bodies that follow a scripted path.
- **Static**: never moves. A collider entity with no `RigidBodyEcsComponent`
  is static, and so is one whose `RigidBodyEcsComponent` has
  `type: 'static'`. Use it for floors, walls and other fixed geometry.

## Collider shapes

A [`Collider`](/Forge/docs/api/classes/Collider) is one of four shapes:

- [`CircleCollider`](/Forge/docs/api/classes/CircleCollider): a radius
  around a center point.
- [`PolygonCollider`](/Forge/docs/api/classes/PolygonCollider): a convex
  polygon with at least 3 vertices, in either winding order.
- [`TerrainCollider`](/Forge/docs/api/classes/TerrainCollider): ground
  built from a heightmap. See [Terrain](./terrain.md).
- [`ChainCollider`](/Forge/docs/api/classes/ChainCollider): closed loops of
  edges around solid and holes, for level geometry. See
  [Chain Colliders](./chain-colliders.md).

`TerrainCollider` and `ChainCollider` are for static and kinematic bodies
only. A `'dynamic'` body with one throws when it is simulated.

:::caution
The `PolygonCollider` constructor throws if its vertices don't form a
convex polygon. Build a concave shape, such as an L shape, from several
convex `PolygonCollider`s on separate entities, connected with
[joints](./joints.md) if they move. Use a `ChainCollider` for concave
static geometry.
:::

## Creating a body

Add a position, a rotation, a collider and a rigid body to an entity:

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

const ball = world.createEntity();

addPositionComponent(world, ball, { local: { x: 0, y: -100 } });
addRotationComponent(world, ball);
addColliderComponent(world, ball, { collider: new CircleCollider(16) });
addRigidBodyComponent(world, ball);
```

`createEulerIntegrationEcsSystem` only moves entities that have a
`RotationEcsComponent`, so a dynamic or kinematic body needs one. A static
body without a `RotationEcsComponent` is unrotated.

A dynamic or kinematic body must be a root entity: its velocity is in world
space, so `createEulerIntegrationEcsSystem` throws for one with a parent.
Connect bodies with [joints](./joints.md) or
[springs](./forces.md#springs-and-dampers) instead.

[Registering the physics systems](./index.md#registering-the-physics-systems)
lists the systems that simulate bodies, in order.

## Placing a shape on its entity

A collider's shape is in its entity's local space. The entity's world
position and rotation place it in the world. A `PolygonCollider`'s vertices
are used as given, so a shape drawn around a sprite's pivot lines up with
the sprite. A `CircleCollider` takes an optional `center` as its third
argument, a local position that turns with the entity:

```ts
import {
  CircleCollider,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';

// A right triangle around its entity's origin.
const triangle = new PolygonCollider([
  { x: -16, y: -16 },
  { x: -16, y: 16 },
  { x: 16, y: 16 },
]);

// A circle of radius 8, centered 20 units along the entity's local +X.
const offsetCircle = new CircleCollider(8, 1, { x: 20, y: 0 });
```

## Mass and center of mass

A dynamic body's mass, moment of inertia and center of mass come from its
collider: the mass is the shape's area times its `density` (the
constructor's second argument, `1` by default), and the center of mass is
the shape's centroid. `RigidBodyEcsComponent` has no mass fields. To change
how heavy a body is, change its collider's density. A dynamic body without
a `ColliderEcsComponent` throws when it is simulated.

A dynamic body turns about its center of mass, and its `velocity` is the
velocity of its center of mass. A shape that isn't centered on its
entity's origin moves that origin around the centroid as the body turns.
Kinematic and static bodies turn about their entity's origin.

To give a dynamic body mass without letting it collide with anything, give
its collider a `mask` of `0` (see
[Filtering which colliders collide](./collisions.md#filtering-which-colliders-collide)):

```ts
addColliderComponent(world, entity, {
  collider: new CircleCollider(4),
  mask: 0,
});
addRigidBodyComponent(world, entity);
```

## Locking a body's rotation

Set `fixedRotation` on a dynamic body that physics mustn't turn, for
example a character's body:

```ts
import { addRigidBodyComponent } from '@forge-game-engine/forge/physics';

addRigidBodyComponent(world, character, { fixedRotation: true });
```

Collisions, joints, motors and torques still move a fixed-rotation body,
but don't change its `angularVelocity`: it has an inverse moment of inertia
of `0`, so a contact off its center of mass only pushes it. An
`angularVelocity` or rotation that game code sets still applies. To lock a
body that's already turning, set its `angularVelocity` to `0` when you set
`fixedRotation`.

## Moving a body

Set a body's `velocity` and `angularVelocity`, and
`createEulerIntegrationEcsSystem` moves it by them every tick:

```ts
import { addRigidBodyComponent } from '@forge-game-engine/forge/physics';

addRigidBodyComponent(world, platform, {
  type: 'kinematic',
  velocity: { x: 40, y: 0 },
});
```

A kinematic body keeps the velocity game code gives it. A dynamic body's
velocity also changes with gravity, forces and collisions (see
[Applying Forces](./forces.md)).

To place a body at a new position (a teleport), write its `local`
position and rotation, as for any entity (see
[Transforms](../common/transforms.md)). Physics systems read the `world`
values, which `createTransformEcsSystem` writes from `local`.

:::caution
Write a teleport in a system that runs before `createTransformEcsSystem`.
[Continuous collision detection](./continuous-collision-detection.md)
treats a change to `local` made after it as movement, and stops a dynamic
circle at any static collider between the old and new positions.
:::

Writing a sleeping body's velocity or `local` pose wakes it (see
[Sleeping Bodies](./sleeping.md)).

## Sleep state

A `RigidBodyEcsComponent` also holds a body's sleep state, which
[`createSleepEcsSystem`](/Forge/docs/api/functions/createSleepEcsSystem)
uses:

- `canSleep` (`true` by default): whether the body may fall asleep.
- `isSleeping`: whether the body is asleep. Pass `isSleeping: true` to
  `addRigidBodyComponent` to create a dynamic body asleep.
- `wakeRequested`: set to `true` to wake the body.
- `restTime` and `sleepRecord`: how long the body has been resting, and
  what it recorded when the body fell asleep (its pose, contacts, collider
  and gravity, and what it rests on). Only the sleep system writes
  them.

[Sleeping Bodies](./sleeping.md) describes each of them.

## Removing a body

Remove the body's entity with `world.removeEntity`. Removing only its
`RigidBodyEcsComponent` makes it static.
