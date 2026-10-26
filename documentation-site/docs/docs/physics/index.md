# Physics

Forge's physics module simulates 2D rigid bodies: it moves them by their
velocity, applies gravity and other forces, and detects and resolves
collisions between their shapes. It is made of ECS components, which hold
each body's data, and ECS systems, which each run one part of the
simulation every fixed step. There is no separate physics world: the
systems are registered on the `EcsWorld` like any other system.

The physics module has these parts:

- **Fixed timestep**: the simulation advances in steps of a fixed size,
  and bodies are drawn between their last two steps. See
  [Fixed Timestep](./fixed-timestep.md).
- **Bodies and colliders**: a
  [`ColliderEcsComponent`](/Forge/docs/api/interfaces/ColliderEcsComponent)
  gives an entity a collision shape, and a
  [`RigidBodyEcsComponent`](/Forge/docs/api/interfaces/RigidBodyEcsComponent)
  makes it move. See [Bodies and Shapes](./rigid-bodies.md).
- **Collisions**: the broad phase, narrow phase and collision resolution
  systems find overlapping colliders and push them apart. Collision
  categories and masks filter which colliders collide, sensors detect
  overlaps without resolving them, and a
  [`ContactsEcsComponent`](/Forge/docs/api/interfaces/ContactsEcsComponent)
  lists what an entity touches. See [Collisions](./collisions.md).
- **Broad phase**: the world's one broad phase keeps every collider in two
  dynamic AABB trees and finds the pairs of colliders whose bounds overlap.
  Two static colliders are never paired, and only colliders that moved
  look for new pairs. See [Broad Phase](./broad-phase.md).
- **Forces**: gravity, impulses, torque, angular velocity motors, springs,
  dampers and explosions change a body's velocity. See
  [Applying Forces](./forces.md).
- **Queries**: [`raycast`](/Forge/docs/api/functions/raycast) finds the
  colliders a line segment crosses,
  [`queryAabb`](/Forge/docs/api/functions/queryAabb) the colliders whose
  bounds overlap a box, and
  [`overlapPoint`](/Forge/docs/api/functions/overlapPoint) the colliders
  that contain a point. See [Queries](./queries.md).
- **Joints**: revolute (hinge) and prismatic (slider) joints constrain how
  two bodies move relative to each other. See [Joints](./joints.md).
- **Terrain**: a
  [`TerrainCollider`](/Forge/docs/api/classes/TerrainCollider) is ground
  built from a heightmap, for static and kinematic bodies. See [Terrain](./terrain.md).
- **Chain colliders**: a
  [`ChainCollider`](/Forge/docs/api/classes/ChainCollider) is static level
  geometry built from closed loops of edges, such as a level's walls,
  floors and platforms. See [Chain Colliders](./chain-colliders.md).
- **Continuous collision detection**: stops fast circles from sinking into
  or passing through static colliders within one step. See
  [Continuous Collision Detection](./continuous-collision-detection.md).
- **Sleeping bodies**: groups of touching or jointed bodies that have
  stopped moving are put to sleep, and the other physics systems skip them
  until they're disturbed. See [Sleeping Bodies](./sleeping.md).
- **Dynamic AABB tree**: a
  [`DynamicAabbTree`](/Forge/docs/api/classes/DynamicAabbTree) is a spatial
  index that finds the boxes overlapping a box or crossed by a segment.
  The broad phase keeps colliders in two of them, and a game can use one
  for its own spatial queries. See
  [Dynamic AABB Tree](./dynamic-aabb-tree.md).

## Registering the physics systems

