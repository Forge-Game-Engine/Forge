# Physics

Forge's physics module simulates 2D rigid bodies: it moves them by their
velocity, applies gravity and other forces, and detects and resolves
collisions between their shapes. It is made of ECS components, which hold
each body's data, and ECS systems, which each run one step of the
simulation every tick. There is no separate physics world: the systems are
registered on the `EcsWorld` like any other system.

The physics module has these parts:

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
- **Forces**: gravity, impulses, torque, angular velocity motors, springs,
  dampers and explosions change a body's velocity. See
  [Applying Forces](./forces.md).
- **Raycasting**: [`raycast`](/Forge/docs/api/functions/raycast) finds the
  colliders a line segment crosses. See [Raycasting](./raycasting.md).
- **Joints**: revolute (hinge) and prismatic (slider) joints constrain how
  two bodies move relative to each other. See [Joints](./joints.md).
- **Terrain**: a
  [`TerrainCollider`](/Forge/docs/api/classes/TerrainCollider) is static
  ground built from a heightmap. See [Terrain](./terrain.md).
- **Continuous collision detection**: stops fast circles from sinking into
  or passing through static colliders within one tick. See
  [Continuous Collision Detection](./continuous-collision-detection.md).

## Registering the physics systems

Physics systems read values that earlier systems write, so their order
matters. A setup that uses every physics feature registers them in this
order:

```ts
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  type CollisionManifold,
  type CollisionPair,
  type ContactConstraint,
  createAngularVelocityMotorEcsSystem,
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
} from '@forge-game-engine/forge/physics';

const collisionPairs: CollisionPair[] = [];
const collisionManifolds: CollisionManifold[] = [];
const contactConstraints: ContactConstraint[] = [];

world.addSystem(createTransformEcsSystem());
world.addSystem(createGravityEcsSystem(time));
world.addSystem(createLinearSpringEcsSystem(time));
world.addSystem(createLinearDamperEcsSystem(time));
world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
world.addSystem(createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds));
world.addSystem(
  createCollisionResolutionEcsSystem(
    collisionManifolds,
    contactConstraints,
    time,
  ),
);
world.addSystem(createRevoluteJointEcsSystem(time));
world.addSystem(createPrismaticJointEcsSystem(time));
world.addSystem(createAngularVelocityMotorEcsSystem(time));
world.addSystem(createEulerIntegrationEcsSystem(time));
world.addSystem(createContinuousCollisionEcsSystem());
```

1. `createTransformEcsSystem` writes every entity's world position and
   rotation, which the physics systems read (see
   [Transforms](../common/transforms.md)).
2. Gravity, springs and dampers change velocities before collisions are
   resolved, so the solver works with this tick's velocities.
3. The broad phase writes each collider's bounds and lists the pairs whose
   bounds overlap in `collisionPairs`. The narrow phase tests those pairs'
   shapes and writes each collision to `collisionManifolds`.
4. Collision resolution changes velocities so colliding bodies separate.
   `contactConstraints` keeps its solver state from one tick to the next.
5. The joint systems run after collision resolution, then the angular
   velocity motor system.
6. `createEulerIntegrationEcsSystem` moves each body's local position and
   rotation by its velocity, and continuous collision detection checks
   that movement.

Register only the systems for the features a game uses, in the same
relative order.
