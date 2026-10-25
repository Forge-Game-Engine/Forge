import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Axis1dAction } from '@forge-game-engine/forge/input';
import {
  CollisionManifold,
  RigidBodyEcsComponent,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import { PlayerEcsComponent, playerId } from './_player.component';

/** The inputs the player moves with. */
export interface PlayerMoveInputs {
  /** `-1` walks left, `1` walks right. */
  walkInput: Axis1dAction;
}

/**
 * A contact counts as standing on the ground when the ground pushes the
 * player up more than sideways: floors, and slopes up to 45 degrees.
 */
const groundNormalY = -0.7;

/**
 * Whether one of this physics step's contacts between the player and the ground
 * layer pushes the player up. A manifold's normal points from `entityA`
 * towards `entityB`, so it pushes `entityB` along the normal and `entityA`
 * against it.
 */
const isStandingOnGround = (
  manifolds: readonly CollisionManifold[],
  player: number,
  ground: number,
): boolean =>
  manifolds.some(({ entityA, entityB, normal }) => {
    if (entityA === ground && entityB === player) {
      return normal.y < groundNormalY;
    }

    return (
      entityA === player && entityB === ground && -normal.y < groundNormalY
    );
  });

/**
 * Creates the system that walks the player and jumps it when the
 * jump-input system has set `jumpRequested`.
 *
 * It sets the velocity the solver starts from, so register it in the
 * fixed-update group, after `createNarrowPhaseEcsSystem`, which finds the
 * step's contacts, and before `createCollisionResolutionEcsSystem`, which
 * then stops the player's motion into the ground and walls in the same
 * step. It clears `jumpRequested` every step, so a press made in mid-air
 * doesn't fire on landing.
 * @param manifolds - The narrow phase's contacts for the step.
 * @param inputs - The walk action.
 * @returns The ECS system.
 */
export const createPlayerMoveEcsSystem = (
  manifolds: readonly CollisionManifold[],
  inputs: PlayerMoveInputs,
): EcsSystem<[PlayerEcsComponent, RigidBodyEcsComponent]> => ({
  query: [playerId, rigidBodyId],
  update: (_world, { entities, components: [players, rigidBodies] }) => {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const player = players[i];
      const rigidBody = rigidBodies[i];
      const { jumpRequested } = player;

      player.jumpRequested = false;

      const walk = inputs.walkInput.value;
      const isGrounded = isStandingOnGround(manifolds, entity, player.ground);

      rigidBody.velocity.x = walk * player.walkSpeed;

      // The player is frictionless, so it doesn't stick to walls it's
      // pushed against. Standing still on a slope, gravity would slide it
      // down, so a grounded player with no walk input stops, the way
      // Godot's CharacterBody2D does with `floor_stop_on_slope`.
      if (isGrounded && walk === 0) {
        rigidBody.velocity.y = 0;
      }

      if (isGrounded && jumpRequested) {
        rigidBody.velocity.y = -player.jumpSpeed;
      }
    }
  },
});
