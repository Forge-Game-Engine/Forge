import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Axis2dAction } from '@forge-game-engine/forge/input';
import {
  PlayerEcsComponent,
  playerId,
} from '../components/player-component.js';

/**
 * A system is the logic that runs every frame. Its `query` lists the
 * components it works on, and `update` receives every entity that has all
 * of them, so this system moves each entity with a player and a position
 * component in the direction the `move` action points.
 * @param move - The action WASD and the arrow keys drive.
 * @param time - The game's clock, to move the same distance per second at
 * any frame rate.
 * @returns The system, to add to the world.
 */
export const createPlayerMovementEcsSystem = (
  move: Axis2dAction,
  time: Time,
): EcsSystem<[PlayerEcsComponent, PositionEcsComponent]> => ({
  name: 'player-movement',
  query: [playerId, positionId],
  update: (_world, { components: [players, positions] }) => {
    for (let i = 0; i < players.length; i++) {
      const distance = players[i].speed * time.deltaTimeInSeconds;

      // Game code moves an entity by writing its `local` position. The
      // transform system then works out where that puts it in the world.
      // `+y` is down the screen, so the up key gives `move.value.y` = -1.
      positions[i].local.x += move.value.x * distance;
      positions[i].local.y += move.value.y * distance;
    }
  },
});
