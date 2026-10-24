import { Vector2 } from '../../math/vector2.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import { assertMaxPathDistance, buildAgentPath } from '../agent-path.js';
import { PathPlanner, PlannedPath, PlanPathOptions } from '../path-planner.js';
import { findWaypointPath } from './find-waypoint-path.js';
import { WaypointGraph } from './waypoint-graph.js';

/** Options for {@link createWaypointPathPlanner}. */
export interface WaypointPathPlannerOptions {
  /**
   * See {@link PathPlanner.maxPathDistance}. A waypoint graph doesn't know
   * how wide its connections are, so it defaults to `Infinity`: an agent
   * pushed off a road walks straight back to its next point. Set it to
   * about a road's width to re-plan instead.
   */
  maxPathDistance?: number;
}

const defaultWaypointPathPlannerOptions = { maxPathDistance: Infinity };

const defaultPlanPathOptions = {
  maxExpanded: Infinity,
  keepPartialPath: true,
};

/**
 * Creates a path planner over a waypoint graph. It finds a route with
 * {@link findWaypointPath}, and the unit walks from where it is to the
 * enabled point nearest it, along the route, and, when the route reaches
 * the point nearest the target, on to the target itself. A route that
 * doesn't reach it ends at the reached point nearest the target.
 * @param graph - The graph to plan over. Its `version` is the planner's.
 * @param options - How far a unit may drift from its path.
 * @returns The planner.
 * @throws An error if `maxPathDistance` isn't more than `0`.
 */
export function createWaypointPathPlanner(
  graph: WaypointGraph,
  options?: WaypointPathPlannerOptions,
): PathPlanner {
  const { maxPathDistance } = withDefaults(
    defaultWaypointPathPlannerOptions,
    options,
  );

  assertMaxPathDistance('createWaypointPathPlanner', maxPathDistance);

  return {
    get version(): number {
      return graph.version;
    },
    maxPathDistance,
    planPath: (
      fromWorld: Vector2,
      toWorld: Vector2,
      planOptions?: PlanPathOptions,
    ): PlannedPath => {
      const { maxExpanded, keepPartialPath } = withDefaults(
        defaultPlanPathOptions,
        planOptions,
      );
      const result = findWaypointPath(graph, fromWorld, toWorld, {
        maxExpanded,
      });
      const { status, expanded } = result;

      if (status === 'limitReached' && !keepPartialPath) {
        return { status, points: [], expanded };
      }

      return {
        status,
        points: buildAgentPath(
          fromWorld,
          result.points,
          toWorld,
          status === 'found',
        ),
        expanded,
      };
    },
  };
}
