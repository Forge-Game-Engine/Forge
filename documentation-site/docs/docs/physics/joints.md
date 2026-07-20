---
sidebar_position: 4
---

# Prismatic Joints (Sliders)

A [`PrismaticJoint`](/Forge/docs/api/classes/PrismaticJoint) constrains two
[`RigidBody`](/Forge/docs/api/classes/RigidBody) instances to move together
along a single, straight axis: no rotation relative to each other, no
translation perpendicular to the axis. Use it for anything that slides along
a fixed line relative to something else: pistons, elevators, drawers,
suspension struts, moving platforms with a fixed travel path.

```ts
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  CircleShape,
  PolygonShape,
  PrismaticJoint,
  RigidBody,
} from '@forge-game-engine/forge/physics';

const frame = new RigidBody({
  shape: PolygonShape.rectangle(40, 200),
  isStatic: true,
});
const piston = new RigidBody({ shape: new CircleShape(20) });

const joint = new PrismaticJoint({
  bodyA: frame,
  bodyB: piston,
  axis: Vector2.up,
  enableLimit: true,
  lowerTranslation: 0,
  upperTranslation: 120,
});

physicsWorld.addJoint(joint);
```

Once registered, `physicsWorld.step` solves the joint alongside collisions
every step, no further calls needed. Read the current slide distance at any
time via [`joint.translation`](/Forge/docs/api/classes/PrismaticJoint#translation).

## Choosing an axis and anchors

`axis` lives in `bodyA`'s local space and rotates with it, this is what
makes a joint on a rotating turret still slide in the turret's "forward"
direction as it turns. `anchorA`/`anchorB` default to each body's center of
mass; offset them when the sliding line shouldn't pass through a body's
center, for example a piston rod attached to the rim of a rotating wheel
rather than its hub. All of these are set once at construction and can't be
changed afterwards, the joint is defined by its axis and anchors for its
whole lifetime.

`referenceAngle`, the relative angle the joint locks the bodies to, is
captured from the bodies' actual angles at construction time, not fixed
separately. If `bodyA` and `bodyB` start rotated 15 degrees apart, the joint
holds them 15 degrees apart, not parallel. Construct the joint after
positioning both bodies, not before.

## Limits

`enableLimit`, `lowerTranslation`, and `upperTranslation` bound
`translation`, the drawer can't be pulled out further than the rails allow,
the piston can't push past its stroke length. `lowerTranslation` and
`upperTranslation` are ordinary properties, not read-only, so a mutable
limit (a drawer that locks, a piston that's been extended by a level-up) is
just an assignment, no need to recreate the joint:

```ts
joint.upperTranslation = 200;
```

:::caution
`lowerTranslation`/`upperTranslation` default to `0`. Setting
`enableLimit: true` without also setting both bounds locks `translation` at
exactly `0`, which reads as "the joint doesn't move at all" rather than
"unlimited". Leave `enableLimit` unset (or `false`) for a free-sliding
joint, and only set it once you have real bounds to give it.
:::

There's no motor: `PrismaticJoint` doesn't drive translation on its own.
Move a jointed body by applying an impulse to it (see
[Applying Forces](./forces.md)), or by giving it an initial velocity along
`axis`; the joint constrains the resulting motion to the axis rather than
producing it.

## ECS integration

Add a [`PrismaticJointEcsComponent`](/Forge/docs/api/interfaces/PrismaticJointEcsComponent),
keyed by [`PrismaticJointId`](/Forge/docs/api/variables/PrismaticJointId),
to an entity via `addPrismaticJointComponent`, then register
`createPrismaticJointEcsSystem(physicsWorld)`:

```ts
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addPrismaticJointComponent,
  createPhysicsSyncEcsSystem,
  createPrismaticJointEcsSystem,
  PrismaticJoint,
  PhysicsWorld,
} from '@forge-game-engine/forge/physics';

const physicsWorld = new PhysicsWorld();
const jointEntity = world.createEntity();

// frame and piston are the RigidBody instances backing their own entities'
// PhysicsBodyEcsComponent, created the same way as in Bodies and Shapes.
addPrismaticJointComponent(world, jointEntity, {
  joint: new PrismaticJoint({ bodyA: frame, bodyB: piston, axis: Vector2.up }),
});

// Registered before createPhysicsSyncEcsSystem, see the caution below.
world.addSystem(createPrismaticJointEcsSystem(physicsWorld));
world.addSystem(createPhysicsSyncEcsSystem(physicsWorld, time));
```

The joint's own entity doesn't need position/rotation components, a
`PrismaticJoint` isn't itself positioned in the world, it only references
`bodyA`/`bodyB`, which get their own entities (with their own
`PhysicsBodyEcsComponent`, positioned as usual, see
[Bodies and Shapes](./rigid-bodies.md)).

:::caution[Registration order]
`createPrismaticJointEcsSystem` must run before `createPhysicsSyncEcsSystem` in
the same tick, since `createPhysicsSyncEcsSystem` is what steps `physicsWorld`.
Registering it after means a joint added this tick isn't solved until the
next one. `EcsWorld.update` runs systems in the order they were added to
`addSystem` (ties broken by `registrationOrder`), so either add the joint
system first, as above, or pass it an earlier `registrationOrder`
(`SystemRegistrationOrder.early`) if your setup order can't be changed.
:::

## A small amount of drift is normal

Like collision resolution (see the caching note in
[Bodies and Shapes](./rigid-bodies.md#performance-cached-bounding-boxes-and-world-space-geometry)),
joint solving corrects perpendicular and limit positional error
incrementally rather than snapping it to zero, and leaves errors under a
small slop threshold uncorrected entirely (the same tradeoff
`resolveCollision` makes with penetration depth, to avoid a corrective
jitter loop). A jointed body may sit a fraction of a unit off its exact axis
under constant load such as gravity, this is expected and generally
imperceptible; it is not a sign the joint is misconfigured.
