import { Vec2, Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { raycastCircle } from '../raycast/raycast-circle.js';
import { CollisionBody } from '../types/collision-body.js';
import { SweepHit } from '../types/sweep-hit.js';

/**
 * Sweeps a circle from `startPosition` to `endPosition` against a static
 * circle body, finding the earliest time of impact (TOI) in the swept
 * translation, if any. A moving circle of radius `r1` first touches a
 * static circle of radius `r2` exactly when the moving circle's *center*
 * first comes within `r1 + r2` of the static circle's center - so this
 * shrinks the swept shape down to a ray from the moving circle's center and
 * reuses {@link raycastCircle} against the static circle inflated by the
 * moving circle's own radius, the same Minkowski-sum technique
 * `sweepCirclePolygon`/`sweepCircleTerrain` use against polygon/terrain
 * targets.
 * @param circleBody - The moving body; only its {@link CircleCollider} (for
 * `radius`/`offset`) is used - `startPosition`/`endPosition` give the
 * swept trajectory, not `circleBody.position`.
 * @param staticCircleBody - The static body with a {@link CircleCollider}
 * being swept against.
 * @param startPosition - The circle's world-space position at the start of
 * the swept translation (before `circleBody.collider`'s `offset` is
 * applied).
 * @param endPosition - The circle's world-space position at the end of the
 * swept translation (before `circleBody.collider`'s `offset` is applied).
 * @returns The earliest {@link SweepHit}, or `null` if the circle never
 * touches the static circle along the swept translation. A `t` of `0` means
 * the circle already overlaps the static circle at `startPosition`.
 */
export function sweepCircleCircle(
  circleBody: CollisionBody,
  staticCircleBody: CollisionBody,
  startPosition: Vector2,
  endPosition: Vector2,
): SweepHit | null {
  const movingCollider = circleBody.collider as CircleCollider;
  const staticCollider = staticCircleBody.collider as CircleCollider;

  // Clone before adding: `startPosition`/`endPosition`/`staticCircleBody
  // .position` are the caller's own points, so this must not mutate them.
  const sweepStart = Vec2.add(Vec2.clone(startPosition), movingCollider.offset);
  const sweepEnd = Vec2.add(Vec2.clone(endPosition), movingCollider.offset);
  const staticCenter = Vec2.add(
    Vec2.clone(staticCircleBody.position),
    staticCollider.offset,
  );

  const distanceAtStart = Vec2.distanceTo(sweepStart, staticCenter);

  if (distanceAtStart <= staticCollider.radius + movingCollider.radius) {
    const normal =
      distanceAtStart === 0
        ? { x: 1, y: 0 }
        : Vec2.normalize(Vec2.subtract(Vec2.clone(sweepStart), staticCenter));
    const point = Vec2.add(
      Vec2.multiply(Vec2.clone(normal), staticCollider.radius),
      staticCenter,
    );

    return { point, normal, t: 0 };
  }

  const totalDistance = Vec2.distanceTo(sweepStart, sweepEnd);

  if (totalDistance === 0) {
    return null;
  }

  const inflatedBody: CollisionBody = {
    position: staticCenter,
    rotation: 0,
    collider: new CircleCollider(staticCollider.radius + movingCollider.radius),
  };
  const hit = raycastCircle(inflatedBody, sweepStart, sweepEnd);

  if (hit === null) {
    return null;
  }

  // `hit.normal` is a fresh clone owned by this call (see raycast-circle.ts).
  const point = Vec2.add(
    Vec2.multiply(Vec2.clone(hit.normal), staticCollider.radius),
    staticCenter,
  );

  return {
    point,
    normal: hit.normal,
    t: Math.min(1, Math.max(0, hit.distance / totalDistance)),
  };
}
