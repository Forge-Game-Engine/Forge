import { positionId } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  createVector2,
  Vector2,
  vector2Clone,
  vector2Zero,
} from '@forge-game-engine/forge/math';
import { TriggerAction } from '@forge-game-engine/forge/input';
import {
  applyImpulse,
  CollisionManifold,
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

function involvesBoth(
  manifold: CollisionManifold,
  entityA: number,
  entityB: number,
): boolean {
  return (
    (manifold.entityA === entityA && manifold.entityB === entityB) ||
    (manifold.entityA === entityB && manifold.entityB === entityA)
  );
}

/**
 * Creates an ECS system that tracks whether the ball is currently touching
 * the terrain (via `collisionManifolds`, which `createNarrowPhaseEcsSystem`
 * populates every tick), applies an upward impulse when `jumpInput` triggers
 * while grounded, and resets the ball back to `spawnPosition` if it ever
 * falls `respawnFallDistance` below it (for example off the end of the
 * terrain).
 *
 * Must run after `createNarrowPhaseEcsSystem`, so this tick's collisions are
 * available before this system checks them, and before
 * `createEulerIntegrationEcsSystem`, so a jump/respawn applied this tick is
 * reflected in this same tick's integration.
 * @param collisionManifolds - The narrow-phase system's output: this tick's
 * confirmed collisions.
 * @param playerEntity - The ball's entity id.
 * @param terrainEntity - The terrain's entity id.
 * @param jumpInput - The jump trigger action.
 * @param spawnPosition - The world-space position to reset the ball to if it falls too far.
 */
export const createJumpEcsSystem = (
  collisionManifolds: CollisionManifold[],
  playerEntity: number,
  terrainEntity: number,
  jumpInput: TriggerAction,
  spawnPosition: Vector2,
): EcsSystem<[]> => ({
  query: [],
  update: (world) => {
    const position = world.getComponent(playerEntity, positionId);
    const rigidBody = world.getComponent(playerEntity, rigidBodyId);

    if (position === null || rigidBody === null) {
      return;
    }

    const isGrounded = collisionManifolds.some((manifold) =>
      involvesBoth(manifold, playerEntity, terrainEntity),
    );

    if (jumpInput.isTriggered && isGrounded) {
      applyImpulse(
        createVector2(0, jumpImpulse),
        position.world,
        position.world,
        rigidBody,
      );
    }

    // Gravity pulls toward -y in this demo (see `_create-game.ts`), so
    // "fallen too far" means the ball's y has dropped well below spawn.
    if (position.world.y < spawnPosition.y - respawnFallDistance) {
      position.world = vector2Clone(spawnPosition);
      position.local = vector2Clone(spawnPosition);
      rigidBody.velocity = vector2Zero();
      rigidBody.angularVelocity = 0;
    }
  },
});
