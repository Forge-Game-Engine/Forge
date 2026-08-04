import { Vec2, Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { RaycastShapeHit } from '../types/raycast-hit.js';

/**
 * Casts a ray segment against a circle-collider body.
 * @param circleBody - The body with a {@link CircleCollider}.
 * @param start - The ray's world-space start point.
 * @param end - The ray's world-space end point.
 * @returns The intersection closest to `start`, or `null` if the segment
 * from `start` to `end` doesn't cross the circle.
 */
export function raycastCircle(
  circleBody: CollisionBody,
  start: Vector2,
  end: Vector2,
): RaycastShapeHit | null {
  const circleCollider = circleBody.collider as CircleCollider;
  // Clone before adding: `circleBody.position` is the entity's live world
  // position, so this must not mutate it.
  const center = Vec2.add(
    Vec2.clone(circleBody.position),
    circleCollider.offset,
  );
  const direction = Vec2.subtract(Vec2.clone(end), start);
  const a = Vec2.dot(direction, direction);

  if (a === 0) {
    return null;
  }

  // Clone before subtracting: `start` is the caller's own ray point, so this
  // must not mutate it.
  const startToCenter = Vec2.subtract(Vec2.clone(start), center);
  const b = 2 * Vec2.dot(startToCenter, direction);
  const c =
    Vec2.dot(startToCenter, startToCenter) -
    circleCollider.radius * circleCollider.radius;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return null;
  }

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const enteringParameter = (-b - sqrtDiscriminant) / (2 * a);
  const exitingParameter = (-b + sqrtDiscriminant) / (2 * a);
  const rayParameter =
    enteringParameter >= 0 && enteringParameter <= 1
      ? enteringParameter
      : exitingParameter;

  if (rayParameter < 0 || rayParameter > 1) {
    return null;
  }

  const point = Vec2.add(
    Vec2.multiply(Vec2.clone(direction), rayParameter),
    start,
  );
  const normal = Vec2.normalize(Vec2.subtract(Vec2.clone(point), center));

  return { point, normal, distance: Vec2.distanceTo(start, point) };
}
