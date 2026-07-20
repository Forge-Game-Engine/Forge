# Physics

Forge includes a native 2D physics engine: rigid bodies, convex collision
shapes, gravity, collision detection and resolution, raycasting, and
impulse-based forces (including explosions). It has no external
dependencies and integrates with the ECS via `createPhysicsSyncEcsSystem`, which
steps a `PhysicsWorld` every frame and keeps `RigidBody` transforms in sync
with entity position/rotation components.

Core concepts:

- [`PhysicsWorld`](/Forge/docs/api/classes/PhysicsWorld): owns the set of
  simulated bodies, steps the simulation, and applies world-level forces
  (gravity, explosions).
- [`RigidBody`](/Forge/docs/api/classes/RigidBody): a simulated body with a
  position, velocity, mass, and a collision shape.
- [`CircleShape`](/Forge/docs/api/classes/CircleShape) and
  [`PolygonShape`](/Forge/docs/api/classes/PolygonShape): the convex shapes a
  `RigidBody` can have.
- [`raycast`](/Forge/docs/api/functions/raycast): casts a ray against a set
  of bodies.
- [`PrismaticJoint`](/Forge/docs/api/classes/PrismaticJoint): a slider
  constraint locking two bodies to one linear degree of freedom.
- [`RevoluteJoint`](/Forge/docs/api/classes/RevoluteJoint): a hinge
  constraint locking two bodies to one rotational degree of freedom about a
  shared anchor point.
- [`LinearSpringEcsComponent`](/Forge/docs/api/interfaces/LinearSpringEcsComponent)
  and
  [`LinearDamperEcsComponent`](/Forge/docs/api/interfaces/LinearDamperEcsComponent):
  position- and velocity-based forces connecting two bodies' anchor points,
  for soft connections like vehicle suspension.

Guides in this section:

- [Bodies and Shapes](./rigid-bodies.md): creating bodies and shapes, ECS
  integration, and collision events.
- [Applying Forces](./forces.md): gravity, impulses, torque, springs and
  dampers, and explosions.
- [Raycasting](./raycasting.md): casting rays against bodies.
- [Prismatic Joints (Sliders)](./joints.md): constraining bodies to slide
  along a single axis.
- [Revolute Joints (Hinges)](./revolute-joints.md): pinning bodies together
  at a point while leaving rotation free.

## Quick Start

The simplest way to use physics is through the ECS integration: give an
entity a `PhysicsBodyEcsComponent` alongside its position and rotation
components, then register `createPhysicsSyncEcsSystem`. Every `world.update()`,
the system steps the `PhysicsWorld` and writes each dynamic body's resulting
position and angle back to the entity.

```ts
import { positionId, rotationId } from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  createPhysicsSyncEcsSystem,
  PhysicsBodyId,
  PhysicsWorld,
  PolygonShape,
  RigidBody,
} from '@forge-game-engine/forge/physics';
import { createGame } from '@forge-game-engine/forge/utilities';

const { world, time } = createGame('game-container');

const physicsWorld = new PhysicsWorld({ gravity: new Vector2(0, -300) });

const box = world.createEntity();

world.addComponent(box, positionId, {
  world: Vector2.zero,
  local: Vector2.zero,
});
world.addComponent(box, rotationId, { world: 0, local: 0 });
world.addComponent(box, PhysicsBodyId, {
  physicsBody: new RigidBody({ shape: PolygonShape.rectangle(32, 32) }),
});

world.addSystem(createPhysicsSyncEcsSystem(physicsWorld, time));
```

See [Bodies and Shapes](./rigid-bodies.md#ecs-integration) for static and
kinematic bodies, and how a body's transform maps onto
`PositionEcsComponent`/`RotationEcsComponent`.

You can also use `PhysicsWorld` and `RigidBody` directly, without the ECS, by
calling `physicsWorld.addBody(body)` and `physicsWorld.step(deltaTimeInSeconds)`
yourself each frame.
