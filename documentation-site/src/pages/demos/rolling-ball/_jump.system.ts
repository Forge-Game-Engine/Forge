import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { TriggerAction } from '@forge-game-engine/forge/input';
import {
  BodyCollisionPair,
  PhysicsBodyEcsComponent,
  PhysicsBodyId,
  PhysicsWorld,
  RigidBody,
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
  pair: BodyCollisionPair,
  bodyA: RigidBody,
  bodyB: RigidBody,
): boolean {
  return (
    (pair.bodyA === bodyA && pair.bodyB === bodyB) ||
    (pair.bodyA === bodyB && pair.bodyB === bodyA)
  );
}

/**
 * Creates an ECS system that tracks whether the ball is currently touching
 * the terrain (via `physicsWorld.collisionStarts`/`collisionEnds`, which
 * `createPhysicsSyncEcsSystem` populates every tick), applies an upward
 * impulse when `jumpInput` triggers while grounded, and resets the ball back
 * to `spawnPosition` if it ever falls `respawnFallDistance` below it (for
 * example off the end of the terrain). All the work happens once per tick in
 * `beforeQuery`, rather than per matched entity, the same way
 * `createPhysicsSyncEcsSystem` steps `physicsWorld` once in its own
 * `beforeQuery`.
 *
 * Must run after `createPhysicsSyncEcsSystem`, so this tick's collision
 * events are available before this system checks them.
 * @param physicsWorld - The physics world the ball and terrain are simulated in.
 * @param playerBody - The ball's `RigidBody`.
 * @param terrainBody - The terrain's `RigidBody`.
 * @param jumpInput - The jump trigger action.
 * @param spawnPosition - The world-space position to reset the ball to if it falls too far.
 */
export const createJumpEcsSystem = (
  physicsWorld: PhysicsWorld,
  playerBody: RigidBody,
  terrainBody: RigidBody,
  jumpInput: TriggerAction,
  spawnPosition: Vector2,
): EcsSystem<[PhysicsBodyEcsComponent]> => {
  let isGrounded = false;

  return {
    query: [PhysicsBodyId],
    beforeQuery: () => {
      if (
        physicsWorld.collisionStarts.some((pair) =>
          involvesBoth(pair, playerBody, terrainBody),
        )
      ) {
        isGrounded = true;
      }

      if (
        physicsWorld.collisionEnds.some((pair) =>
          involvesBoth(pair, playerBody, terrainBody),
        )
      ) {
        isGrounded = false;
      }

      if (jumpInput.isTriggered && isGrounded) {
        playerBody.applyImpulse(new Vector2(0, jumpImpulse), Vector2.zero);
        isGrounded = false;
      }

      // Gravity pulls toward -y in this demo (see `_create-game.ts`), so
      // "fallen too far" means the ball's y has dropped well below spawn.
      if (playerBody.position.y < spawnPosition.y - respawnFallDistance) {
        playerBody.position = spawnPosition.clone();
        playerBody.velocity = Vector2.zero;
        playerBody.angularVelocity = 0;
        isGrounded = false;
      }

      return null;
    },
    run: () => {
      // All the work happens once per tick in `beforeQuery` above; nothing
      // needed per matched entity.
    },
  };
};
