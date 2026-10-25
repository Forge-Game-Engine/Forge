import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { findBroadPhase } from '../broad-phase/create-broad-phase.js';
import { getColliderRotation } from '../collider-rotation.js';
import { ColliderType } from '../colliders/collider.js';
import { segmentReachesBox } from '../collision/flat-bounds.js';
import {
  allCollisionCategories,
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import { CollisionBody } from '../types/collision-body.js';
import { RaycastHit, RaycastShapeHit } from '../types/raycast-hit.js';
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
 * Options for {@link raycast}.
 */
export interface RaycastOptions {
  /**
   * When `true`, results are ordered by distance from `start`, so the first
   * result is the nearest entity along the ray. Pass `false` to skip the
   * sort if you only need a yes/no check, or intend to find the closest hit
   * yourself: the hits then come in the order the broad phase's trees
   * reached them, which says nothing about distance or entity. Defaults to
   * `true`.
   */
  sort: boolean;

  /**
   * The collider categories the ray can hit: a collider is tested only if
   * its `category` shares a bit with this mask. Defaults to
   * {@link allCollisionCategories}.
   */
  mask: number;

  /**
   * When `true`, the ray also hits sensor colliders. Defaults to `false`,
   * so a ray aimed at walls passes through trigger zones.
   */
  includeSensors: boolean;
}

const defaultRaycastOptions: RaycastOptions = {
  sort: true,
  mask: allCollisionCategories,
  includeSensors: false,
};

/**
 * Casts a line segment from `start` to `end` against the colliders in
 * `world`'s broad phase, and returns one hit for each collider it crosses,
 * at the intersection closest to `start`. Use it for hitscan weapons,
 * line-of-sight checks, and ground or wall detection.
 *
 * The segment walks the broad phase's trees (see `createBroadPhase`), the
 * way Box2D's and Godot's ray casts walk theirs, so only colliders whose
 * tree box the segment reaches are looked at, and only those whose
 * {@link ColliderEcsComponent.aabb} it reaches have their exact shape
 * tested. A ray's cost grows with the number of colliders near it, not
 * with every collider in the world.
 *
 * The trees and `aabb`s are what `createBroadPhaseEcsSystem` left them on
 * its last run, so a collider added since then can't be hit yet, and one
 * removed since then isn't hit. The exact test uses each collider's current
 * `PositionEcsComponent.world` and rotation; an entity without a
 * `RotationEcsComponent` is treated as unrotated.
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

  const { sort, mask, includeSensors } = withDefaults(
    defaultRaycastOptions,
    options,
  );
  const { staticTree, movingTree } = findBroadPhase(world);
  const getPosition =
    world.getComponentAccessor<PositionEcsComponent>(positionId);
  const getCollider =
    world.getComponentAccessor<ColliderEcsComponent>(colliderId);
  // Rotation is optional for colliders (an entity without one is treated as
  // unrotated), so it's read per entity rather than required.
  const getRotation =
    world.getComponentAccessor<RotationEcsComponent>(rotationId);

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
    const collider = getCollider(entity);
    const position = getPosition(entity);

    // The trees are as of the broad phase's last run, so an entity in them
    // may have lost its collider or position, or been removed, since.
    if (
      collider === null ||
      position === null ||
      (collider.category & mask) === 0 ||
      (collider.sensor && !includeSensors)
    ) {
      return maxFraction;
    }

    const { min, max } = collider.aabb;

    // A collider component added since the broad phase ran (replacing the
    // one its proxy was made from) still has its empty starting box, which
    // the slab test below would wrongly let through.
    if (!(min.x <= max.x && min.y <= max.y)) {
      return maxFraction;
    }

    bounds[0] = min.x;
    bounds[1] = min.y;
    bounds[2] = max.x;
    bounds[3] = max.y;

    if (!segmentReachesBox(bounds, 0, start.x, start.y, deltaX, deltaY, 1)) {
      return maxFraction;
    }

    const body: CollisionBody = {
      position: position.world,
      rotation: getColliderRotation(getRotation(entity)),
      collider: collider.collider,
    };
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
