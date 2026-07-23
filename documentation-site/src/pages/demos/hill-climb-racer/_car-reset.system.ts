import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { CarResetEcsComponent, carResetId } from './_car-reset.component';

/**
 * Teleports every body in each matched entity's `CarResetEcsComponent.bodies`
 * back to its recorded spawn transform, with zero velocity, on the tick
 * `restartInput` fires. Must run before `createPhysicsSyncEcsSystem` in the
 * same tick, so a restart applied this tick is reflected in the same tick's
 * `physicsWorld.step` (see the Applying Forces guide's registration-order
 * caution).
 */
export const createCarResetEcsSystem = (): EcsSystem<
  [CarResetEcsComponent]
> => ({
  query: [carResetId],
  run: (result) => {
    const [carReset] = result.components;

    if (!carReset.restartInput.isTriggered) {
      return;
    }

    for (const { body, initialPosition, initialAngle } of carReset.bodies) {
      body.position = initialPosition.clone();
      body.angle = initialAngle;
      body.velocity = Vector2.zero;
      body.angularVelocity = 0;
    }
  },
});
