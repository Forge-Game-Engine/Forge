import { PositionEcsComponent, positionId, Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import {
  NavigationAgentEcsComponent,
  navigationAgentId,
} from '../components/navigation-agent-component.js';
import { followAgentPath } from './follow-agent-path.js';
import { collectPlanRequests, planAgentPaths } from './plan-agent-paths.js';

/** Options for {@link createNavigationAgentEcsSystem}. */
export interface NavigationAgentSystemOptions {
  /**
   * The most nodes every path search in one tick may expand between them,
   * a positive integer or `Infinity`, so a crowd of agents planning at once
   * spreads over several ticks instead of stalling one. Agents that don't
   * get a search this tick keep their place in line for the next. Defaults
   * to `2048`, about a millisecond of searching on an 8-way grid on a
   * desktop machine: a full search of a 45 x 45 grid, or a path across
   * open ground about as many cells long.
   */
  maxExpandedPerFrame?: number;
}

const defaultNavigationAgentSystemOptions = { maxExpandedPerFrame: 2048 };

/**
 * Creates an ECS system that plans and follows the paths of navigation
 * agents: every entity with a `NavigationAgentEcsComponent` and a
 * `PositionEcsComponent`.
 *
 * Each tick it first finds the agents that need a path: a new or changed
 * `target`, a different `planner` or a change to the planner's `version`
 * (a wall moved), drifting further from the path than the planner's
 * `maxPathDistance` (or the agent's `arrivalRadius`, if that's larger), or
 * reaching the end of a path cut short by the node limit. Those agents
 * plan in the order they started waiting, then the order their entities
 * were created, sharing `maxExpandedPerFrame` nodes between them; the rest
 * wait for a later tick, still walking the path they have. Then every agent
 * moves on along its path and gets a `desiredVelocity` towards its next
 * waypoint at `speed`, slowing over the last `arrivalRadius` to stop on the
 * end of its path.
 *
 * It reads the agent's inputs and `position.world`, and writes only the
 * agent's output fields. It doesn't move the entity: the game applies
 * `desiredVelocity`, such as by copying it into a rigid body's `velocity`.
 * Register it after `createTransformEcsSystem`, so it steers from this
 * tick's position, and after anything that sets targets or changes the
 * grid or graph; then the game's system that applies `desiredVelocity`,
 * then the physics systems.
 * @param time - The time instance whose frame count orders plan requests
 * and whose frame duration stops agents exactly on their target.
 * @param options - The planning budget.
 * @returns The navigation agent ECS system.
 * @throws An error if `maxExpandedPerFrame` isn't a positive integer or
 * `Infinity`. Its `update` throws, naming the entity, if an agent's target
 * isn't finite or its speed or arrival radius is negative or not finite.
 */
export const createNavigationAgentEcsSystem = (
  time: Time,
  options?: NavigationAgentSystemOptions,
): EcsSystem<[NavigationAgentEcsComponent, PositionEcsComponent]> => {
  const { maxExpandedPerFrame } = withDefaults(
    defaultNavigationAgentSystemOptions,
    options,
  );

  if (
    maxExpandedPerFrame !== Infinity &&
    (!Number.isInteger(maxExpandedPerFrame) || maxExpandedPerFrame < 1)
  ) {
    throw new Error(
      `createNavigationAgentEcsSystem: maxExpandedPerFrame must be a positive integer or Infinity, received ${maxExpandedPerFrame}.`,
    );
  }

  return {
    query: [navigationAgentId, positionId],
    update: (world, { entities, components: [agents, positions] }) => {
      const pending = collectPlanRequests(
        entities,
        agents,
        positions,
        time.frames,
      );

      planAgentPaths(
        world,
        entities,
        agents,
        positions,
        pending,
        maxExpandedPerFrame,
      );

      for (let i = 0; i < agents.length; i++) {
        if (agents[i].target !== null) {
          followAgentPath(
            agents[i],
            positions[i].world,
            time.deltaTimeInSeconds,
          );
        }
      }
    },
  };
};
