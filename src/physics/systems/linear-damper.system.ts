import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  LinearDamperEcsComponent,
  LinearDamperId,
} from '../components/index.js';
import { applyLinearDamperForce } from '../forces/index.js';

/**
 * Creates an ECS system that applies each matched entity's `LinearDamper`
 * resistive force to its connected bodies every tick, via
 * `applyLinearDamperForce`.
 *
 * Must be registered with the `EcsWorld` before `createPhysicsSyncEcsSystem`
 * (or with an earlier `registrationOrder`), so the force applied this tick
 * is reflected in the same tick's `physicsWorld.step`.
 * @param time - The time instance used to scale the force by the tick's
 * delta time.
 */
export const createLinearDamperEcsSystem = (
  time: Time,
): EcsSystem<[LinearDamperEcsComponent], void> => ({
  query: [LinearDamperId],
  run: (result) => {
    const [damperComponent] = result.components;

    applyLinearDamperForce(damperComponent.damper, time.deltaTimeInSeconds);
  },
});
