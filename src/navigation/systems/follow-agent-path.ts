import { Vector2 } from '../../math/vector2.js';
import { NavigationAgentEcsComponent } from '../components/navigation-agent-component.js';
import { arrivalTolerance } from './plan-agent-paths.js';

/**
 * Checks whether a point is past the end of a segment: past the line
 * through `b` square to the segment, as when a unit overshot a corner or
 * was pushed past it. A zero-length segment counts as passed.
 * @param a - The segment's start.
 * @param b - The segment's end.
 * @param point - The point.
 * @returns `true` if `point` is at or past `b`.
 */
const hasPassed = (a: Vector2, b: Vector2, point: Vector2): boolean =>
  (point.x - b.x) * (b.x - a.x) + (point.y - b.y) * (b.y - a.y) >= 0;

/**
 * Measures how far the agent has left to walk, up to a limit: the distance
 * to its waypoint plus the length of the path after it, stopping once the
 * sum passes `limit`.
 * @param path - The agent's path.
 * @param waypointIndex - The index of the point being walked to.
 * @param distance - The distance to that point.
 * @param limit - The length past which the rest doesn't matter.
 * @returns The distance left, or a value of at least `limit`.
 */
const measureRemaining = (
  path: readonly Vector2[],
  waypointIndex: number,
  distance: number,
  limit: number,
): number => {
  let remaining = distance;

  for (let i = waypointIndex + 1; i < path.length && remaining < limit; i++) {
    remaining += Math.hypot(
      path[i].x - path[i - 1].x,
      path[i].y - path[i - 1].y,
    );
  }

  return remaining;
};

/**
 * Walks an agent along its path for one update: moves on past each waypoint
 * it's within `arrivalRadius` of or has passed, and sets `desiredVelocity`
 * towards the next at `speed`. Over the last `arrivalRadius` of the path it
 * slows with a constant deceleration, `speed * sqrt(remaining /
 * arrivalRadius)`, which stops it in a finite time (a linear ramp only ever
 * halves the distance left). On the last segment it goes no faster than
 * lets it land on the end within `deltaSeconds`, so a game that moves it by
 * `desiredVelocity * deltaSeconds` stops exactly there. At the end of a
 * `'found'` path it's `'arrived'`; at the end of any other path, or of the
 * path it keeps walking while it waits for a new one, it just stops.
 * @param agent - The agent, with a target.
 * @param position - The agent's world position.
 * @param deltaSeconds - The duration the velocity will be applied for: the
 * fixed delta when the agent is moved by physics in the fixed-update group.
 */
export const followAgentPath = (
  agent: NavigationAgentEcsComponent,
  position: Vector2,
  deltaSeconds: number,
): void => {
  const { path, arrivalRadius, desiredVelocity } = agent;

  if (path.length === 0 || agent.status === 'arrived') {
    desiredVelocity.x = 0;
    desiredVelocity.y = 0;

    return;
  }

  const last = path.length - 1;
  let index = agent.waypointIndex;

  while (
    index < last &&
    (Math.hypot(path[index].x - position.x, path[index].y - position.y) <=
      arrivalRadius ||
      hasPassed(path[index - 1], path[index], position))
  ) {
    index++;
  }

  agent.waypointIndex = index;

  const offsetX = path[index].x - position.x;
  const offsetY = path[index].y - position.y;
  const distance = Math.hypot(offsetX, offsetY);

  if (index === last && distance <= arrivalTolerance(path[last])) {
    desiredVelocity.x = 0;
    desiredVelocity.y = 0;

    if (agent.status === 'moving' && agent.pathStatus === 'found') {
      agent.status = 'arrived';
    }

    return;
  }

  let speed = agent.speed;

  if (arrivalRadius > 0) {
    const remaining = measureRemaining(path, index, distance, arrivalRadius);

    if (remaining < arrivalRadius) {
      speed *= Math.sqrt(remaining / arrivalRadius);
    }
  }

  if (index === last && deltaSeconds > 0) {
    speed = Math.min(speed, distance / deltaSeconds);
  }

  desiredVelocity.x = (offsetX / distance) * speed;
  desiredVelocity.y = (offsetY / distance) * speed;
};
