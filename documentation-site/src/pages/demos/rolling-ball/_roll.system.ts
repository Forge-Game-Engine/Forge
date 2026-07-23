import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Axis1dAction } from '@forge-game-engine/forge/input';
import {
  AngularVelocityMotorEcsComponent,
  AngularVelocityMotorId,
} from '@forge-game-engine/forge/physics';

/** How fast the ball's motor spins it up to, in rad/s, at full roll input. */
const maxRollSpeed = 22;

/**
 * Creates an ECS system that sets the ball's
 * `AngularVelocityMotorEcsComponent.targetVelocity` from `rollInput` every
 * tick. `createAngularVelocityMotorEcsSystem` then spends the motor's
 * `maxTorque` budget spinning the ball towards that target, and friction
 * against the terrain turns that spin into rolling motion.
 *
 * Must run before `createAngularVelocityMotorEcsSystem` (and, transitively,
 * before `createPhysicsSyncEcsSystem`), so this tick's input is reflected in
 * this tick's physics step - see the Applying Forces guide's registration
 * order caution.
 * @param rollInput - The roll axis action, positive for rightward roll.
 */
export const createRollEcsSystem = (
  rollInput: Axis1dAction,
): EcsSystem<[AngularVelocityMotorEcsComponent]> => ({
  query: [AngularVelocityMotorId],
  run: (result) => {
    const [motorComponent] = result.components;

    // A positive angular velocity here spins the ball counter-clockwise on
    // screen, which rolls it to the left - the opposite of a positive
    // `rollInput.value` (the D / right-arrow side of the binding), so the
    // sign is flipped to make D/right-arrow roll right.
    motorComponent.targetVelocity = -rollInput.value * maxRollSpeed;
  },
});
