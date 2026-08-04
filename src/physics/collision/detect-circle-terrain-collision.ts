import { Vec2, Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import {
  findCircleContact,
  findClosestFace,
} from './circle-polygon-contact.js';

interface BestContact {
  localNormal: Vector2;
  localContactPoint: Vector2;
  depth: number;
  segmentIndex: number;
}

/**
 * Detects a collision between a circle-collider body and a
 * terrain-collider body, by running the same circle-vs-convex-polygon
 * narrow phase used for {@link detectCirclePolygonCollision} against each
 * of the terrain's segments that overlap the circle's local x-range,
 * keeping the deepest resulting contact.
 * @param circleBody - The body with a {@link CircleCollider}.
 * @param terrainBody - The body with a {@link TerrainCollider}.
 * @returns A collision manifold (entity ids not yet populated, normal
 * pointing from `circleBody` toward `terrainBody`) if the shapes overlap,
 * otherwise `null`.
 */
export function detectCircleTerrainCollision(
  circleBody: CollisionBody,
  terrainBody: CollisionBody,
): Omit<CollisionManifold, 'entityA' | 'entityB'> | null {
  const circleCollider = circleBody.collider as CircleCollider;
  const terrainCollider = terrainBody.collider as TerrainCollider;
  const { radius } = circleCollider;

  // Clone before adding: `circleBody.position` is the entity's live world
  // position, so this must not mutate it.
  const localCenter = Vec2.rotate(
    Vec2.subtract(
      Vec2.add(Vec2.clone(circleBody.position), circleCollider.offset),
      terrainBody.position,
    ),
    -terrainBody.rotation,
  );

  let best: BestContact | null = null;

  for (
    let segmentIndex = 0;
    segmentIndex < terrainCollider.segments.length;
    segmentIndex++
  ) {
    const segment = terrainCollider.segments[segmentIndex];

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
        segmentIndex,
      };
    }
  }

  if (best === null) {
    return null;
  }

  // `best.localNormal`/`best.localContactPoint` are always fresh clones
  // (see circle-polygon-contact.ts), so mutating them in place here is safe.
  const normal = Vec2.negate(
    Vec2.rotate(best.localNormal, terrainBody.rotation),
  );
  const contactPoint = Vec2.add(
    Vec2.rotate(best.localContactPoint, terrainBody.rotation),
    terrainBody.position,
  );

  return {
    normal,
    depth: best.depth,
    contactPoints: [contactPoint],
    featureIds: [best.segmentIndex],
  };
}
