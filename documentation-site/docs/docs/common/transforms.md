---
sidebar_position: 2
---

# Transforms

An entity's transform is three components:
[`PositionEcsComponent`](/Forge/docs/api/interfaces/PositionEcsComponent),
[`RotationEcsComponent`](/Forge/docs/api/interfaces/RotationEcsComponent)
and [`ScaleEcsComponent`](/Forge/docs/api/interfaces/ScaleEcsComponent).
[`createTransformEcsSystem`](/Forge/docs/api/functions/createTransformEcsSystem)
computes each entity's world transform from its local transform and its
parent's world transform.

## Local and world values

Each transform component holds two values:

- `local`: the transform relative to the entity's parent, or to the world
  when it has no parent. Game code and every system that moves an entity
  writes `local`.
- `world`: the transform in world space. Only `createTransformEcsSystem`
  writes it. Rendering, physics, cameras and UI hit testing read it.

A value written to `world` anywhere else is replaced from `local` on the
transform system's next update.

## Adding a transform

[`addPositionComponent`](/Forge/docs/api/functions/addPositionComponent),
[`addRotationComponent`](/Forge/docs/api/functions/addRotationComponent) and
[`addScaleComponent`](/Forge/docs/api/functions/addScaleComponent) take the
`local` value and set `world` to a copy of it. Position defaults to
`(0, 0)`, rotation to `0` radians and scale to `(1, 1)`:

```ts
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '@forge-game-engine/forge/common';

const entity = world.createEntity();

addPositionComponent(world, entity, { local: { x: 100, y: -50 } });
addRotationComponent(world, entity, { local: -Math.PI / 4 });
addScaleComponent(world, entity, { local: { x: 2, y: 2 } });
```

Rotation is in radians (see [Angles and Rotation](../math/angles-and-rotation.md)).

## Registering the transform system

Register a transform system in the default group:

```ts
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';

world.addSystem(createTransformEcsSystem(time));
```

