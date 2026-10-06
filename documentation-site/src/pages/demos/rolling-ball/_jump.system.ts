import { positionId } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';
import { TriggerAction } from '@forge-game-engine/forge/input';
import {
  applyImpulse,
  contactsId,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';

/** The upward impulse applied on jump. */
const jumpImpulse = 500_000;

/**
 * How far below the spawn point (in world y) the ball has to fall - off the
 * end of the terrain, or through it after some unexpected physics glitch -
 * before it's treated as "lost" and reset back to the start, rather than
 * falling forever off-camera.
 */
const respawnFallDistance = 2000;

/**
 * Creates an ECS system that tracks whether the ball is currently touching
 * the terrain (via the ball's `ContactsEcsComponent`, which
 * `createNarrowPhaseEcsSystem` fills every tick), applies an upward impulse when `jumpInput` triggers
 * while grounded, and resets the ball back to `spawnPosition` if it ever
 * falls `respawnFallDistance` below it (for example off the end of the
 * terrain).
 *
 * Must run after `createNarrowPhaseEcsSystem`, so this tick's contacts are
 * available before this system checks them, and before
 * `createEulerIntegrationEcsSystem`, so a jump/respawn applied this tick is
 * reflected in this same tick's integration.
 * @param playerEntity - The ball's entity id.
 * @param terrainEntity - The terrain's entity id.
 * @param jumpInput - The jump trigger action.
 * @param spawnPosition - The world-space position to reset the ball to if it falls too far.
 */
export const createJumpEcsSystem = (
  playerEntity: number,
  terrainEntity: number,
  jumpInput: TriggerAction,
  spawnPosition: Vector2,
): EcsSystem<[]> => ({
  query: [],
  update: (world) => {
    const position = world.getComponent(playerEntity, positionId);
    const rigidBody = world.getComponent(playerEntity, rigidBodyId);
    const contacts = world.getComponent(playerEntity, contactsId);

    if (position === null || rigidBody === null || contacts === null) {
      return;
    }

    const isGrounded = contacts.touching.includes(terrainEntity);

    if (jumpInput.isTriggered && isGrounded) {
      // The ball's circle is centered on its entity, so its position is
      // its center of mass: a jump through it adds no spin.
      applyImpulse(
        world,
        playerEntity,
        { x: 0, y: jumpImpulse },
        position.world,
      );
    }

    // Gravity pulls toward -y in this demo (see `_create-game.ts`), so
    // "fallen too far" means the ball's y has dropped well below spawn.
    if (position.local.y < spawnPosition.y - respawnFallDistance) {
      position.local = Vec2.clone(spawnPosition);
      rigidBody.velocity = Vec2.zero;
      rigidBody.angularVelocity = 0;
    }
  },
});
