import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  GravityEcsComponent,
  gravityId,
} from '../components/gravity-component.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../components/rigidbody-component.js';

/**
 * Creates an ECS system to handle gravity of rigid body entities.
 * @returns An ECS system that updates velocity of a rigid body based on gravity.
 */
export const createGravityEcsSystem = (
  time: Time,
): EcsSystem<[RigidBodyEcsComponent, GravityEcsComponent]> => ({
  query: [rigidBodyId, gravityId],
  update: (_world, { components: [rigidBodies, gravities] }) => {
    for (let i = 0; i < rigidBodies.length; i++) {
      const rigidBodyComponent = rigidBodies[i];
      const gravityComponent = gravities[i];

      rigidBodyComponent.velocity = rigidBodyComponent.velocity.add(
        gravityComponent.amount.multiply(time.deltaTimeInSeconds),
      );
    }
  },
});
