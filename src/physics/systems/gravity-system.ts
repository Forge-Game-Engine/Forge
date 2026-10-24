import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { Vec2 } from '../../math/index.js';
import {
  GravityEcsComponent,
  gravityId,
} from '../components/gravity-component.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../components/rigidbody-component.js';
import { isBodyAwake } from '../is-body-awake.js';

/**
 * Creates an ECS system to handle gravity of rigid body entities.
 * @returns An ECS system that updates velocity of a rigid body based on
 * gravity. `'static'` and `'kinematic'` bodies (see {@link RigidBodyType})
 * are skipped - neither is affected by forces - and so are sleeping bodies
 * (see {@link isBodyAwake}). Register it after `createSleepEcsSystem`, so
 * a body that falls asleep this tick gets no velocity from it.
 */
export const createGravityEcsSystem = (
  time: Time,
): EcsSystem<[RigidBodyEcsComponent, GravityEcsComponent]> => ({
  query: [rigidBodyId, gravityId],
  update: (world, { entities, components: [rigidBodies, gravities] }) => {
    for (let i = 0; i < rigidBodies.length; i++) {
      const rigidBodyComponent = rigidBodies[i];

      if (
        rigidBodyComponent.type !== 'dynamic' ||
        (rigidBodyComponent.isSleeping && !isBodyAwake(world, entities[i]))
      ) {
        continue;
      }

      const gravityComponent = gravities[i];

      // Clone before scaling: `gravityComponent.amount` is a persistent
      // component field reused every tick, not a disposable value.
      Vec2.add(
        rigidBodyComponent.velocity,
        Vec2.multiply(
          Vec2.clone(gravityComponent.amount),
          time.deltaTimeInSeconds,
        ),
      );
    }
  },
});
