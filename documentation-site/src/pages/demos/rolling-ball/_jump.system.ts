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
 * `createNarrowPhaseEcsSystem` fills every physics step), applies an upward
 * impulse when `jumpInput` triggers while grounded, and resets the ball back
 * to `spawnPosition` if it ever falls `respawnFallDistance` below it (for
 * example off the end of the terrain).
 *
 * Register it in the default group, after the fixed steps: a trigger is
 * pressed for exactly one frame, so a system that runs once per frame sees
 * each press once, where a fixed step could miss it or see it twice. It
 * reads `touching`, the contacts after the frame's last step, which is a
 * state and safe to read once per frame. The jump's velocity and a respawn's
 * `local` position reach the simulation at the next fixed step.
 *
 * The fall check reads the ball's `local` position, which is current
 * whenever this runs (the ball has no parent). The jump passes the ball's
 * `position.world` as the impulse point because `applyImpulse` measures the
 * lever arm from the center of mass it finds from `position.world` too: the
 * same pose on both sides gives no lever arm, so the jump adds no spin.
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
        { x: 0, y: -jumpImpulse },
        position.world,
      );
    }

    // Gravity pulls toward +y (see `_create-game.ts`), so "fallen too far"
    // means the ball's y has grown well past spawn.
    if (position.local.y > spawnPosition.y + respawnFallDistance) {
      position.local = Vec2.clone(spawnPosition);
      rigidBody.velocity = Vec2.zero;
      rigidBody.angularVelocity = 0;
    }
  },
});
