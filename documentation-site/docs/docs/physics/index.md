# Physics

Forge includes a native 2D physics engine: rigid bodies, convex collision
shapes, gravity, collision detection and resolution, raycasting, and
impulse-based forces (including explosions). It has no external
dependencies and is entirely ECS-native - there's no separate physics world
object to step; each concern (gravity, broad phase, narrow phase, collision
resolution, integration, joints) is its own system, registered on the
`EcsWorld` like any other.

Core concepts:

- `RigidBodyEcsComponent`: a
  simulated body's velocity, mass, and `type` (`'dynamic'`, `'kinematic'`,
  or `'static'`).
- `ColliderEcsComponent`: an entity's
  collision shape (`CircleCollider`,
  `PolygonCollider`, or
  `TerrainCollider`), plus friction and
  restitution.
- `createBroadPhaseEcsSystem`/`createNarrowPhaseEcsSystem`/
  `createCollisionResolutionEcsSystem`: detect and resolve collisions
  between collider entities each tick.
- `raycast`: casts a ray against every
  collider entity in an `EcsWorld`.
- `PrismaticJointEcsComponent`: a
  slider constraint locking two bodies to one linear degree of freedom.
- `RevoluteJointEcsComponent`: a hinge
  constraint locking two bodies to one rotational degree of freedom about a
  shared anchor point.
- `LinearSpringEcsComponent`
  and
  `LinearDamperEcsComponent`:
  position- and velocity-based forces connecting two bodies' anchor points,
  for soft connections like vehicle suspension.

Guides in this section:

- [Bodies and Shapes](./rigid-bodies.md): creating bodies and shapes,
  static/kinematic/dynamic bodies, and ECS integration.
- [Applying Forces](./forces.md): gravity, impulses, torque, springs and
  dampers, and explosions.
- [Raycasting](./raycasting.md): casting rays against colliders.
- [Prismatic Joints (Sliders)](./joints.md): constraining bodies to slide
  along a single axis.
- [Revolute Joints (Hinges)](./revolute-joints.md): pinning bodies together
  at a point while leaving rotation free.
- [Terrain](./terrain.md): building non-convex 2D ground out of a
  heightmap.

## Quick Start

Give an entity a `ColliderEcsComponent` and a `RigidBodyEcsComponent`
alongside its position and rotation components, then register the systems
that simulate them. Every `world.update()`, those systems apply gravity,
detect and resolve collisions, and integrate each dynamic (or kinematic)
body's velocity into its position/rotation.

```ts
import { addPositionComponent, addRotationComponent } from '@forge-game-engine/forge/common';
import {
  addAabbComponent,
  addColliderComponent,
  addGravityComponent,
  addRigidBodyComponent,
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import { createGame } from '@forge-game-engine/forge/utilities';

const { world, time } = createGame('game-container');

const box = world.createEntity();
// PolygonCollider re-centers vertices around their centroid, so this 32x32
// square's own position is its center.
const collider = new PolygonCollider([
  { x: -16, y: -16 },
  { x: 16, y: -16 },
  { x: 16, y: 16 },
  { x: -16, y: 16 },
]);

addPositionComponent(world, box);
addRotationComponent(world, box);
addColliderComponent(world, box, { collider });
addAabbComponent(world, box);
addRigidBodyComponent(world, box, {
  mass: collider.mass,
  momentOfInertia: collider.momentOfInertia,
});
addGravityComponent(world, box, { amount: { x: 0, y: -300 } });

const collisionPairs: CollisionPair[] = [];
const collisionManifolds: CollisionManifold[] = [];
const contactConstraints: ContactConstraint[] = [];

world.addSystem(createGravityEcsSystem(time));
world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
world.addSystem(createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds));
world.addSystem(
  createCollisionResolutionEcsSystem(collisionManifolds, contactConstraints, time),
);
world.addSystem(createEulerIntegrationEcsSystem(time));
```

See [Bodies and Shapes](./rigid-bodies.md) for static and kinematic bodies,
choosing a collision shape, and the full system registration order.
