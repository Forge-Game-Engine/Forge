---
sidebar_position: 5
---

# Revolute Joints (Hinges)

A `RevoluteJointEcsComponent`
pins two entities together at a shared anchor point: both linear degrees of
freedom are locked, but the entities remain free to rotate about that point
relative to each other. Use it for anything that swings around a fixed
pivot: doors, pendulums, wheels, and other hinging mechanisms.

```ts
import { Vector2 } from '@forge-game-engine/forge/math';
import { addRevoluteJointComponent } from '@forge-game-engine/forge/physics';

// hinge and door are entities with their own PositionEcsComponent and
// RotationEcsComponent (hinge has no RigidBodyEcsComponent or
// ColliderEcsComponent, so it's treated as a static, non-colliding pivot),
// created the same way as in Bodies and Shapes.
const jointEntity = world.createEntity();

addRevoluteJointComponent(world, jointEntity, {
  entityA: hinge,
  entityB: door,
  localAnchorB: new Vector2(-60, 0),
  enableLimit: true,
  lowerAngle: 0,
  upperAngle: Math.PI / 2,
});
```

Once registered (see [ECS integration](#ecs-integration) below), the joint
solves alongside collisions every tick, no further calls needed.

## Choosing anchors

`localAnchorA`/`localAnchorB` default to each entity's own origin; this is
what a wheel hinged directly to its hub wants, translation is locked and the
wheel's own center becomes the pivot. Offset `localAnchorB` (as in the door
example above) when the pivot shouldn't pass through an entity's origin, for
example a door hinged along one edge rather than through its middle, or a
pendulum bob hanging from the end of an arm. Both anchors are set once when
the component is attached and can't be changed afterwards, the joint is
defined by its anchors for its whole lifetime.

`referenceAngle`, the zero point the relative angle is measured from, is
captured from `entityA`/`entityB`'s actual rotations at the moment
`addRevoluteJointComponent` is called. If they start rotated 15 degrees
apart, the relative angle reads `0` at that relative orientation, not at
parallel. Attach the joint after positioning both entities at whatever
relative angle should count as "closed" or "at rest", not before -
`entityA`/`entityB` must already have a `RotationEcsComponent` when you call
`addRevoluteJointComponent`.

## Limits

`enableLimit`, `lowerAngle`, and `upperAngle` bound the relative angle: a
door can't swing past vertical, a robot arm's elbow can't bend past
straight. Unlike the old class-based joints, these are plain component
fields, so a mutable limit (a door unlocked further, a joint that stiffens
after taking damage) is just an assignment on the component
`addRevoluteJointComponent` returned, no need to recreate the joint:

```ts
const joint = addRevoluteJointComponent(world, jointEntity, { ... });

joint.upperAngle = Math.PI;
```

:::caution
`lowerAngle`/`upperAngle` default to `0`. Setting `enableLimit: true`
without also setting both bounds locks the relative angle at exactly `0`,
which reads as "the joint can't rotate at all" rather than "unlimited".
Leave `enableLimit` unset (or `false`) for a wheel, pendulum, or anything
else that should spin or swing without bound, and only set it once you have
real bounds to give it.
:::

There's no motor built into the joint itself: a revolute joint doesn't
drive rotation on its own. Spin a jointed entity by applying an impulse to
it away from the anchor, by giving its `RigidBodyEcsComponent` an initial
`angularVelocity`, or, for a controlled or continuous spin, by driving
`angularVelocity` directly with `applyTorque` or an
`AngularVelocityMotorEcsComponent` (see
[Applying Forces](./forces.md#torque-spinning-a-body)); the joint
constrains the resulting motion to rotation about the anchor rather than
producing it. A wheel given a one-time `angularVelocity` at creation keeps
spinning indefinitely on its own, since nothing in the joint resists
rotation unless a limit is enabled.

## ECS integration

Add a `RevoluteJointEcsComponent` to a dedicated joint entity (not
`entityA` or `entityB` themselves) via `addRevoluteJointComponent`, then
register `createRevoluteJointEcsSystem(time)`:

```ts
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addRevoluteJointComponent,
  createRevoluteJointEcsSystem,
} from '@forge-game-engine/forge/physics';

const jointEntity = world.createEntity();

addRevoluteJointComponent(world, jointEntity, {
  entityA: hinge,
  entityB: door,
  localAnchorB: new Vector2(-60, 0),
});

// Must run after whatever system resolves collisions
// (createCollisionResolutionEcsSystem) and before whatever system
// integrates velocity into position (createEulerIntegrationEcsSystem).
world.addSystem(createRevoluteJointEcsSystem(time));
```

The joint's own entity doesn't need position/rotation components, a
revolute joint isn't itself positioned in the world, it only references
`entityA`/`entityB`, which get their own entities (positioned as usual, see
[Bodies and Shapes](./rigid-bodies.md)).

By default each joint solves in a single pass per tick, sufficient for an
isolated joint. If several joints chain through a shared body (for example
a suspension mount, where one joint connects the chassis to an intermediate
"upright" body and another connects that upright to a wheel), pass a higher
`iterations` to converge that chain more accurately:

```ts
world.addSystem(createRevoluteJointEcsSystem(time, { iterations: 8 }));
```

:::caution[Registration order]
`createRevoluteJointEcsSystem` must run after whatever system resolves
contacts (`createCollisionResolutionEcsSystem`), so the joint gets the
"last word" on velocity each tick, and before whatever system integrates
velocity into position (`createEulerIntegrationEcsSystem`).
:::

## A small amount of drift is normal

Like [Prismatic Joints (Sliders)](./joints.md#a-small-amount-of-drift-is-normal),
joint solving corrects positional error at the anchor incrementally rather
than snapping it to zero. A jointed entity may sit a fraction of a unit off
its exact pivot under constant load such as gravity, this is expected and
generally imperceptible; it is not a sign the joint is misconfigured.
