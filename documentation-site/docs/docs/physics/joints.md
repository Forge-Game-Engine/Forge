---
sidebar_position: 4
---

# Joints

A joint constrains how two bodies, `entityA` and `entityB`, move relative to
each other. A joint is a component on an entity of its own, which
references the two bodies. Every tick, after collision resolution, a joint
system changes the bodies' velocities so they keep to the constraint.

## Joint types

- **Revolute joint (hinge)**: a
  [`RevoluteJointEcsComponent`](/Forge/docs/api/interfaces/RevoluteJointEcsComponent)
  pins an anchor point on each body to the same place. The bodies can turn
  about that point, but not move apart. Use it for doors, pendulums and
  wheels.
- **Prismatic joint (slider)**: a
  [`PrismaticJointEcsComponent`](/Forge/docs/api/interfaces/PrismaticJointEcsComponent)
  lets `entityB` slide relative to `entityA` along one axis, and keeps their
  relative rotation fixed. Use it for pistons, elevators and suspension
  struts.

Both bodies need a `PositionEcsComponent` and a `RotationEcsComponent`. A
body with no `RigidBodyEcsComponent`, or a static or kinematic one, isn't
moved by the joint, so a joint between such a body and a dynamic body fixes
the dynamic body to it.

## Adding a revolute joint

Create an entity for the joint and add a `RevoluteJointEcsComponent` to it
with `addRevoluteJointComponent`:

```ts
import { addRevoluteJointComponent } from '@forge-game-engine/forge/physics';

const joint = world.createEntity();

addRevoluteJointComponent(world, joint, {
  entityA: frame,
  entityB: door,
  localAnchorB: { x: -60, y: 0 },
});
```

`localAnchorA` and `localAnchorB` are the anchor points, in each body's
local space. Each defaults to its body's origin. In this example the door
turns about a point 60 units to the left of its own origin, which is pinned
to the frame's origin.

## Adding a prismatic joint

Create an entity for the joint and add a `PrismaticJointEcsComponent` to it
with `addPrismaticJointComponent`:

```ts
import { Vec2 } from '@forge-game-engine/forge/math';
import { addPrismaticJointComponent } from '@forge-game-engine/forge/physics';

const joint = world.createEntity();

addPrismaticJointComponent(world, joint, {
  entityA: frame,
  entityB: piston,
  axis: Vec2.up,
});
```

`axis` is the direction `entityB`'s anchor point slides in, in `entityA`'s
local space, so it turns with `entityA`. It defaults to `+X`. The anchor
points `localAnchorA` and `localAnchorB` default to each body's origin, as
for a revolute joint.

## Reference angle

When a joint is added, it stores `entityB`'s world rotation minus
`entityA`'s as its `referenceAngle`. A prismatic joint keeps the bodies at
that relative rotation. A revolute joint measures its angle from it: the
angle is `0` when the bodies are at the relative rotation they had when the
joint was added.

Add a joint after placing and rotating both bodies.
`addRevoluteJointComponent` and `addPrismaticJointComponent` throw if either
body has no `RotationEcsComponent`.

## Limiting a joint's motion

With `enableLimit: true`, a revolute joint keeps its angle between
`lowerAngle` and `upperAngle` (in radians), and a prismatic joint keeps the
distance from `entityA`'s anchor point to `entityB`'s, measured along
`axis`, between `lowerTranslation` and `upperTranslation`:

```ts
const hinge = addRevoluteJointComponent(world, joint, {
  entityA: frame,
  entityB: door,
  localAnchorB: { x: -60, y: 0 },
  enableLimit: true,
  lowerAngle: 0,
  upperAngle: Math.PI / 2,
});
```

The limits are fields of the component, and can be changed at any time:

```ts
hinge.upperAngle = Math.PI;
```

:::caution
`lowerAngle`, `upperAngle`, `lowerTranslation` and `upperTranslation` all
default to `0`. With `enableLimit: true` and no limits set, the joint
doesn't turn or slide at all.
:::

## Moving jointed bodies

A joint has no motor: it only constrains the motion of its bodies. Move a
jointed body with an impulse, a torque or an angular velocity motor (see
[Applying Forces](./forces.md)), or by setting its velocity. Without a
limit, a revolute joint doesn't slow a turning body down.

## Registering the joint systems

Register [`createRevoluteJointEcsSystem`](/Forge/docs/api/functions/createRevoluteJointEcsSystem)
and [`createPrismaticJointEcsSystem`](/Forge/docs/api/functions/createPrismaticJointEcsSystem)
after `createCollisionResolutionEcsSystem` and before
`createEulerIntegrationEcsSystem` (see
[Registering the physics systems](./index.md#registering-the-physics-systems)):

```ts
import {
  createPrismaticJointEcsSystem,
  createRevoluteJointEcsSystem,
} from '@forge-game-engine/forge/physics';

world.addSystem(createRevoluteJointEcsSystem(time));
world.addSystem(createPrismaticJointEcsSystem(time));
```

Each system solves each joint once per tick. When several joints share a
body, for example a chain of bodies, pass a higher `iterations` so the
chain converges:

```ts
world.addSystem(createRevoluteJointEcsSystem(time, { iterations: 8 }));
```

:::note
A joint corrects a body's distance from its anchor point or axis over
several ticks, at the rate its `hertz` and `dampingRatio` set. Under a
constant load, such as gravity, a jointed body stays a small distance from
its exact position.
:::

## Removing a joint

Remove the joint's entity with `world.removeEntity`. The bodies are no
longer constrained, and keep their velocities. While either body has no
`PositionEcsComponent` or `RotationEcsComponent`, for example after it has
been removed, the joint system skips the joint.
