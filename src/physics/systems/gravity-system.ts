import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { vector2Add, vector2Clone, vector2Multiply } from '../../math/index.js';
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

      // Clone before scaling: `gravityComponent.amount` is a persistent
      // component field reused every tick, not a disposable value.
      vector2Add(
        rigidBodyComponent.velocity,
        vector2Multiply(
          vector2Clone(gravityComponent.amount),
          time.deltaTimeInSeconds,
        ),
      );
    }
  },
});
