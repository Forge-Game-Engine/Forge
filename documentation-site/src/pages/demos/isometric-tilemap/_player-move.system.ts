import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Axis2dAction } from '@forge-game-engine/forge/input';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import { PlayerEcsComponent, playerId } from './_player.component';

/**
 * Creates the system that walks the player along the screen's axes: up the
 * screen is `-Y` in the world, as it is for the keyboard axis.
 *
 * It sets the velocity the solver starts from, so register it in the
 * fixed-update group before `createCollisionResolutionEcsSystem`, which
 * stops the player's motion into the walls and the water in the same
 * physics step.
 * @param moveInput - The walk axis, Y-down like the world.
 * @returns The ECS system.
 */
export const createPlayerMoveEcsSystem = (
  moveInput: Axis2dAction,
): EcsSystem<[PlayerEcsComponent, RigidBodyEcsComponent]> => ({
  query: [playerId, rigidBodyId],
  update: (_world, { components: [players, rigidBodies] }) => {
    const { x, y } = moveInput.value;

    // Diagonals are no faster than straight lines.
    const scale = Math.max(Math.hypot(x, y), 1);

    for (let i = 0; i < players.length; i++) {
      const { speed } = players[i];
      const { velocity } = rigidBodies[i];

      velocity.x = (x / scale) * speed;
      velocity.y = (y / scale) * speed;
    }
  },
});
