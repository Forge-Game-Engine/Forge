import { PositionEcsComponent } from '../../common/index.js';
import {
  allCollisionCategories,
  ColliderEcsComponent,
} from '../components/collider-component.js';

/**
 * Which colliders a physics query (`raycast`, `queryAabb`, `overlapPoint`)
 * can find. Every query filters the same way, so a filter written for one
 * finds the same colliders in another.
 */
export interface PhysicsQueryFilter {
  /**
   * The collider categories the query can find: a collider is found only
   * if its `category` shares a bit with this mask. The collider's own
   * `mask` isn't read. Defaults to {@link allCollisionCategories}.
   */
  mask: number;

  /**
   * When `true`, the query also finds sensor colliders. Defaults to
   * `false`, so a query aimed at bodies ignores trigger zones.
   */
  includeSensors: boolean;
}

/**
 * The filter every physics query starts from: every category, no sensors.
 */
export const defaultPhysicsQueryFilter: PhysicsQueryFilter = {
  mask: allCollisionCategories,
  includeSensors: false,
};

/**
 * A broad-phase tree candidate a query goes on to test.
 */
export interface QueryCandidate {
  collider: ColliderEcsComponent;
  position: PositionEcsComponent;
}

/**
 * Reads a broad-phase tree candidate's collider and position, or returns
 * `null` when the query must skip it.
 *
 * The trees are as of the broad phase's last run, so an entity in them may
 * have lost its collider or position, or been removed, since. A collider
 * component added since then (replacing the one its proxy was made from)
 * still has the empty box it starts with (`min` at `Infinity`, `max` at
 * `-Infinity`), which a box with infinite sides would otherwise overlap.
 * @param entity - The entity the tree's proxy holds.
 * @param getCollider - Reads an entity's collider component.
 * @param getPosition - Reads an entity's position component.
 * @param filter - The query's filter.
 * @returns The entity's collider and position, or `null` if it's gone, the
 * filter rejects it, or its `aabb` is still empty.
 */
export function readQueryCandidate(
  entity: number,
  getCollider: (entity: number) => ColliderEcsComponent | null,
  getPosition: (entity: number) => PositionEcsComponent | null,
  filter: PhysicsQueryFilter,
): QueryCandidate | null {
  const collider = getCollider(entity);
  const position = getPosition(entity);

  if (
    collider === null ||
    position === null ||
    (collider.category & filter.mask) === 0 ||
    (collider.sensor && !filter.includeSensors)
  ) {
    return null;
  }

  const { min, max } = collider.aabb;

  if (!(min.x <= max.x && min.y <= max.y)) {
    return null;
  }

  return { collider, position };
}
