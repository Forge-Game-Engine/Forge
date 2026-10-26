import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { findBroadPhase } from '../broad-phase/create-broad-phase.js';
import { ColliderType } from '../colliders/collider.js';
import { segmentReachesBox } from '../collision/flat-bounds.js';
import { CollisionBody } from '../types/collision-body.js';
import { RaycastHit, RaycastShapeHit } from '../types/raycast-hit.js';
import {
  defaultPhysicsQueryFilter,
  getQueryComponentAccessors,
  PhysicsQueryFilter,
  readQueryCandidate,
} from './physics-query-filter.js';
import { raycastChain } from './raycast-chain.js';
import { raycastCircle } from './raycast-circle.js';
import { raycastPolygon } from './raycast-polygon.js';
import { raycastTerrain } from './raycast-terrain.js';
import { withDefaults } from '../../utilities/with-defaults.js';

const raycastDetectors: Record<
  ColliderType,
  (body: CollisionBody, start: Vector2, end: Vector2) => RaycastShapeHit | null
> = {
  circle: raycastCircle,
  polygon: raycastPolygon,
  terrain: raycastTerrain,
  chain: raycastChain,
};

/**
 * Options for {@link raycast}: the {@link PhysicsQueryFilter} every physics
 * query takes, and whether to sort the hits.
 */
export interface RaycastOptions extends PhysicsQueryFilter {
  /**
   * When `true`, results are ordered by distance from `start`, so the first
   * result is the nearest entity along the ray. Pass `false` to skip the
   * sort if you only need a yes/no check, or intend to find the closest hit
   * yourself: the hits then come in the order the broad phase's trees
   * reached them, which says nothing about distance or entity. Defaults to
   * `true`.
   */
  sort: boolean;
}

const defaultRaycastOptions: RaycastOptions = {
  ...defaultPhysicsQueryFilter,
  sort: true,
};

/**
 * Casts a line segment from `start` to `end` against the colliders in
 * `world`'s broad phase, and returns one hit for each collider it crosses,
 * at the intersection closest to `start`. Use it for hitscan weapons,
 * line-of-sight checks, and ground or wall detection.
 *
 * The segment walks the broad phase's trees (see `createBroadPhase`), the
 * way Box2D's and Godot's ray casts walk theirs, so only colliders whose
 * tree box the segment reaches are looked at, and only those whose tight
 * bounds it reaches have their exact shape tested. A ray's cost grows with
 * the number of colliders near it, not with every collider in the world.
 *
 * It tests each collider at its simulated pose. A collider on a `'dynamic'`
 * or `'kinematic'` rigid body is tested at the body's `position.local` and
 * `rotation.local`, against bounds computed from that pose: its pose at the
 * end of the latest fixed step, or wherever game code has since put it.
 * Bodies are drawn between their last two fixed steps, so a hit on a moving
 * body can be up to one step ahead of where it's drawn. Every other
 * collider is tested at its `world` transform, against its
 * `ColliderEcsComponent.aabb`; an entity without a
 * `RotationEcsComponent` is treated as unrotated.
 *
 * The trees and `aabb`s are what `createBroadPhaseEcsSystem` left them on
 * its last run, so a collider added since then can't be hit yet, and one
 * removed since then isn't hit. The broad phase runs before the step moves
 * the bodies, so a moving body's tree box is where the step started it: a
 * ray cast after the step can miss a body that has since moved further than
 * the tree's `aabbMargin` away from that box.
 * @param world - The ECS world whose broad phase and colliders to cast
 * against.
 * @param start - The ray's world-space start point.
 * @param end - The ray's world-space end point.
 * @param options - Sorting and filtering; see {@link RaycastOptions}.
 * @returns A {@link RaycastHit} for each collider the ray crosses.
 * @throws An error if `start` or `end` isn't finite, or if the world has no
 * broad phase (see `createBroadPhase`) or more than one.
 */
export function raycast(
  world: EcsWorld,
  start: Vector2,
  end: Vector2,
  options: Partial<RaycastOptions> = {},
): RaycastHit[] {
  if (
    !Number.isFinite(start.x) ||
    !Number.isFinite(start.y) ||
    !Number.isFinite(end.x) ||
    !Number.isFinite(end.y)
  ) {
    throw new Error(
      `raycast: the ray from (${start.x}, ${start.y}) to (${end.x}, ${end.y}) must have finite ends.`,
    );
  }

  const { sort, ...filter } = withDefaults(defaultRaycastOptions, options);
  const { staticTree, movingTree } = findBroadPhase(world);
  const accessors = getQueryComponentAccessors(world);

  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  // The collider's tight box, packed the way `segmentReachesBox` reads it.
  const bounds = new Float64Array(4);
  const hits: RaycastHit[] = [];

  // Every hit is returned, so the segment is never clipped: each call
  // returns `maxFraction` unchanged.
  const visit = (
    _proxyId: number,
    maxFraction: number,
    entity: number,
  ): number => {
    const candidate = readQueryCandidate(entity, accessors, filter);

    if (candidate === null) {
      return maxFraction;
    }

    const { body } = candidate;
    const { min, max } = candidate.bounds;

    bounds[0] = min.x;
    bounds[1] = min.y;
    bounds[2] = max.x;
    bounds[3] = max.y;

    if (!segmentReachesBox(bounds, 0, start.x, start.y, deltaX, deltaY, 1)) {
      return maxFraction;
    }

    const hit = raycastDetectors[body.collider.type](body, start, end);

    if (hit !== null) {
      hits.push({ entity, ...hit });
    }

    return maxFraction;
  };

  staticTree.raycast(start, end, visit);
  movingTree.raycast(start, end, visit);

  if (sort) {
    hits.sort((a, b) => a.distance - b.distance);
  }

  return hits;
}
