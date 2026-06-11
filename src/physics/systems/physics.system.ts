import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  type Time,
} from '../../common/index.js';
import { PhysicsBodyEcsComponent, PhysicsBodyId } from '../components/index.js';
import type { PhysicsWorld } from '../physics-world.js';
import type { RigidBody } from '../rigid-body.js';

import { EcsSystem } from '../../ecs/ecs-system.js';

/**
 * Creates an ECS system to handle physics.
 * @param physicsWorld - The physics world to step and synchronize with the ECS.
 * @param time - The time instance used to determine the simulation step size.
 */
export const createPhysicsEcsSystem = (
  physicsWorld: PhysicsWorld,
  time: Time,
): EcsSystem<
  [PhysicsBodyEcsComponent, PositionEcsComponent, RotationEcsComponent],
  void
> => {
  const registeredBodies = new Set<RigidBody>();

  return {
    query: [PhysicsBodyId, positionId, rotationId],
    beforeQuery: () => {
      physicsWorld.step(time.deltaTimeInSeconds);
    },
    run: (result) => {
      const [physicsBodyComponent, positionComponent, rotationComponent] =
        result.components;
      const { physicsBody } = physicsBodyComponent;

      if (!registeredBodies.has(physicsBody)) {
        physicsWorld.addBody(physicsBody);
        registeredBodies.add(physicsBody);
      }

      if (physicsBody.isStatic || physicsBodyComponent.isKinematic === true) {
        physicsBody.position = positionComponent.world.clone();

        // `rotationComponent.world` is in render space (Y-down), while
        // `physicsBody.angle` is in world space (Y-up); these are mirrored,
        // so the angle is negated when crossing this boundary.
        physicsBody.angle = -rotationComponent.world;
      } else {
        positionComponent.world.x = physicsBody.position.x;
        positionComponent.world.y = physicsBody.position.y;

        rotationComponent.world = -physicsBody.angle;
      }
    },
    cleanupEntities: (result) => {
      const [physicsBodyComponent] = result.components;
      const { physicsBody } = physicsBodyComponent;

      if (registeredBodies.has(physicsBody)) {
        physicsWorld.removeBody(physicsBody);
        registeredBodies.delete(physicsBody);
      }
    },
  };
};
