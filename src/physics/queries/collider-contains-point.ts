import { Vector2 } from '../../math/index.js';
import { ColliderType } from '../colliders/collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { containsPointChain } from './contains-point-chain.js';
import { containsPointCircle } from './contains-point-circle.js';
import { containsPointPolygon } from './contains-point-polygon.js';
import { containsPointTerrain } from './contains-point-terrain.js';

const containsPointTests: Record<
  ColliderType,
  (body: CollisionBody, point: Vector2) => boolean
> = {
  circle: containsPointCircle,
  polygon: containsPointPolygon,
  terrain: containsPointTerrain,
  chain: containsPointChain,
};

/**
 * Checks whether a collider, placed at a body's position and rotation,
 * contains a world-space point, its boundary included. Use it to test one
 * known entity without the broad phase; `overlapPoint` finds every
 * collider at a point.
 *
 * What "contains" means depends on the collider:
 * - a circle or polygon contains its area;
 * - a terrain contains its whole slab, between the surface and `bottomY`
 * (see `containsPointTerrain`);
 * - a chain contains its solid side, decided by its loops' winding (see
 * `containsPointChain`).
 * @param body - The collider and its entity's world position and rotation.
 * @param point - The world-space point.
 * @returns `true` if the collider contains the point.
 * @throws An error if the collider's type has no containment test, such as
 * a `Collider` subclass from outside the engine.
 */
export function colliderContainsPoint(
  body: CollisionBody,
  point: Vector2,
): boolean {
  const { type } = body.collider;

  if (!Object.hasOwn(containsPointTests, type)) {
    throw new Error(
      `colliderContainsPoint: no point containment test for collider type "${type}".`,
    );
  }

  return containsPointTests[type](body, point);
}
