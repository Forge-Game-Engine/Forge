import { PositionEcsComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { formatEntity } from '../../ecs/entity.js';
import { Vector2 } from '../../math/vector2.js';
import { assertNavigationAgentTuning } from '../components/assert-navigation-agent-tuning.js';
import { NavigationAgentEcsComponent } from '../components/navigation-agent-component.js';

/**
 * How far from a point still counts as on it: a relative float tolerance
 * that only absorbs rounding in the last tick's movement.
 * @param point - The point.
 * @returns The tolerance, in world units.
 */
export const arrivalTolerance = (point: Vector2): number =>
  1e-6 * Math.max(1, Math.abs(point.x), Math.abs(point.y));

/**
 * Measures how far a point is from a segment.
 * @param point - The point.
 * @param a - The segment's start.
 * @param b - The segment's end.
 * @returns The distance from `point` to the nearest point of the segment.
 */
const distanceToSegment = (point: Vector2, a: Vector2, b: Vector2): number => {
  const segmentX = b.x - a.x;
  const segmentY = b.y - a.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  const along =
    lengthSquared === 0
      ? 0
      : ((point.x - a.x) * segmentX + (point.y - a.y) * segmentY) /
        lengthSquared;
  const t = Math.min(1, Math.max(0, along));

  return Math.hypot(
    point.x - (a.x + segmentX * t),
    point.y - (a.y + segmentY * t),
  );
};

/**
 * Clears an agent with no target: it stands still and has no path.
 * @param agent - The agent.
 */
const resetAgent = (agent: NavigationAgentEcsComponent): void => {
  agent.status = 'idle';
  agent.path = [];
  agent.waypointIndex = 0;
  agent.desiredVelocity.x = 0;
  agent.desiredVelocity.y = 0;
  agent.pathStatus = null;
  agent.plannedTarget = null;
  agent.plannedPlanner = null;
  agent.plannedVersion = -1;
  agent.requestedFrame = null;
};

/**
 * Checks whether the agent stands at the end of its path.
 * @param agent - The agent, with a non-empty path.
 * @param position - The agent's world position.
 * @returns `true` if it's walking to its last point and within its arrival
 * radius of it (or on it, for a radius of `0`).
 */
const isAtPathEnd = (
  agent: NavigationAgentEcsComponent,
  position: Vector2,
): boolean => {
  const last = agent.path.length - 1;
  const end = agent.path[last];

  return (
    agent.waypointIndex === last &&
    Math.hypot(end.x - position.x, end.y - position.y) <=
      Math.max(agent.arrivalRadius, arrivalTolerance(end))
  );
};

/**
 * Checks whether the agent has been pushed off its path: whether it's
 * further from the segment it's walking than the planner allows. The agent
 * turns onto the next segment up to `arrivalRadius` from a corner, so it
 * allows at least that.
 * @param agent - The agent, with a non-empty path.
 * @param position - The agent's world position.
 * @returns `true` if the agent has drifted off its path.
 */
const hasDrifted = (
  agent: NavigationAgentEcsComponent,
  position: Vector2,
): boolean => {
  const { path, waypointIndex } = agent;
  const allowed = Math.max(agent.planner.maxPathDistance, agent.arrivalRadius);

  // A path of one point has no segment; distance from the point itself.
  const from = path[Math.max(0, waypointIndex - 1)];

  return distanceToSegment(position, from, path[waypointIndex]) > allowed;
};

/**
 * Checks whether an agent that isn't waiting for a path needs one.
 * @param agent - The agent, with a target.
 * @param target - The agent's target.
 * @param position - The agent's world position.
 * @returns `true` if its target, planner or the planner's `version`
 * changed, it drifted off its path, or it reached the end of a path cut
 * short by the node limit.
 */
const needsPlan = (
  agent: NavigationAgentEcsComponent,
  target: Vector2,
  position: Vector2,
): boolean => {
  const { plannedTarget, planner } = agent;

  if (
    plannedTarget === null ||
    plannedTarget.x !== target.x ||
    plannedTarget.y !== target.y
  ) {
    return true;
  }

  // An arrived agent stays put until it's sent somewhere else.
  if (agent.status === 'arrived') {
    return false;
  }

  if (
    agent.plannedPlanner !== planner ||
    agent.plannedVersion !== planner.version
  ) {
    return true;
  }

  // Nothing to walk (such as a waypoint graph with no enabled point) has no
  // segment to drift from and no end to reach.
  if (agent.path.length === 0) {
    return false;
  }

  if (hasDrifted(agent, position)) {
    return true;
  }

  return agent.pathStatus === 'limitReached' && isAtPathEnd(agent, position);
};

/**
 * Starts and keeps the tick's plan requests: clears agents with no target,
 * records the frame an agent starts waiting for a path in, and lists every
 * agent that's waiting.
 * @param entities - The tick's entities.
 * @param agents - Their agents.
 * @param positions - Their positions.
 * @param frame - `time.frames`.
 * @returns The batch indices of the agents waiting for a path.
 * @throws An error naming the entity if an agent's target isn't finite, or
 * its speed or arrival radius is negative or not finite.
 */
export const collectPlanRequests = (
  entities: readonly number[],
  agents: readonly NavigationAgentEcsComponent[],
  positions: readonly PositionEcsComponent[],
  frame: number,
): number[] => {
  const pending: number[] = [];

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const { target } = agent;

    if (target === null) {
      resetAgent(agent);

      continue;
    }

    const subject = `Navigation agent entity ${formatEntity(entities[i])}`;

    if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) {
      throw new Error(
        `${subject} has a target of (${target.x}, ${target.y}), it must be finite.`,
      );
    }

    assertNavigationAgentTuning(agent.speed, agent.arrivalRadius, subject);

    if (
      agent.requestedFrame === null &&
      needsPlan(agent, target, positions[i].world)
    ) {
      agent.requestedFrame = frame;
    }

    if (agent.requestedFrame !== null) {
      agent.status = 'planning';
      pending.push(i);
    }
  }

  return pending;
};

