import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { ResetEcsComponent, resetId } from './_reset.component';

/**
 * Teleports each matched entity's `body` back to its recorded initial
 * position and velocity every `intervalSeconds`, replaying the same "just
 * hit a bump" disturbance on a loop. Must run before
 * `createPhysicsSyncEcsSystem` in the same tick so a reset applied this tick
 * is reflected in the same tick's `physicsWorld.step` (see the Applying
 * Forces guide's registration-order caution).
 */
export const createResetEcsSystem = (
  time: Time,
): EcsSystem<[ResetEcsComponent]> => ({
  query: [resetId],
  run: (result) => {
    const [reset] = result.components;

    reset.elapsedSeconds += time.deltaTimeInSeconds;

    if (reset.elapsedSeconds < reset.intervalSeconds) {
      return;
    }

    reset.elapsedSeconds = 0;
    reset.body.position = reset.initialPosition.clone();
    reset.body.velocity = reset.initialVelocity.clone();
  },
});
