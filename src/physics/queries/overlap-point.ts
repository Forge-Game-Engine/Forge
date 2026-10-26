import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import { findBroadPhase } from '../broad-phase/create-broad-phase.js';
import { aabbsOverlap } from '../collision/aabb-overlap.js';
import { Aabb } from '../types/aabb.js';
import { colliderContainsPoint } from './collider-contains-point.js';
import {
  defaultPhysicsQueryFilter,
  getQueryComponentAccessors,
  PhysicsQueryFilter,
  readQueryCandidate,
} from './physics-query-filter.js';

/**
 * Finds every entity whose collider's shape contains `point`, its boundary
 * included. Use it for mouse picking ("which body is under the cursor"),
 * or to check that a spawn point is clear. See `colliderContainsPoint` for
 * what "contains" means for each collider type: a terrain contains its
 * whole slab, and a chain its solid side.
 *
 * It tests each collider at its simulated pose, like `raycast`. A collider
 * on a `'dynamic'` or `'kinematic'` rigid body is tested at the body's
 * `position.local` and `rotation.local`: its pose at the end of the latest
 * fixed step, or wherever game code has since put it. Bodies are drawn
 * between their last two fixed steps, so a moving body can be found up to
 * one step ahead of where it's drawn. Every other collider is tested at its
 * `world` transform; an entity without a `RotationEcsComponent` is treated
 * as unrotated.
 *
 * A zero-size box at `point` walks the broad phase's trees (see
 * `createBroadPhase`), the way Godot's `intersect_point` and Box2D's
 * overlap queries walk theirs. Only colliders whose bounds at the tested
 * pose (`ColliderEcsComponent.aabb` for a static collider) contain
 * `point` have their exact shape tested. So a `ChainCollider` whose outside
 * is solid (`ChainCollider.outsideIsSolid`), which is solid beyond its
 * loops too, is only found at points inside its bounds, though
 * `colliderContainsPoint` and navigation baking call the points beyond
 * them solid.
 *
 * The trees and `aabb`s are what `createBroadPhaseEcsSystem` left them on
 * its last run, so a collider added since then isn't found yet, and one
 * removed since then isn't found either. The broad phase runs before the
 * step moves the bodies, so a moving body's tree box is where the step
 * started it: a query after the step can miss a body that has since moved
 * further than the tree's `aabbMargin` away from that box.
 * @param world - The ECS world whose broad phase and colliders to query.
 * @param point - The world-space point.
 * @param filter - Which colliders the query can find; see
 * {@link PhysicsQueryFilter}.
 * @returns The entities, in no particular order. Each appears once.
 * @throws An error if `point` isn't finite, if a collider's type has no
 * containment test (see `colliderContainsPoint`), or if the world has no
 * broad phase (see `createBroadPhase`) or more than one.
 */
export function overlapPoint(
  world: EcsWorld,
  point: Vector2,
  filter: Partial<PhysicsQueryFilter> = {},
): number[] {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(
      `overlapPoint: the point (${point.x}, ${point.y}) must be finite.`,
    );
  }

  const resolvedFilter = withDefaults(defaultPhysicsQueryFilter, filter);
  const { staticTree, movingTree } = findBroadPhase(world);
  const accessors = getQueryComponentAccessors(world);
  const box: Aabb = {
    min: { x: point.x, y: point.y },
    max: { x: point.x, y: point.y },
  };
  const found: number[] = [];

  const visit = (_proxyId: number, entity: number): boolean => {
    const candidate = readQueryCandidate(entity, accessors, resolvedFilter);

    // The trees hold fat boxes, so a candidate's own bounds may still miss.
    if (
      candidate !== null &&
      aabbsOverlap(candidate.bounds, box) &&
      colliderContainsPoint(candidate.body, point)
    ) {
      found.push(entity);
    }

    return true;
  };

  staticTree.query(box, visit);
  movingTree.query(box, visit);

  return found;
}
