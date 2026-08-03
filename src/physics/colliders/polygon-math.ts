import {
  createVector2,
  Vector2,
  vector2Clone,
  vector2Cross,
  vector2Dot,
  vector2Normalize,
  vector2Perpendicular,
  vector2Subtract,
} from '../../math/index.js';

/**
 * Calculates the signed area of a polygon (positive for counter-clockwise
 * winding, negative for clockwise), via the shoelace formula.
 * @param vertices - The polygon's vertices, in order.
 */
export function calculateSignedArea(vertices: readonly Vector2[]): number {
  let signedArea = 0;

  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];

    signedArea += vector2Cross(current, next);
  }

  return signedArea;
}

/**
 * Calculates the centroid (center of mass, assuming uniform density) of a
 * polygon.
 * @param vertices - The polygon's vertices, in order.
 */
export function calculateCentroid(vertices: readonly Vector2[]): Vector2 {
  let centroidX = 0;
  let centroidY = 0;
  let signedArea = 0;

  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    const cross = vector2Cross(current, next);

    signedArea += cross;
    centroidX += (current.x + next.x) * cross;
    centroidY += (current.y + next.y) * cross;
  }

  const factor = 1 / (3 * signedArea);

  return createVector2(centroidX * factor, centroidY * factor);
}

/**
 * Calculates the outward-facing edge normal for each edge of a polygon.
 * @param vertices - The polygon's vertices, in order.
 */
export function calculateNormals(vertices: readonly Vector2[]): Vector2[] {
  const normals: Vector2[] = [];

  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];

    // Clone before subtracting: `current`/`next` are the caller's actual
    // vertex objects (often the same references stored on a collider), so
    // this must not mutate them.
    const edge = vector2Subtract(vector2Clone(next), current);

    normals.push(vector2Normalize(vector2Perpendicular(edge)));
  }

  return normals;
}

/**
 * Calculates the moment of inertia of a polygon about its own centroid, for
 * a given mass.
 * @param mass - The mass of the polygon.
 * @param verticesAboutCentroid - The polygon's vertices, in order, already
 * expressed relative to their own centroid.
 */
export function calculatePolygonMomentOfInertia(
  mass: number,
  verticesAboutCentroid: readonly Vector2[],
): number {
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < verticesAboutCentroid.length; i++) {
    const current = verticesAboutCentroid[i];
    const next = verticesAboutCentroid[(i + 1) % verticesAboutCentroid.length];
    const cross = Math.abs(vector2Cross(current, next));

    numerator +=
      cross *
      (vector2Dot(current, current) +
        vector2Dot(current, next) +
        vector2Dot(next, next));
    denominator += cross;
  }

  return (mass / 3) * (numerator / denominator);
}

/**
 * Calculates the area of a polygon.
 * @param vertices - The polygon's vertices, in order.
 */
export function calculateArea(vertices: readonly Vector2[]): number {
  return Math.abs(calculateSignedArea(vertices)) / 2;
}
