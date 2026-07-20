import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  LinearSpringEcsComponent,
  LinearSpringId,
} from '../components/index.js';
import { applyLinearSpringForce } from '../forces/index.js';

/**
 * Creates an ECS system that applies each matched entity's `LinearSpring`
 * restoring force to its connected bodies every tick, via
 * `applyLinearSpringForce`.
 *
 * Must be registered with the `EcsWorld` before `createPhysicsSyncEcsSystem`
 * (or with an earlier `registrationOrder`), so the force applied this tick
 * is reflected in the same tick's `physicsWorld.step`.
 * @param time - The time instance used to scale the force by the tick's
 * delta time.
 */
export const createLinearSpringEcsSystem = (
  time: Time,
): EcsSystem<[LinearSpringEcsComponent], void> => ({
  query: [LinearSpringId],
  run: (result) => {
    const [springComponent] = result.components;

    applyLinearSpringForce(springComponent.spring, time.deltaTimeInSeconds);
  },
});
