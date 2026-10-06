---
sidebar_position: 2
---

# Transforms

An entity's place in the world is three components:
`PositionEcsComponent`, `RotationEcsComponent` and `ScaleEcsComponent`.
Each holds two values:

- `local`: the entity's transform relative to its parent, or relative to
  the world when it has no parent. **This is the value you write.**
- `world`: the entity's final transform in world space. **This is
  output.** Only `createTransformEcsSystem` writes it, every frame.
  `addPositionComponent`, `addRotationComponent` and `addScaleComponent`
  only take `local`, and start `world` as a copy of it.

The transform system sets an entity's `world` from its `local` and, if it
has a `ParentEcsComponent`, its parent's `world`. The parent's rotation and
scale apply to the child's offset, the rotations add, and the scales
multiply. An entity without a parent gets `world = local`.

```ts
import {
  addParentComponent,
  addPositionComponent,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';

const tank = world.createEntity();
const turret = world.createEntity();

const tankPosition = addPositionComponent(world, tank, {
  local: { x: 100, y: 0 },
});
addPositionComponent(world, turret, { local: { x: 0, y: 12 } });
addParentComponent(world, turret, { parent: tank });

world.addSystem(createTransformEcsSystem());

// Later, in one of your systems: move the tank by writing its local
// position. The turret follows.
tankPosition.local.x += speed * time.deltaTimeInSeconds;
```

Everything that reads a transform to draw, collide or measure, such as
rendering, physics, cameras and UI hit testing, reads `world`. Everything that
moves an entity, such as your own systems, physics integration and UI
layout, writes `local`. Writing `world` yourself doesn't work: the
transform system overwrites it from `local` on its next pass.

## Registration order

Register `createTransformEcsSystem` once per world. Systems run in
registration order, so put it after the systems that write `local` and
before the systems that read `world`:

1. Your game logic, and `registerUiSystems` if you use the UI.
2. `createTransformEcsSystem()`.
3. Physics: gravity, broad phase, narrow phase, collision resolution,
   joints and springs, then `createEulerIntegrationEcsSystem` and
   `createContinuousCollisionEcsSystem`.
4. Rendering.

Physics reads `world` and integrates velocity into `local`, so running the
transform system before it means collisions see every entity where it is
this frame, including entities you just created or teleported. The
movement physics integrates reaches `world` on the next frame's transform
pass, so bodies are drawn where collisions were resolved.

## Following another entity

A system that positions one entity from another's transform (a camera
following the player, a line drawn between two bodies) reads the
target's `world` from the last transform pass, which can be a frame old.
When the target has no parent, its `local` _is_ its world transform and is
always current, so read that instead:

```ts
// The camera follows the car, which has no parent.
cameraPosition.local.x = carPosition.local.x;
cameraPosition.local.y = carPosition.local.y;
```

## Gotchas

- **Moving rigid bodies must be root entities.** Physics velocities are in
  world space, and `createEulerIntegrationEcsSystem` adds them to the
  body's `local` transform, which is only correct when the body has no
  parent. It throws for a dynamic or kinematic body with a
  `ParentEcsComponent`. Connect bodies with joints or springs instead.
- **Static entities.** Set `isStatic: true` on a `PositionEcsComponent`
  whose entity and parents never move. The transform system computes its
  `world` transform once and skips it after that.