The system takes the world's [`Time`](./time.md), which tells it whether a
fixed step is running and how far the frame is towards the next one (see
[Interpolating between fixed steps](#interpolating-between-fixed-steps)).
It updates every entity that has a `PositionEcsComponent`, and the
ancestors of those entities. Systems run in registration order, so register it
after the systems that write `local` and before the systems that read
`world`:

1. Game logic, and `registerUiSystems` when the world has UI.
2. `createTransformEcsSystem(time)`.
3. Rendering.

### Registering transform systems with physics

A world with physics has two transform systems. The first runs at the start
of each fixed step, in the group
[`registerFixedUpdate`](/Forge/docs/api/functions/registerFixedUpdate)
returns, before the physics systems. The second runs once per frame, in
the default group, before rendering:

```ts
import {
  createTransformEcsSystem,
  createTransformInterpolationEcsSystem,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';

const fixedUpdate = registerFixedUpdate(world, time);

world.addSystem(createTransformEcsSystem(time), { group: fixedUpdate });
// The physics systems, in the fixed-update group.
world.addSystem(createTransformInterpolationEcsSystem(), {
  group: fixedUpdate,
});

world.addSystem(createTransformEcsSystem(time));
// Rendering.
```

Each frame, the world runs:

1. Once per fixed step: the first transform system, then physics (see
   [Registering the physics systems](../physics/index.md#registering-the-physics-systems)),
   then `createTransformInterpolationEcsSystem`.
2. Game logic in the default group, and `registerUiSystems` when the world
   has UI.
3. The second transform system.
4. Rendering.

Physics reads `world` and writes the movement it integrates to `local`.
Inside a fixed step, the transform system composes `world` from `local`
exactly, so the physics systems read the simulated pose. The frame's second
transform system draws each interpolated entity between its last two fixed
steps. Both systems are the only writers of `world`.

## Interpolating between fixed steps

An entity that moves only in fixed steps (a rigid body) moves on the frames
that run a step and stands still on the frames that don't. When the
display's rate isn't a multiple of the fixed step's, that shows as stutter.
An entity with a
[`TransformInterpolationEcsComponent`](/Forge/docs/api/interfaces/TransformInterpolationEcsComponent)
is drawn between its local transform at the start and at the end of the
latest fixed step, blended by
[`time.fixedOverstepFraction`](./time.md#interpolating-between-fixed-steps),
so it moves on every frame. Rotation is blended the shorter way around.

[`addRigidBodyComponent`](/Forge/docs/api/functions/addRigidBodyComponent)
adds the component to every rigid body. Another entity that moves in fixed
steps gets it from
[`addTransformInterpolationComponent`](/Forge/docs/api/functions/addTransformInterpolationComponent):

```ts
import { addTransformInterpolationComponent } from '@forge-game-engine/forge/common';

addTransformInterpolationComponent(world, entity);
```

The component holds two snapshots of the entity's local transform:

- `stepStart`, which the transform system in the fixed-update group writes
  at the start of each step;
- `stepEnd`, which
  [`createTransformInterpolationEcsSystem`](/Forge/docs/api/functions/createTransformInterpolationEcsSystem)
  writes at the end of each step. Register it last in the fixed-update
  group, after every system that moves entities in fixed steps. Without it,
  interpolated entities are drawn at `local`.

Outside a fixed step, an interpolated entity's `world` is its drawn pose, up
to one fixed step behind its `local`. Inside a fixed step it's composed from
`local`. A child of an interpolated entity is composed on its parent's
drawn pose, so it stays on its parent on screen.

To draw an entity at its simulated pose, remove the component:

```ts
import { transformInterpolationId } from '@forge-game-engine/forge/common';

world.removeComponent(entity, transformInterpolationId);
```

### Moving an interpolated entity outside a fixed step

An interpolated entity is blended only while its `local` transform equals
`stepEnd`. When anything other than the fixed steps writes `local` (a
respawn, a reset, a system that moves the entity every frame), the entity is
drawn at `local` until the next step, and the next step blends from the new
pose. No other call is needed.

:::caution
Write a teleport in the default group, or in the fixed-update group before
its transform system. A teleport written in a fixed step after the
transform system and before `createTransformInterpolationEcsSystem` is
recorded as the step's movement, and the entity is drawn sliding from its
old pose to the new one over one step.
:::

### Reading the drawn pose

[`getInterpolatedLocalPosition`](/Forge/docs/api/functions/getInterpolatedLocalPosition)
and
[`getInterpolatedLocalRotation`](/Forge/docs/api/functions/getInterpolatedLocalRotation)
return the local position and rotation the frame's transform system draws an
entity at. For an entity without a parent, such as a rigid body, that's its
drawn world pose. Read them to place something on screen from a moving body
in a system that runs before the frame's transform system:

```ts
import { getInterpolatedLocalPosition } from '@forge-game-engine/forge/common';

const target = getInterpolatedLocalPosition(world, body, time);

cameraPosition.local.x = target.x;
cameraPosition.local.y = target.y;
```

Game logic (whether a body fell off the map, where to apply an impulse)
reads the body's `local`, the pose the simulation continues from.

## Moving an entity

Write the entity's `local` value:

```ts
const position = addPositionComponent(world, entity);

position.local.x += unitsPerSecond * time.deltaTimeInSeconds;
```

## Parenting a transform

An entity with a parent (set with `world.setParent(child, parent)`, see
[Parenting entities](../ecs/world.md#parenting-entities)) has its `local`
transform applied on top of its parent's `world` transform:

- the child's local position is scaled by the parent's world scale, rotated
  by the parent's world rotation, and added to the parent's world position;
- the rotations add;
- the scales multiply.

```ts
const parent = world.createEntity();
const child = world.createEntity();

addPositionComponent(world, parent, { local: { x: 100, y: 0 } });
addPositionComponent(world, child, { local: { x: 0, y: -12 } });
world.setParent(child, parent);
// After the transform system updates, the child's world position is (100, -12).
```

Moving the parent's `local` moves the child with it. Setting or removing a
parent keeps the child's `local` value, so the child keeps the same offset
under its new parent, or from the world origin when it has no parent.

:::caution
A dynamic or kinematic rigid body can't have a parent:
`createEulerIntegrationEcsSystem` throws for one. Connect bodies with joints
or springs instead (see [Joints](../physics/joints.md)).
:::

## Reading another entity's transform

A system that positions one entity from another (for example, a camera that
follows a target) and runs before the transform system reads a `world` value
from the previous frame. When the other entity has no parent, its `local`
value equals its world transform and is always current, so read `local`:

```ts
cameraPosition.local.x = targetPosition.local.x;
cameraPosition.local.y = targetPosition.local.y;
```

A dynamic or kinematic rigid body never has a parent, and its `local` is
its simulated pose. Something drawn from a body, or a camera that follows
one, reads the body's drawn pose with `getInterpolatedLocalPosition` (see
[Reading the drawn pose](#reading-the-drawn-pose)), so it lines up with the
body on screen. Game logic reads the body's `local`.
[`applyImpulse`](/Forge/docs/api/functions/applyImpulse) and
[`applyExplosiveForce`](/Forge/docs/api/functions/applyExplosiveForce) read a
body's `local` pose.

## Converting points between local and world space

[`localToWorldPoint`](/Forge/docs/api/functions/localToWorldPoint) maps a
point in an entity's local space to world space, and
[`worldToLocalPoint`](/Forge/docs/api/functions/worldToLocalPoint) maps a
world point into an entity's local space:

```ts
import {
  localToWorldPoint,
  worldToLocalPoint,
} from '@forge-game-engine/forge/common';

const muzzle = localToWorldPoint(world, ship, { x: 20, y: 0 });
const pointInShip = worldToLocalPoint(world, ship, worldPoint);
```

`localToWorldPoint` scales the point by the entity's `scale.world`, rotates
it by `rotation.world` and adds `position.world`, which is how the transform
system places a child in its parent. `worldToLocalPoint` does the reverse.
The entity needs a `PositionEcsComponent`; without a rotation or scale, they
count as `0` and `(1, 1)`.

Both read the `world` values the transform system wrote on its last update,
so a point converted after changing an entity's `local` value and before the
transform system runs uses the previous world transform. For an
interpolated entity, a conversion made in the default group or an event
handler goes through its drawn pose, and one made in a fixed step after the
step's transform system goes through its simulated pose.

## Marking a transform static

Set `isStatic: true` on a `PositionEcsComponent` whose entity never moves.
The transform system computes its `world` transform once and skips it after
that, as long as every parent in its chain is also static:

```ts
addPositionComponent(world, entity, {
  local: { x: 0, y: 200 },
  isStatic: true,
});
```

:::caution
Changes to the `local` value of a static entity have no effect once its
`world` transform is computed. Set `isStatic` back to `false`, or reparent
the entity, to have it computed again.
:::
