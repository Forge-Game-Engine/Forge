---
sidebar_position: 5
---

# Revolute Joints (Hinges)

A [`RevoluteJoint`](/Forge/docs/api/classes/RevoluteJoint) pins two
[`RigidBody`](/Forge/docs/api/classes/RigidBody) instances together at a
shared anchor point: both linear degrees of freedom are locked, but the
bodies remain free to rotate about that point relative to each other. Use it
for anything that swings around a fixed pivot: doors, pendulums, wheels,
and other hinging mechanisms.

```ts
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  CircleShape,
  RevoluteJoint,
  RigidBody,
} from '@forge-game-engine/forge/physics';

const hinge = new RigidBody({ shape: new CircleShape(4), isStatic: true });
const door = new RigidBody({
  shape: new CircleShape(20),
  position: new Vector2(60, 0),
});

const joint = new RevoluteJoint({
  bodyA: hinge,
  bodyB: door,
  anchorB: new Vector2(-60, 0),
  enableLimit: true,
  lowerAngle: 0,
  upperAngle: Math.PI / 2,
});

physicsWorld.addJoint(joint);
```

Once registered, `physicsWorld.step` solves the joint alongside collisions
every step, no further calls needed. Read the current rotation at any time
via [`joint.angle`](/Forge/docs/api/classes/RevoluteJoint#angle), or the
current world-space pivot via
[`joint.anchor`](/Forge/docs/api/classes/RevoluteJoint#anchor).

## Choosing anchors

`anchorA`/`anchorB` default to each body's center of mass; this is what a
wheel hinged directly to its hub wants, translation is locked and the
wheel's own center becomes the pivot. Offset `anchorB` (as in the door
example above) when the pivot shouldn't pass through a body's center, for
example a door hinged along one edge rather than through its middle, or a
pendulum bob hanging from the end of an arm. Both anchors are set once at
construction and can't be changed afterwards, the joint is defined by its
anchors for its whole lifetime.

`referenceAngle`, the zero point `angle` is measured from, is captured from
the bodies' actual angles at construction time. If `bodyA` and `bodyB` start
rotated 15 degrees apart, `angle` reads `0` at that relative orientation, not
at parallel. Construct the joint after positioning both bodies at whatever
relative angle should count as "closed" or "at rest", not before.

## Limits

`enableLimit`, `lowerAngle`, and `upperAngle` bound `angle`: a door can't
swing past vertical, a robot arm's elbow can't bend past straight.
`lowerAngle`/`upperAngle` are ordinary properties, not read-only, so a
mutable limit (a door unlocked further, a joint that stiffens after taking
damage) is just an assignment, no need to recreate the joint:

```ts
joint.upperAngle = Math.PI;
```

:::caution
`lowerAngle`/`upperAngle` default to `0`. Setting `enableLimit: true` without
also setting both bounds locks `angle` at exactly `0`, which reads as "the
joint can't rotate at all" rather than "unlimited". Leave `enableLimit`
unset (or `false`) for a wheel, pendulum, or anything else that should spin
or swing without bound, and only set it once you have real bounds to give
it.
:::

There's no motor built into the joint itself: `RevoluteJoint` doesn't drive
rotation on its own. Spin a jointed body by applying an impulse to it away
from the anchor, by giving it an initial `angularVelocity`, or, for a
controlled or continuous spin, by driving the body's `angularVelocity`
directly with `RigidBody.applyTorque` or an `AngularVelocityMotorEcsComponent`
(see [Applying Forces](./forces.md#torque-spinning-a-body)); the joint
constrains the resulting motion to rotation about the anchor rather than
producing it. A wheel given a one-time `angularVelocity` at creation keeps
spinning indefinitely on its own, since nothing in the joint resists
rotation unless a limit is enabled.

## ECS integration

Add a
[`RevoluteJointEcsComponent`](/Forge/docs/api/interfaces/RevoluteJointEcsComponent),
keyed by [`RevoluteJointId`](/Forge/docs/api/variables/RevoluteJointId), to
an entity via `addRevoluteJointComponent`, then register
`createRevoluteJointEcsSystem(physicsWorld)`:

```ts
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addRevoluteJointComponent,
  createPhysicsSyncEcsSystem,
  createRevoluteJointEcsSystem,
  RevoluteJoint,
  PhysicsWorld,
} from '@forge-game-engine/forge/physics';

const physicsWorld = new PhysicsWorld();
const jointEntity = world.createEntity();

// hinge and door are the RigidBody instances backing their own entities'
// PhysicsBodyEcsComponent, created the same way as in Bodies and Shapes.
addRevoluteJointComponent(world, jointEntity, {
  joint: new RevoluteJoint({
    bodyA: hinge,
    bodyB: door,
    anchorB: new Vector2(-60, 0),
  }),
});

// Registered before createPhysicsSyncEcsSystem, see the caution below.
world.addSystem(createRevoluteJointEcsSystem(physicsWorld));
world.addSystem(createPhysicsSyncEcsSystem(physicsWorld, time));
```

The joint's own entity doesn't need position/rotation components, a
`RevoluteJoint` isn't itself positioned in the world, it only references
`bodyA`/`bodyB`, which get their own entities (with their own
`PhysicsBodyEcsComponent`, positioned as usual, see
[Bodies and Shapes](./rigid-bodies.md)).

:::caution[Registration order]
`createRevoluteJointEcsSystem` must run before `createPhysicsSyncEcsSystem` in
the same tick, since `createPhysicsSyncEcsSystem` is what steps `physicsWorld`.
Registering it after means a joint added this tick isn't solved until the
next one. `EcsWorld.update` runs systems in the order they were added to
`addSystem` (ties broken by `registrationOrder`), so either add the joint
system first, as above, or pass it an earlier `registrationOrder`
(`SystemRegistrationOrder.early`) if your setup order can't be changed.
:::

## A small amount of drift is normal

Like [Prismatic Joints (Sliders)](./joints.md#a-small-amount-of-drift-is-normal),
joint solving corrects positional error at the anchor incrementally rather
than snapping it to zero, and leaves errors under a small slop threshold
uncorrected entirely (the same tradeoff `resolveCollision` makes with
penetration depth, to avoid a corrective jitter loop). A jointed body may
sit a fraction of a unit off its exact pivot under constant load such as
gravity, this is expected and generally imperceptible; it is not a sign the
joint is misconfigured.
