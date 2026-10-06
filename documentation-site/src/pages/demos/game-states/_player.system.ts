import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Axis1dAction } from '@forge-game-engine/forge/input';
import { clamp } from '@forge-game-engine/forge/math';
import { PlayerEcsComponent, playerId } from './_player.component';

/**
 * Moves the basket left and right. Registered with `inState(state,
 * 'playing')`, so the basket stops where it is once the round ends.
 */
export const createPlayerEcsSystem = (
  moveInput: Axis1dAction,
  time: Time,
): EcsSystem<[PlayerEcsComponent, PositionEcsComponent]> => ({
  name: 'player',
  query: [playerId, positionId],
  update: (_world, { components: [players, positions] }) => {
    for (let i = 0; i < players.length; i++) {
      const { speed, minX, maxX } = players[i];
      const position = positions[i];

      position.local.x = clamp(
        position.local.x + moveInput.value * speed * time.deltaTimeInSeconds,
        minX,
        maxX,
      );
    }
  },
});
