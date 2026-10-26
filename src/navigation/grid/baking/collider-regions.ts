import { Vec2, Vector2 } from '../../../math/vector2.js';
import { ChainCollider } from '../../../physics/colliders/chain-collider.js';
import { CircleCollider } from '../../../physics/colliders/circle-collider.js';
import { ColliderType } from '../../../physics/colliders/collider.js';
import { PolygonCollider } from '../../../physics/colliders/polygon-collider.js';
import { TerrainCollider } from '../../../physics/colliders/terrain-collider.js';
import { CollisionBody } from '../../../physics/types/collision-body.js';
import { BakeRegion } from './mark-region.js';

/**
 * Moves a local-space point into world space the way physics places a
 * collider: turned by the entity's rotation, then moved by its position.
 * Scale isn't applied, since physics doesn't scale colliders either.
 * @param point - The point, in the entity's local space.
 * @param position - The entity's world position.
 * @param rotation - The entity's world rotation, in radians.
 * @returns A new `Vector2` in world space.
 */
const toWorld = (
  point: Vector2,
  position: Vector2,
  rotation: number,
): Vector2 => Vec2.add(Vec2.rotate(Vec2.clone(point), rotation), position);

const getCircleRegion = (body: CollisionBody): BakeRegion => {
  const collider = body.collider as CircleCollider;

  return {
    kind: 'disc',
    center: collider.getWorldCenter(body.position, body.rotation),
    radius: collider.radius,
  };
};

const getPolygonRegion = (body: CollisionBody): BakeRegion => {
  const collider = body.collider as PolygonCollider;

  // The constructor winds the vertices to a positive signed area, around
  // solid.
  return {
    kind: 'loops',
    loops: [collider.getWorldVertices(body.position, body.rotation)],
    outsideIsSolid: false,
  };
};

/**
 * A terrain's whole slab is solid for navigation, though bodies only collide
 * with its surface: nothing can stand inside the ground. Its silhouette is
 * the surface left to right, then the bottom edge right to left, which
 * turns `+X` towards `+Y`: a positive signed area.
 */
const getTerrainRegion = (body: CollisionBody): BakeRegion => {
  const collider = body.collider as TerrainCollider;
  const { points, bottomY } = collider;
  const silhouette = [
    ...points,
    { x: points[points.length - 1].x, y: bottomY },
    { x: points[0].x, y: bottomY },
  ];

  return {
    kind: 'loops',
    loops: [
      silhouette.map((point) => toWorld(point, body.position, body.rotation)),
    ],
    outsideIsSolid: false,
  };
};

/**
 * A chain's loops surround solid (positive signed area) or holes
 * (negative), and a lone hole is a room in unbounded solid
 * (`ChainCollider.outsideIsSolid`).
 */
const getChainRegion = (body: CollisionBody): BakeRegion => {
  const collider = body.collider as ChainCollider;

  return {
    kind: 'loops',
    loops: collider.loops.map((loop) =>
      loop.map((point) => toWorld(point, body.position, body.rotation)),
    ),
    outsideIsSolid: collider.outsideIsSolid,
  };
};

const colliderRegions: Record<
  ColliderType,
  (body: CollisionBody) => BakeRegion
> = {
  circle: getCircleRegion,
  polygon: getPolygonRegion,
  terrain: getTerrainRegion,
  chain: getChainRegion,
};

/**
 * Finds the world-space area a collider fills, placed where physics places
 * it.
 * @param body - The collider and its entity's world position and rotation.
 * @returns The region the collider fills.
 */
export const getColliderRegion = (body: CollisionBody): BakeRegion =>
  colliderRegions[body.collider.type](body);