The physics systems are registered in the group
[`registerFixedUpdate`](/Forge/docs/api/functions/registerFixedUpdate)
returns, so they run once per fixed step and read the fixed delta time from
`time.deltaTimeInSeconds` (see
[Running systems at a fixed rate](../common/time.md#running-systems-at-a-fixed-rate)).
A simulation run this way gives the same result at any frame rate.

Physics systems read values that earlier systems write, so their order
matters. A setup that uses every physics feature registers them in this
order:

```ts
import {
  createTransformEcsSystem,
  createTransformInterpolationEcsSystem,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
import {
  type CollisionManifold,
  type CollisionPair,
  type ContactConstraint,
  createAngularVelocityMotorEcsSystem,
  createBroadPhase,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createLinearDamperEcsSystem,
  createLinearSpringEcsSystem,
  createNarrowPhaseEcsSystem,
  createPrismaticJointEcsSystem,
  createRevoluteJointEcsSystem,
  createSleepEcsSystem,
} from '@forge-game-engine/forge/physics';
import {
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';

const collisionPairs: CollisionPair[] = [];
const collisionManifolds: CollisionManifold[] = [];
const contactConstraints: ContactConstraint[] = [];

createBroadPhase(world);

const fixedUpdate = registerFixedUpdate(world, time);
const physics = { group: fixedUpdate };

// Once per fixed step.
world.addSystem(createTransformEcsSystem(time), physics);
world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);
world.addSystem(
  createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
  physics,
);
world.addSystem(createSleepEcsSystem(collisionManifolds, time), physics);
world.addSystem(createGravityEcsSystem(time), physics);
world.addSystem(createLinearSpringEcsSystem(time), physics);
world.addSystem(createLinearDamperEcsSystem(time), physics);
world.addSystem(
  createCollisionResolutionEcsSystem(
    collisionManifolds,
    contactConstraints,
    time,
  ),
  physics,
);
world.addSystem(createRevoluteJointEcsSystem(time), physics);
world.addSystem(createPrismaticJointEcsSystem(time), physics);
world.addSystem(createAngularVelocityMotorEcsSystem(time), physics);
world.addSystem(createEulerIntegrationEcsSystem(time), physics);
world.addSystem(createContinuousCollisionEcsSystem(), physics);
world.addSystem(createTransformInterpolationEcsSystem(), physics);

// Once per frame, after the fixed steps.
world.addSystem(createTransformEcsSystem(time));
world.addSystem(createCameraEcsSystem(time));
world.addSystem(createRenderEcsSystem(renderContext));
```

1. The first `createTransformEcsSystem` writes every entity's world
   position and rotation at the start of each step, which the physics
   systems read (see [Transforms](../common/transforms.md)). Each step
   reads the poses the previous step's integration, or the game code that
   ran before it, left in `local`.
2. The broad phase writes the bounds of each collider that moved or
   changed shape, and lists the pairs whose bounds overlap in
   `collisionPairs`. It keeps every collider in the world's broad phase,
   which [`createBroadPhase`](/Forge/docs/api/functions/createBroadPhase)
   creates once per world, so it only looks for new pairs around the
   colliders that moved (see [Broad Phase](./broad-phase.md)).
   The narrow phase tests those pairs' shapes and writes each collision to
   `collisionManifolds`.
3. The sleep system reads this step's `collisionManifolds`, wakes sleeping
   bodies that were disturbed and puts resting ones to sleep, before any
   system changes a velocity (see [Sleeping Bodies](./sleeping.md)).
4. Gravity, springs and dampers change velocities before collisions are
   resolved, so the solver works with this step's velocities. They only
   read poses and write velocities, so they run after the broad and narrow
   phases without changing what those phases find.
5. Collision resolution changes velocities so colliding bodies separate.
   `contactConstraints` keeps its solver state from one step to the next.
6. The joint systems run after collision resolution, then the angular
   velocity motor system.
7. `createEulerIntegrationEcsSystem` moves each body's local position and
   rotation by its velocity, and continuous collision detection checks
   that movement.
8. `createTransformInterpolationEcsSystem` records where each body ended
   the step, so the frame's transform system can draw it between its last
   two poses (see
   [Interpolating between fixed steps](../common/transforms.md#interpolating-between-fixed-steps)).
   It runs after every system that moves bodies in the step.
9. The second `createTransformEcsSystem`, in the default group, runs once
   per frame after the fixed steps. It draws each body between where it
   started and ended the latest step, by how far the frame is towards the
   next step, so bodies move on every frame at any display rate. Without
   it, a frame draws each body where it was at the start of the frame's
   last step.

Register only the systems for the features a game uses, in the same
relative order. The `physics` object is a local variable, not part of the
engine's API. A game system that has to run between two physics systems
is registered with the same `group` option at its place in the order, or
with `addSystem`'s `before` or `after` option against a physics system in
the same group.

## Running physics at a fixed rate

The physics systems run once per fixed step, and each frame draws bodies
between their last two steps. [Fixed Timestep](./fixed-timestep.md) covers
choosing a step rate, which game systems go in the fixed-update group and
which run once per frame, teleporting a body, and what happens after a long
frame.