/**
 * Plans paths for waiting agents within one shared node budget, longest
 * waiting first, then the entity created first. A search cut short by the
 * shared budget is thrown away and keeps its place in line, so it's first
 * next tick and gets the whole budget. A search that used the whole budget
 * is kept: it would never finish within it, so its partial path is the
 * best the agent gets.
 * @param world - The world, for the entities' creation order.
 * @param entities - The tick's entities.
 * @param agents - Their agents.
 * @param positions - Their positions.
 * @param pending - The batch indices of the agents waiting for a path.
 * @param maxExpandedPerFrame - The node budget every search shares.
 */
export const planAgentPaths = (
  world: EcsWorld,
  entities: readonly number[],
  agents: readonly NavigationAgentEcsComponent[],
  positions: readonly PositionEcsComponent[],
  pending: number[],
  maxExpandedPerFrame: number,
): void => {
  pending.sort(
    (a, b) =>
      (agents[a].requestedFrame ?? 0) - (agents[b].requestedFrame ?? 0) ||
      world.getCreationSequence(entities[a]) -
        world.getCreationSequence(entities[b]),
  );

  let budget = maxExpandedPerFrame;

  for (const index of pending) {
    if (budget <= 0) {
      return;
    }

    const agent = agents[index];
    const { planner, target } = agent;

    if (target === null) {
      continue;
    }

    const whole = budget === maxExpandedPerFrame;
    const result = planner.planPath(positions[index].world, target, {
      maxExpanded: budget,
      keepPartialPath: whole,
    });

    budget -= result.expanded;

    if (result.status === 'limitReached' && !whole) {
      continue;
    }

    agent.path = result.points;
    agent.waypointIndex = result.points.length > 1 ? 1 : 0;
    agent.pathStatus = result.status;
    agent.status =
      result.status === 'unreachable' || result.points.length === 0
        ? 'unreachable'
        : 'moving';
    agent.plannedTarget = { x: target.x, y: target.y };
    agent.plannedPlanner = planner;
    agent.plannedVersion = planner.version;
    agent.requestedFrame = null;
  }
};
