import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { PolygonShape } from '../shapes/index.js';

/**
 * Options for {@link createTerrainBodies}.
 */
export interface CreateTerrainBodiesOptions {
  /**
   * The thickness of each terrain segment, perpendicular to its direction.
   */
  thickness?: number;

  /**
   * The friction coefficient applied to every segment body.
   */
  friction?: number;

  /**
   * The restitution (bounciness) applied to every segment body.
   */
  restitution?: number;
}

const defaultCreateTerrainBodiesOptions = {
  thickness: 1,
  friction: 0.3,
  restitution: 0.2,
};

/**
 * Builds a chain of static, convex {@link RigidBody} segments approximating
 * the curve described by `points`, since {@link PolygonShape} only supports
 * convex geometry and cannot represent a curved or concave terrain outline
 * directly. Each consecutive pair of points becomes one thin rectangular
 * body, so keep segments short relative to the radius of anything expected
 * to roll over them (for example a wheel) - a body can catch on the vertex
 * where two segments meet if segments are long relative to its size.
 * @param points - The terrain's centerline, sampled in order. Generating
 * these points (for example from noise or a height field) is left to the
 * caller, since it's game-specific.
 * @param options - Options applied to every generated segment body.
 * @returns One static `RigidBody` per consecutive pair of `points`,
 * unregistered with any `PhysicsWorld`.
 * @throws An error if fewer than 2 points are provided.
 */
export function createTerrainBodies(
  points: readonly Vector2[],
  options: CreateTerrainBodiesOptions = {},
): RigidBody[] {
  if (points.length < 2) {
    throw new Error(
      `createTerrainBodies requires at least 2 points, received ${points.length}.`,
    );
  }

  const { thickness, friction, restitution } = {
    ...defaultCreateTerrainBodiesOptions,
    ...options,
  };

  const bodies: RigidBody[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const segment = end.subtract(start);
    const length = segment.magnitude();

    if (length === 0) {
      continue;
    }

    bodies.push(
      new RigidBody({
        shape: PolygonShape.rectangle(length, thickness),
        position: start.add(end).multiply(0.5),
        angle: Math.atan2(segment.y, segment.x),
        isStatic: true,
        friction,
        restitution,
      }),
    );
  }

  return bodies;
}
