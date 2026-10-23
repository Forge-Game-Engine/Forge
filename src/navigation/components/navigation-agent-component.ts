import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/vector2.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import { PathStatus } from '../find-path.js';
import { PathPlanner } from '../path-planner.js';
import { assertNavigationAgentTuning } from './assert-navigation-agent-tuning.js';

/**
 * What a navigation agent is doing:
 * - `'idle'`: it has no `target`.
 * - `'planning'`: it's waiting for a path. It keeps walking the path it
 *   has, if any.
 * - `'moving'`: it's walking its path.
 * - `'arrived'`: it reached the end of a path that was found, and stays
 *   arrived until `target` changes. That's the target itself, unless the
 *   target is somewhere a unit can't stand (inside a wall, or off a grid)
 *   and the planner moved the goal to the nearest place it can: a grid
 *   planner's snapped goal, where the agent arrives at the centre of the
 *   walkable cell nearest the target. A game that needs the exact target
 *   compares the agent's position with it.
 * - `'unreachable'`: no path reaches the target. It walks to the place
 *   nearest it the path reaches, then stops.
 */
export type NavigationAgentStatus =
  'idle' | 'planning' | 'moving' | 'arrived' | 'unreachable';

/**
 * Fields of {@link NavigationAgentEcsComponent} with no sensible default;
 * callers must always provide these.
 */
export interface NavigationAgentRequiredOptions {
  /**
   * Plans the agent's paths, such as {@link createGridPathPlanner}'s or
   * {@link createWaypointPathPlanner}'s. Assigning another planner
   * re-plans.
   */
  planner: PathPlanner;

  /** The agent's top speed, in world units a second, `0` or more. */
  speed: number;
}

/**
 * Fields of {@link NavigationAgentEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface NavigationAgentDefaultedOptions {
  /**
   * Where the agent is going, in world space, or `null` to stand still.
   * Compared by value each tick, so changing it in place (`target.x = 10`)
   * and assigning a new object both re-plan. Defaults to `null`.
   */
  target: Vector2 | null;

  /**
   * How close counts as reaching a waypoint on the way, and how far before
   * the target the agent starts slowing down, in world units, `0` or more.
   * `0` turns at each waypoint and stops from full speed. The agent
   * re-plans only once it's further than this, or the planner's
   * `maxPathDistance` if that's larger, from its path. Defaults to `0`.
   */
  arrivalRadius: number;
}

/**
 * A unit that walks to a target. Game code sets `planner`, `target`,
 * `speed` and `arrivalRadius`; `createNavigationAgentEcsSystem` plans its
 * path and writes every output field, and nothing else writes them.
 *
 * The agent doesn't move its entity. It outputs `desiredVelocity`, which
 * the game applies, such as by copying it into a rigid body's `velocity`.
 */
export interface NavigationAgentEcsComponent
  extends NavigationAgentRequiredOptions, NavigationAgentDefaultedOptions {
  /** Output, written only by the agent system: what the agent is doing. */
  status: NavigationAgentStatus;

  /**
   * Output, written only by the agent system: the path being walked, in
   * world space, starting where the agent was when it was planned. A new
   * array each time a path is planned; empty when there is none.
   */
  path: readonly Vector2[];

  /**
   * Output, written only by the agent system: the index in `path` of the
   * point being walked to.
   */
  waypointIndex: number;

  /**
   * Output, written only by the agent system: the world-space velocity
   * that walks the path this tick, changed in place. Zero when the agent
   * isn't moving.
   */
  readonly desiredVelocity: Vector2;

  /**
   * Output, written only by the agent system: how the search for `path`
   * ended, or `null` before the first.
   */
  pathStatus: PathStatus | null;

  /**
   * Output, written only by the agent system: a copy of the target `path`
   * was planned for, or `null`.
   */
  plannedTarget: Vector2 | null;

  /**
   * Output, written only by the agent system: the planner `path` was
   * planned with, or `null`.
   */
  plannedPlanner: PathPlanner | null;

  /**
   * Output, written only by the agent system: that planner's `version`
   * when it planned `path`, `-1` before the first.
   */
  plannedVersion: number;

  /**
   * Output, written only by the agent system: `time.frames` when the agent
   * started waiting for a path, or `null` when it isn't waiting. Agents
   * waiting longest plan first.
   */
  requestedFrame: number | null;
}

export const navigationAgentId =
  createComponentId<NavigationAgentEcsComponent>('navigationAgent');

const defaultNavigationAgentOptions: NavigationAgentDefaultedOptions = {
  target: null,
  arrivalRadius: 0,
};

/**
 * Attaches a {@link NavigationAgentEcsComponent} to `entity`. The entity
 * also needs a `PositionEcsComponent` for the agent system to move it.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - The planner, speed, target and arrival radius. `planner`
 * and `speed` have no sensible default and must always be provided.
 * @returns The attached component, for setting its `target` and reading
 * its outputs.
 * @throws An error if `speed` or `arrivalRadius` is negative or not finite.
 */
export function addNavigationAgentComponent(
  world: EcsWorld,
  entity: number,
  options: NavigationAgentRequiredOptions &
    Partial<NavigationAgentDefaultedOptions>,
): NavigationAgentEcsComponent {
  const { planner, speed, target, arrivalRadius } = withDefaults(
    defaultNavigationAgentOptions,
    options,
  );

  assertNavigationAgentTuning(
    speed,
    arrivalRadius,
    'addNavigationAgentComponent: the agent',
  );

  const component: NavigationAgentEcsComponent = {
    planner,
    speed,
    target,
    arrivalRadius,
    status: 'idle',
    path: [],
    waypointIndex: 0,
    desiredVelocity: { x: 0, y: 0 },
    pathStatus: null,
    plannedTarget: null,
    plannedPlanner: null,
    plannedVersion: -1,
    requestedFrame: null,
  };

  return world.addComponent(entity, navigationAgentId, component);
}
