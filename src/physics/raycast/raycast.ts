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
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../components/rigidbody-component.js';
import { isStaticBody } from '../is-static-body.js';
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

// The pose a ray tests a collider at: the simulated pose, like the physics
// queries of other engines. A dynamic or kinematic body is always a root
// entity, so its `local` is its world pose at the end of the latest fixed
// step (or wherever game code has since put it). Its `world` is where it's
// drawn, which outside a fixed step can be up to a step behind. Every other
// collider is never moved by physics, so its `world` is its pose.
function getSimulatedBody(
  position: PositionEcsComponent,
  rotation: RotationEcsComponent | null,
  rigidBody: RigidBodyEcsComponent | null,
  collider: ColliderEcsComponent,
): CollisionBody {
  if (!isStaticBody(rigidBody)) {
    return {
      position: position.local,
      rotation: rotation ? rotation.local : 0,
      collider: collider.collider,
    };
  }

  return {
    position: position.world,
    rotation: getColliderRotation(rotation),
    collider: collider.collider,
  };
}

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
 * {@link ColliderEcsComponent.aabb}; an entity without a
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
  const getRigidBody =
    world.getComponentAccessor<RigidBodyEcsComponent>(rigidBodyId);

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

    const rigidBody = getRigidBody(entity);
    const body = getSimulatedBody(
      position,
      getRotation(entity),
      rigidBody,
      collider,
    );
    const { min, max } = isStaticBody(rigidBody)
      ? collider.aabb
      : collider.collider.computeAabb(body.position, body.rotation);

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
