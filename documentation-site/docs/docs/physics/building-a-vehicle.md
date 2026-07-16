---
sidebar_position: 6
---

# Building a Vehicle

This page combines [joints](./joints.md), [terrain](./terrain.md), and a
motorized wheel into one worked example: a car chassis, suspended over two
motorized wheels, rolling over generated terrain. Each piece is documented
in its own guide; this page focuses on how they fit together.

```ts
import { positionId, rotationId, Time } from '@forge-game-engine/forge/common';
import {
  EcsWorld,
  SystemRegistrationOrder,
} from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addWheelMotorComponent,
  CircleShape,
  createPhysicsEcsSystem,
  createTerrainBodies,
  createWheelMotorEcsSystem,
  PhysicsBodyId,
  PhysicsWorld,
  PolygonShape,
  RigidBody,
  SpringJoint,
} from '@forge-game-engine/forge/physics';

const world = new EcsWorld();
const time = new Time();
const physicsWorld = new PhysicsWorld({ gravity: new Vector2(0, -600) });

// 1. Terrain: a gentle hill built from sampled points.
const terrainPoints: Vector2[] = [];

for (let x = 0; x <= 2000; x += 25) {
  terrainPoints.push(new Vector2(x, 60 * Math.sin(x / 200)));
}

for (const segment of createTerrainBodies(terrainPoints, {
  thickness: 20,
  friction: 0.9,
})) {
  physicsWorld.addBody(segment);
}

// 2. Chassis: a plain dynamic body, no ECS component needed since nothing
// else drives it directly, its motion comes entirely from the joints below.
const chassis = new RigidBody({
  shape: PolygonShape.rectangle(100, 30),
  position: new Vector2(0, 400),
  density: 1,
});

physicsWorld.addBody(chassis);

// 3. Wheels: each one gets two SpringJoints back to the chassis, since a
// single joint doesn't resist fore-aft swing (see "Suspension: two joints
// per wheel" in the Joints guide).
const addWheel = (offsetX: number, targetAngularVelocity: number) => {
  const wheel = new RigidBody({
    shape: new CircleShape(20),
    position: chassis.position.add(new Vector2(offsetX, -25)),
    density: 1,
    friction: 1,
  });

  physicsWorld.addBody(wheel);
  physicsWorld.addJoint(
    new SpringJoint({
      bodyA: chassis,
      bodyB: wheel,
      anchorA: new Vector2(offsetX, 0),
      stiffness: 20_000,
      damping: 800,
    }),
  );
  physicsWorld.addJoint(
    new SpringJoint({
      bodyA: chassis,
      bodyB: wheel,
      anchorA: new Vector2(offsetX * 0.5, 10),
      stiffness: 20_000,
      damping: 800,
    }),
  );

  // 4. Motor: give the wheel a PhysicsBodyEcsComponent and a
  // WheelMotorEcsComponent so createWheelMotorEcsSystem can drive it.
  const entity = world.createEntity();

  world.addComponent(entity, positionId, {
    world: wheel.position.clone(),
    local: wheel.position.clone(),
  });
  world.addComponent(entity, rotationId, { world: 0, local: 0 });
  world.addComponent(entity, PhysicsBodyId, { physicsBody: wheel });
  addWheelMotorComponent(world, entity, {
    targetAngularVelocity,
    maxTorque: 12_000,
  });

  return wheel;
};

addWheel(-35, -25);
addWheel(35, -25);

// 5. Systems: the motor system MUST be registered before the physics
// system, see the caution below.
world.addSystem(
  createWheelMotorEcsSystem(time),
  SystemRegistrationOrder.early,
);
world.addSystem(createPhysicsEcsSystem(physicsWorld, time));
```

:::caution[System registration order]
[`createWheelMotorEcsSystem`](/Forge/docs/api/functions/createWheelMotorEcsSystem)
must be registered with an earlier `SystemRegistrationOrder` than
`createPhysicsEcsSystem`, as in the example above. `createPhysicsEcsSystem`
steps the `PhysicsWorld` (consuming and clearing each body's accumulated
torque) inside its own `beforeQuery`, which runs before any system
registered at a later priority. If the motor system runs after the physics
system, the torque it applies each tick isn't consumed until the *following*
tick, one frame late, which reads as a sluggish, jittery motor rather than a
broken one, easy to miss without knowing to look for it. See
[`SystemRegistrationOrder`](/Forge/docs/api/variables/SystemRegistrationOrder)
and the same pattern used for input systems in `registerInputs`.
:::

## Tuning

- **Chassis stability**: if the chassis tips over easily, increase the
  horizontal distance between the two `SpringJoint` anchors on each wheel
  (the `offsetX * 0.5` term above), or raise `stiffness`/`damping`.
- **Wheel traction**: traction comes entirely from the existing friction
  response between the wheel's `RigidBody` and the terrain's `RigidBody`
  segments, there's no separate "traction" setting. A wheel spun up by
  `createWheelMotorEcsSystem` slips or grips based on `friction` on both
  bodies and how hard gravity presses the wheel into the ground, exactly
  like a real tire. Raise `friction` on the wheel and terrain segments
  together for more grip; lower either for more slip.
- **Climbing steep hills**: raise `maxTorque` so the motor isn't limited
  before friction is, and check `thickness`/segment density on the terrain,
  see [Terrain](./terrain.md#segment-length-and-seams).
