import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  Time,
} from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../components/rigidbody-component.js';

/**
 * Creates an ECS system to Euler integration of rigid body entities.
 * @returns An ECS system that updates position and rotation of a rigid body
 * based their respective velocity and angular velocity.
 */
export const createEulerIntegrationEcsSystem = (
  time: Time,
): EcsSystem<
  [PositionEcsComponent, RotationEcsComponent, RigidBodyEcsComponent]
> => ({
  query: [positionId, rotationId, rigidBodyId],
  update: (_world, { components: [positions, rotations, rigidBodies] }) => {
    for (let i = 0; i < positions.length; i++) {
      const positionComponent = positions[i];
      const rotationComponent = rotations[i];
      const rigidBodyComponent = rigidBodies[i];

      rotationComponent.local +=
        rigidBodyComponent.angularVelocity * time.deltaTimeInSeconds;

      positionComponent.local = positionComponent.local.add(
        rigidBodyComponent.velocity.multiply(time.deltaTimeInSeconds),
      );
    }
  },
});
