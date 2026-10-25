import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Axis1dAction } from '@forge-game-engine/forge/input';
import {
  AngularVelocityMotorEcsComponent,
  angularVelocityMotorId,
} from '@forge-game-engine/forge/physics';

/** How fast the ball's motor spins it up to, in rad/s, at full roll input. */
const maxRollSpeed = 22;

/**
 * Creates an ECS system that sets the ball's
 * `AngularVelocityMotorEcsComponent.targetVelocity` from `rollInput` every
 * physics step. `createAngularVelocityMotorEcsSystem` then spends the motor's
 * `maxTorque` budget spinning the ball towards that target, and friction
 * against the terrain turns that spin into rolling motion.
 *
 * Register it in the fixed-update group, before
 * `createAngularVelocityMotorEcsSystem` (and, transitively, before the
 * broad/narrow-phase and resolution systems), so each step's motor target
 * comes from the held input - see the Applying Forces guide's registration
 * order caution.
 * @param rollInput - The roll axis action, positive for rightward roll.
 */
export const createRollEcsSystem = (
  rollInput: Axis1dAction,
): EcsSystem<[AngularVelocityMotorEcsComponent]> => ({
  query: [angularVelocityMotorId],
  update: (_world, { components: [motorComponents] }) => {
    for (const motorComponent of motorComponents) {
      // A positive angular velocity spins the ball clockwise on screen,
      // which rolls it to the right, the same way as a positive
      // `rollInput.value` (the D / right-arrow side of the binding).
      motorComponent.targetVelocity = rollInput.value * maxRollSpeed;
    }
  },
});
