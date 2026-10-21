import { positionId } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Axis1dAction, TriggerAction } from '@forge-game-engine/forge/input';
import { Vec2 } from '@forge-game-engine/forge/math';
import {
  CollisionManifold,
  ContactsEcsComponent,
  contactsId,
  RigidBodyEcsComponent,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import { PlayerEcsComponent, playerId } from './_player.component';

/** The inputs the player moves with. */
export interface PlayerMoveInputs {
  /** `-1` walks left, `1` walks right. */
  walkInput: Axis1dAction;

  /** Starts a jump while the player stands on the ground. */
  jumpInput: TriggerAction;
}

/**
 * A contact counts as standing on the ground when the ground pushes the
 * player up more than sideways: floors, and slopes up to 45 degrees.
 */
const groundNormalY = -0.7;

/**
 * Whether one of this tick's contacts between the player and the ground
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
 * Creates the system that walks and jumps the player, and puts it back at
 * its spawn point when it touches the water layer or falls out of the map.
 *
 * It sets the velocity the solver starts from, so register it after
 * `createNarrowPhaseEcsSystem`, which finds this tick's contacts, and
 * before `createCollisionResolutionEcsSystem`, which then stops the
 * player's motion into the ground and walls on the same tick.
 * @param manifolds - The narrow phase's contacts for this tick.
 * @param inputs - The walk and jump actions.
 * @returns The ECS system.
 */
export const createPlayerMoveEcsSystem = (
  manifolds: readonly CollisionManifold[],
  inputs: PlayerMoveInputs,
): EcsSystem<
  [PlayerEcsComponent, RigidBodyEcsComponent, ContactsEcsComponent]
> => ({
  query: [playerId, rigidBodyId, contactsId],
  update: (
    world,
    { entities, components: [players, rigidBodies, contacts] },
  ) => {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const player = players[i];
      const rigidBody = rigidBodies[i];
      const position = world.getComponent(entity, positionId);

      if (!position) {
        continue;
      }

      // The water layer is a sensor: it's reported in `touching`, and
      // nothing pushes the player out of it.
      if (
        contacts[i].touching.includes(player.water) ||
        position.world.y > player.fallLimit
      ) {
        position.local = Vec2.clone(player.spawn);
        rigidBody.velocity = Vec2.zero;

        continue;
      }

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

      if (isGrounded && inputs.jumpInput.isTriggered) {
        rigidBody.velocity.y = -player.jumpSpeed;
      }
    }
  },
});
