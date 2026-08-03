import {
  vector2Add,
  vector2Clone,
  vector2Negate,
  vector2Rotate,
  vector2Subtract,
} from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import {
  findCircleContact,
  findClosestFace,
} from './circle-polygon-contact.js';

/**
 * Detects a collision between a circle-collider body and a
 * polygon-collider body.
 * @param circleBody - The body with a {@link CircleCollider}.
 * @param polygonBody - The body with a {@link PolygonCollider}.
 * @returns A collision manifold (entity ids not yet populated, normal
 * pointing from `circleBody` toward `polygonBody`) if the shapes overlap,
 * otherwise `null`.
 */
export function detectCirclePolygonCollision(
  circleBody: CollisionBody,
  polygonBody: CollisionBody,
): Omit<CollisionManifold, 'entityA' | 'entityB'> | null {
  const circleCollider = circleBody.collider as CircleCollider;
  const polygonCollider = polygonBody.collider as PolygonCollider;
  const { radius } = circleCollider;
  const { vertices, normals } = polygonCollider;

  // Clone before adding: `circleBody.position` is the entity's live world
  // position, so this must not mutate it.
  const localCenter = vector2Rotate(
    vector2Subtract(
      vector2Add(vector2Clone(circleBody.position), circleCollider.offset),
      polygonBody.position,
    ),
    -polygonBody.rotation,
  );

  const closestFace = findClosestFace(vertices, normals, localCenter, radius);

  if (closestFace === null) {
    return null;
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
    return null;
  }

  // `contact.localNormal`/`contact.localContactPoint` are always fresh
  // clones (see circle-polygon-contact.ts), so mutating them in place here
  // is safe.
  const normal = vector2Negate(
    vector2Rotate(contact.localNormal, polygonBody.rotation),
  );
  const contactPoint = vector2Add(
    vector2Rotate(contact.localContactPoint, polygonBody.rotation),
    polygonBody.position,
  );

  return {
    normal,
    depth: contact.depth,
    contactPoints: [contactPoint],
    featureIds: [0],
  };
}
