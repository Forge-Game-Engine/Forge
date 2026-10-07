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

addPositionComponent(world, entity, { local: { x: 100, y: 50 } });
addRotationComponent(world, entity, { local: Math.PI / 4 });
addScaleComponent(world, entity, { local: { x: 2, y: 2 } });
```

Rotation is in radians (see [Angles and Rotation](../math/angles-and-rotation.md)).

## Registering the transform system

Register one transform system per world:

```ts
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';

world.addSystem(createTransformEcsSystem());
```

The system updates every entity that has a `PositionEcsComponent`, and the
ancestors of those entities. Systems run in registration order, so register it
after the systems that write `local` and before the systems that read
`world`:

1. Game logic, and `registerUiSystems` when the world has UI.
2. `createTransformEcsSystem()`.
3. Physics (see [Physics](../physics/index.md)).
4. Rendering.

Physics reads `world` and writes the movement it integrates to `local`.
That movement reaches `world` on the next frame's transform update.

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
addPositionComponent(world, child, { local: { x: 0, y: 12 } });
world.setParent(child, parent);
// After the transform system updates, the child's world position is (100, 12).
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

## Marking a transform static

Set `isStatic: true` on a `PositionEcsComponent` whose entity never moves.
The transform system computes its `world` transform once and skips it after
that, as long as every parent in its chain is also static:

```ts
addPositionComponent(world, entity, {
  local: { x: 0, y: -200 },
  isStatic: true,
});
```

:::caution
Changes to the `local` value of a static entity have no effect once its
`world` transform is computed. Set `isStatic` back to `false`, or reparent
the entity, to have it computed again.
:::
