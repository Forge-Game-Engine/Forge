import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  NavigationAgentEcsComponent,
  navigationAgentId,
} from '@forge-game-engine/forge/navigation';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';

/**
 * Creates the system that moves each unit along its path: it copies the
 * navigation agent's `desiredVelocity` into the unit's rigid body, and
 * physics moves the unit and pushes it out of walls and other units.
 *
 * Register it in the fixed-update group, after
 * `createNavigationAgentEcsSystem` and before the physics systems, so the
 * agent's velocity is the one physics integrates over the same step.
 * @returns The ECS system.
 */
export const createApplyVelocityEcsSystem = (): EcsSystem<
  [NavigationAgentEcsComponent, RigidBodyEcsComponent]
> => ({
  query: [navigationAgentId, rigidBodyId],
  update: (_world, { components: [agents, bodies] }) => {
    for (let i = 0; i < agents.length; i++) {
      bodies[i].velocity.x = agents[i].desiredVelocity.x;
      bodies[i].velocity.y = agents[i].desiredVelocity.y;
    }
  },
});
