import {
  PositionEcsComponent,
  positionId,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Vec2 } from '@forge-game-engine/forge/math';
import {
  ContactsEcsComponent,
  contactsId,
  RigidBodyEcsComponent,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import { PlayerEcsComponent, playerId } from './_player.component';

/**
 * Creates the system that puts the player back at its spawn point, at
 * rest, when it touches the water layer or falls out of the map.
 *
 * Register it in the fixed-update group before that group's
 * `createTransformEcsSystem`. Moving the player is a teleport, not motion:
 * the transform pass copies the new `local` position into `world` before
 * the step's physics systems run, so the step finds its contacts at the
 * spawn point. Teleported later in the step, the player would be resolved
 * and integrated against contacts found where it fell.
 *
 * It reads `touching` from the previous step's contacts, since this step's
 * narrow phase hasn't run yet, and the fall from `position.local`: the
 * player is a root body, and its `world` is a step old until the transform
 * pass.
 * @returns The ECS system.
 */
export const createPlayerRespawnEcsSystem = (): EcsSystem<
  [
    PlayerEcsComponent,
    PositionEcsComponent,
    RigidBodyEcsComponent,
    ContactsEcsComponent,
  ]
> => ({
  query: [playerId, positionId, rigidBodyId, contactsId],
  update: (
    _world,
    { entities, components: [players, positions, rigidBodies, contacts] },
  ) => {
    for (let i = 0; i < entities.length; i++) {
      const player = players[i];
      const position = positions[i];

      // The water layer is a sensor: it's reported in `touching`, and
      // nothing pushes the player out of it.
      if (
        contacts[i].touching.includes(player.water) ||
        position.local.y > player.fallLimit
      ) {
        position.local = Vec2.clone(player.spawn);
        rigidBodies[i].velocity = Vec2.zero;
      }
    }
  },
});
