---
sidebar_position: 4
---

# Prismatic Joints (Sliders)

A `PrismaticJointEcsComponent`
constrains two entities to move together along a single, straight axis: no
rotation relative to each other, no translation perpendicular to the axis.
Use it for anything that slides along a fixed line relative to something
else: pistons, elevators, drawers, suspension struts, moving platforms with
a fixed travel path.

```ts
import { Vec2 } from '@forge-game-engine/forge/math';
import { addPrismaticJointComponent } from '@forge-game-engine/forge/physics';

// frame and piston are entities with their own PositionEcsComponent,
// RotationEcsComponent, ColliderEcsComponent, and RigidBodyEcsComponent
// (frame has no RigidBodyEcsComponent, so it's treated as static), created
// the same way as in Bodies and Shapes.
const jointEntity = world.createEntity();

addPrismaticJointComponent(world, jointEntity, {
  entityA: frame,
  entityB: piston,
  axis: Vec2.up,
  enableLimit: true,
  lowerTranslation: 0,
  upperTranslation: 120,
});
```

Once registered (see [ECS integration](#ecs-integration) below), the joint
solves alongside collisions every tick, no further calls needed.

## Choosing an axis and anchors

`axis` lives in `entityA`'s local space and rotates with it, this is what
makes a joint on a rotating turret still slide in the turret's "forward"
direction as it turns. `localAnchorA`/`localAnchorB` default to each
entity's own origin; offset them when the sliding line shouldn't pass
through an entity's origin, for example a piston rod attached to the rim of
a rotating wheel rather than its hub. All of these are set once when the
component is attached and can't be changed afterwards, the joint is defined
by its axis and anchors for its whole lifetime.

`referenceAngle`, the relative angle the joint locks the two entities to, is
captured from their actual rotations at the moment `addPrismaticJointComponent`
is called, not fixed separately. If `entityA` and `entityB` start rotated 15
degrees apart, the joint holds them 15 degrees apart, not parallel. Attach
the joint after positioning both entities, not before - `entityA`/`entityB`
must already have a `RotationEcsComponent` when you call
`addPrismaticJointComponent`.

## Limits

`enableLimit`, `lowerTranslation`, and `upperTranslation` bound the
translation along `axis`: the drawer can't be pulled out further than the
rails allow, the piston can't push past its stroke length. Unlike the old
class-based joints, these are plain component fields, so a mutable limit (a
drawer that locks, a piston that's been extended by a level-up) is just an
assignment on the component `addPrismaticJointComponent` returned, no need
to recreate the joint:

```ts
const joint = addPrismaticJointComponent(world, jointEntity, { ... });

joint.upperTranslation = 200;
```

:::caution
`lowerTranslation`/`upperTranslation` default to `0`. Setting
`enableLimit: true` without also setting both bounds locks the translation
at exactly `0`, which reads as "the joint doesn't move at all" rather than
"unlimited". Leave `enableLimit` unset (or `false`) for a free-sliding
joint, and only set it once you have real bounds to give it.
:::

There's no motor: a prismatic joint doesn't drive translation on its own.
Move a jointed entity by applying an impulse to it (see
[Applying Forces](./forces.md)), or by giving its `RigidBodyEcsComponent` an
initial velocity along `axis`; the joint constrains the resulting motion to
the axis rather than producing it.

## ECS integration

Add a `PrismaticJointEcsComponent` to a dedicated joint entity (not
`entityA` or `entityB` themselves) via `addPrismaticJointComponent`, then
register `createPrismaticJointEcsSystem(time)`:

```ts
import { Vec2 } from '@forge-game-engine/forge/math';
import {
  addPrismaticJointComponent,
  createPrismaticJointEcsSystem,
} from '@forge-game-engine/forge/physics';

const jointEntity = world.createEntity();

addPrismaticJointComponent(world, jointEntity, {
  entityA: frame,
  entityB: piston,
  axis: Vec2.up,
});

// Must run after whatever system resolves collisions
// (createCollisionResolutionEcsSystem) and before whatever system
// integrates velocity into position (createEulerIntegrationEcsSystem).
world.addSystem(createPrismaticJointEcsSystem(time));
```

The joint's own entity doesn't need position/rotation components, a
prismatic joint isn't itself positioned in the world, it only references
`entityA`/`entityB`, which get their own entities (positioned as usual, see
[Bodies and Shapes](./rigid-bodies.md)).

By default each joint solves in a single pass per tick, sufficient for an
isolated joint. If several joints chain through a shared body (for example
a suspension mount, where one joint connects the chassis to an intermediate
"upright" body and another connects that upright to a wheel), pass a higher
`iterations` to converge that chain more accurately:

```ts
world.addSystem(createPrismaticJointEcsSystem(time, { iterations: 8 }));
```

:::caution[Registration order]
`createPrismaticJointEcsSystem` must run after whatever system resolves
contacts (`createCollisionResolutionEcsSystem`), so the joint gets the
"last word" on velocity each tick, and before whatever system integrates
velocity into position (`createEulerIntegrationEcsSystem`).
:::

## A small amount of drift is normal

Like collision resolution, joint solving corrects perpendicular and limit
positional error incrementally rather than snapping it to zero. A jointed
entity may sit a fraction of a unit off its exact axis under constant load
such as gravity, this is expected and generally imperceptible; it is not a
sign the joint is misconfigured.
