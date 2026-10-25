import { PositionEcsComponent, positionId } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import { findBroadPhase } from '../broad-phase/create-broad-phase.js';
import { aabbsOverlap } from '../collision/aabb-overlap.js';
import {
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import { Aabb } from '../types/aabb.js';
import {
  defaultPhysicsQueryFilter,
  PhysicsQueryFilter,
  readQueryCandidate,
} from './physics-query-filter.js';

/**
 * Finds every entity whose collider's bounds
 * ({@link ColliderEcsComponent.aabb}) overlap `aabb`, touching included.
 * Only bounds are tested, not shapes: a circle is found when the box only
 * overlaps a corner of its bounding square. Use it for box selection and
 * "what's nearby" checks, and `overlapPoint` for an exact test at a point.
 *
 * The box walks the broad phase's trees (see `createBroadPhase`), the way
 * Box2D's `b2World_OverlapAABB` walks its own, so a query's cost grows with
 * the number of colliders near the box, not with every collider in the
 * world. The trees and `aabb`s are what `createBroadPhaseEcsSystem` left
 * them on its last run, so a collider added since then isn't found yet, and
 * one removed since then isn't found either.
 * @param world - The ECS world whose broad phase and colliders to query.
 * @param aabb - The world-space box to test. Its sides may be infinite: a
 * box from `-Infinity` to `Infinity` on both axes finds every collider the
 * filter lets through.
 * @param filter - Which colliders the query can find; see
 * {@link PhysicsQueryFilter}.
 * @returns The entities, in no particular order. Each appears once.
 * @throws An error if a coordinate of `aabb` is `NaN` or `aabb.min` is
 * greater than `aabb.max` on an axis, or if the world has no broad phase
 * (see `createBroadPhase`) or more than one.
 */
export function queryAabb(
  world: EcsWorld,
  aabb: Aabb,
  filter: Partial<PhysicsQueryFilter> = {},
): number[] {
  const { min, max } = aabb;

  if (!(min.x <= max.x && min.y <= max.y)) {
    throw new Error(
      `queryAabb: the box from (${min.x}, ${min.y}) to (${max.x}, ${max.y}) must have min <= max and no NaN coordinate.`,
    );
  }

  const resolvedFilter = withDefaults(defaultPhysicsQueryFilter, filter);
  const { staticTree, movingTree } = findBroadPhase(world);
  const getPosition =
    world.getComponentAccessor<PositionEcsComponent>(positionId);
  const getCollider =
    world.getComponentAccessor<ColliderEcsComponent>(colliderId);
  const found: number[] = [];

  const visit = (_proxyId: number, entity: number): boolean => {
    const candidate = readQueryCandidate(
      entity,
      getCollider,
      getPosition,
      resolvedFilter,
    );

    // The trees hold fat boxes, so a candidate's own bounds may still miss.
    if (candidate !== null && aabbsOverlap(candidate.collider.aabb, aabb)) {
      found.push(entity);
    }

    return true;
  };

  staticTree.query(aabb, visit);
  movingTree.query(aabb, visit);

  return found;
}
