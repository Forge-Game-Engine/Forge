# Physics

Forge's physics module simulates 2D rigid bodies: it moves them by their
velocity, applies gravity and other forces, and detects and resolves
collisions between their shapes. It is made of ECS components, which hold
each body's data, and ECS systems, which each run one part of the
simulation every fixed step. There is no separate physics world: the
systems are registered on the `EcsWorld` like any other system.

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
  index that finds the boxes overlapping a box or crossed by a segment,
  for a game's own spatial queries. See
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
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
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
  createSleepEcsSystem,
} from '@forge-game-engine/forge/physics';
import {
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';

const collisionPairs: CollisionPair[] = [];
const collisionManifolds: CollisionManifold[] = [];
const contactConstraints: ContactConstraint[] = [];

const fixedUpdate = registerFixedUpdate(world, time);
const physics = { group: fixedUpdate };

// Once per fixed step.
world.addSystem(createTransformEcsSystem(), physics);
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

// Once per frame, after the fixed steps.
world.addSystem(createTransformEcsSystem());
world.addSystem(createCameraEcsSystem(time));
world.addSystem(createRenderEcsSystem(renderContext));
```

1. The first `createTransformEcsSystem` writes every entity's world
   position and rotation at the start of each step, which the physics
   systems read (see [Transforms](../common/transforms.md)). Each step
   reads the poses the previous step's integration, or the game code that
   ran before it, left in `local`.
2. The broad phase writes each collider's bounds and lists the pairs whose
   bounds overlap in `collisionPairs`. The narrow phase tests those pairs'
   shapes and writes each collision to `collisionManifolds`.
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
8. The second `createTransformEcsSystem`, in the default group, runs once
   per frame after the fixed steps, so the camera and rendering read the
   latest step's poses. Without it, a frame draws each body where it was
   at the start of the frame's last step.

Register only the systems for the features a game uses, in the same
relative order. The `physics` object is a local variable, not part of the
engine's API. A game system that has to run between two physics systems
is registered with the same `group` option at its place in the order, or
with `addSystem`'s `before` or `after` option against a physics system in
the same group.

## Where game systems go

A game system runs once per fixed step, in the `fixedUpdate` group above, when
its effect on the simulation depends on how often it runs:

- it applies a force, torque or velocity change scaled by the delta time;
- it sets a velocity or a motor target that the solver reads in the same
  step, registered before collision resolution;
- it reads `ContactsEcsComponent.started` or `ended`, or
  `collisionManifolds`, registered after the narrow phase (see
  [Reading contacts](./collisions.md#reading-contacts));
- it drives the simulation on a timer, such as a periodic impulse.

A game system runs once per frame, in the default group, when it reads
something that is true for one frame or when it draws:

- it reads a trigger action's `isTriggered`: a press is read by zero fixed
  steps on a short frame and by several on a long one;
- it moves an entity that has no rigid body by writing its `local`;
- it positions or draws something from a body's pose, such as a camera
  that follows a body;
- it spawns entities, edits tiles or colliders, or changes the camera,
  rendering, UI or audio.

A once-per-frame system that reads a dynamic or kinematic body's pose
reads its `position.local` and `rotation.local`. These bodies have no
parent, so `local` is their world pose. Before the frame's transform system
runs, their `world` is the pose from the start of the frame's last step.

`ContactsEcsComponent.touching` is the state after the latest step, so a
system in either group can read it.

### Requesting a change from a once-per-frame system

A system that reads a press and has to change the simulation inside a step
is split in two. The once-per-frame system sets a field on a component,
and a fixed-step system acts on the field and clears it:

```ts
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { TriggerAction } from '@forge-game-engine/forge/input';

const createJumpInputEcsSystem = (
  jumpInput: TriggerAction,
): EcsSystem<[PlayerEcsComponent]> => ({
  query: [playerId],
  update: (_world, { components: [players] }) => {
    if (!jumpInput.isTriggered) {
      return;
    }

    for (const player of players) {
      player.jumpRequested = true;
    }
  },
});

world.addSystem(createJumpInputEcsSystem(jumpInput));
```

A player-move system registered in `fixedUpdate` after the narrow phase
jumps when `jumpRequested` is `true` and the player is on the ground, and
sets `jumpRequested` to `false` on every step. A
press on a frame with no fixed step is acted on in the next frame's first
step, and a press on a frame with several steps is acted on once.
