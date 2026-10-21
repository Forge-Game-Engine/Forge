import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import { PlayerEcsComponent, playerId } from './_player.component';

/**
 * Creates the system that keeps the player upright. Friction on the box's
 * corners turns it as it walks, and physics engines usually offer a locked
 * rotation for a character's body (Box2D's `fixedRotation`, Unity's
 * `freezeRotation`). Forge's rigid bodies don't have one yet, so this
 * system cancels the turn the solver gave the player before it's
 * integrated.
 *
 * Register it after `createCollisionResolutionEcsSystem` and before
 * `createEulerIntegrationEcsSystem`.
 * @returns The ECS system.
 */
export const createUprightEcsSystem = (): EcsSystem<
  [PlayerEcsComponent, RigidBodyEcsComponent]
> => ({
  query: [playerId, rigidBodyId],
  update: (_world, { components: [, rigidBodies] }) => {
    for (const rigidBody of rigidBodies) {
      rigidBody.angularVelocity = 0;
    }
  },
});
