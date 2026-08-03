import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  Time,
} from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { vector2Add, vector2Clone, vector2Multiply } from '../../math/index.js';
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

      rotationComponent.world +=
        rigidBodyComponent.angularVelocity * time.deltaTimeInSeconds;

      // Clone before scaling: `rigidBodyComponent.velocity` is the body's
      // live velocity state, not a disposable value.
      vector2Add(
        positionComponent.world,
        vector2Multiply(
          vector2Clone(rigidBodyComponent.velocity),
          time.deltaTimeInSeconds,
        ),
      );

      rigidBodyComponent.angularVelocity *=
        1 / (1 + rigidBodyComponent.angularDrag * time.deltaTimeInSeconds);
    }
  },
});
