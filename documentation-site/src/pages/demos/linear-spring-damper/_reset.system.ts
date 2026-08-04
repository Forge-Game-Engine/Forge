import { positionId, Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Vec2 } from '@forge-game-engine/forge/math';
import { rigidBodyId } from '@forge-game-engine/forge/physics';
import { ResetEcsComponent, resetId } from './_reset.component';

/**
 * Teleports each matched entity back to its recorded initial position and
 * velocity every `intervalSeconds`, replaying the same "just hit a bump"
 * disturbance on a loop. Must run before whatever system resolves
 * spring/damper forces this tick, so a reset applied this tick is reflected
 * in the same tick's force calculation.
 */
export const createResetEcsSystem = (
  time: Time,
): EcsSystem<[ResetEcsComponent]> => ({
  query: [resetId],
  update: (world, { components: [resets] }) => {
    for (const reset of resets) {
      reset.elapsedSeconds += time.deltaTimeInSeconds;

      if (reset.elapsedSeconds < reset.intervalSeconds) {
        continue;
      }

      reset.elapsedSeconds = 0;

      const position = world.getComponent(reset.entity, positionId);
      const rigidBody = world.getComponent(reset.entity, rigidBodyId);

      if (position === null || rigidBody === null) {
        continue;
      }

      position.world = Vec2.clone(reset.initialPosition);
      position.local = Vec2.clone(reset.initialPosition);
      rigidBody.velocity = Vec2.clone(reset.initialVelocity);
    }
  },
});
