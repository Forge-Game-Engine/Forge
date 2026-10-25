import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { TriggerAction } from '@forge-game-engine/forge/input';
import { PlayerEcsComponent, playerId } from './_player.component';

/**
 * Creates the system that asks the player to jump when the jump action is
 * pressed, by setting `jumpRequested`. The player-move system acts on it,
 * and clears it, in its next physics step.
 *
 * Register it in the default group: a trigger is pressed for exactly one
 * frame, so a system that runs once per frame sees each press once, where a
 * fixed step could miss it (a frame with no step) or see it twice (a frame
 * with two).
 * @param jumpInput - The jump action.
 * @returns The ECS system.
 */
export const createJumpInputEcsSystem = (
  jumpInput: TriggerAction,
): EcsSystem<[PlayerEcsComponent]> => ({
  query: [playerId],
  update: (_world, { components: [players] }) => {
    if (!jumpInput.isTriggered) {
      return;
    }

    for (const player of players) {
      player.jumpRequested = true;
    }
  },
});
