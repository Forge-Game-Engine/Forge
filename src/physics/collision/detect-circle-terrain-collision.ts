import type { Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';
import type { CircleShape, TerrainShape } from '../shapes/index.js';
import {
  findCircleContact,
  findClosestFace,
} from './circle-polygon-contact.js';
import type { CollisionManifold } from './collision-manifold.js';

interface BestContact {
  localNormal: Vector2;
  localContactPoint: Vector2;
  depth: number;
}

/**
 * Detects a collision between a circle-shaped body and a terrain-shaped
 * body, by running the same circle-vs-convex-polygon narrow phase used for
 * {@link detectCirclePolygonCollision} against each of the terrain's
 * segments that overlap the circle's local x-range, keeping the deepest
 * resulting contact.
 * @param circleBody - The body with a {@link CircleShape}. Becomes
 * `bodyA` of the returned manifold.
 * @param terrainBody - The body with a {@link TerrainShape}. Becomes
 * `bodyB` of the returned manifold.
 * @returns A {@link CollisionManifold} if the shapes overlap, otherwise
 * `null`.
 */
export function detectCircleTerrainCollision(
  circleBody: RigidBody,
  terrainBody: RigidBody,
): CollisionManifold | null {
  const circleShape = circleBody.shape as CircleShape;
  const terrainShape = terrainBody.shape as TerrainShape;
  const { radius } = circleShape;

  const localCenter = circleBody.position
    .subtract(terrainBody.position)
    .rotate(-terrainBody.angle);

  let best: BestContact | null = null;

  for (const segment of terrainShape.segments) {
    if (
      localCenter.x + radius < segment.minX ||
      localCenter.x - radius > segment.maxX
    ) {
      continue;
    }

    const { vertices, normals } = segment;
    const closestFace = findClosestFace(vertices, normals, localCenter, radius);

    if (closestFace === null) {
      continue;
    }

    const contact = findCircleContact(
      vertices,
      normals,
      localCenter,
      closestFace.faceIndex,
      closestFace.separation,
      radius,
    );

    if (contact === null) {
      continue;
    }

    if (best === null || contact.depth > best.depth) {
      best = {
        localNormal: contact.localNormal,
        localContactPoint: contact.localContactPoint,
        depth: contact.depth,
      };
    }
  }

  if (best === null) {
    return null;
  }

  const normal = best.localNormal.rotate(terrainBody.angle).negate();
  const contactPoint = best.localContactPoint
    .rotate(terrainBody.angle)
    .add(terrainBody.position);

  return {
    bodyA: circleBody,
    bodyB: terrainBody,
    normal,
    depth: best.depth,
    contactPoints: [contactPoint],
  };
}
