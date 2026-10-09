import { Vec2, Vector2 } from '../../math/index.js';

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

    signedArea += Vec2.cross(current, next);
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
    const cross = Vec2.cross(current, next);

    signedArea += cross;
    centroidX += (current.x + next.x) * cross;
    centroidY += (current.y + next.y) * cross;
  }

  const factor = 1 / (3 * signedArea);

  return { x: centroidX * factor, y: centroidY * factor };
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
    const edge = Vec2.subtract(Vec2.clone(next), current);

    normals.push(Vec2.normalize(Vec2.perpendicular(edge)));
  }

  return normals;
}

/**
 * Calculates the polar moment of inertia of a uniform-density polygon about
 * its own centroid, for a given mass. A rectangle gets `m(w² + h²) / 12`.
 *
 * The polygon is split into a fan of triangles from the centroid. Triangle
 * `(0, pᵢ, pᵢ₊₁)` has twice-area `cᵢ = pᵢ × pᵢ₊₁` and polar moment
 * `ρ · cᵢ · (pᵢ·pᵢ + pᵢ·pᵢ₊₁ + pᵢ₊₁·pᵢ₊₁) / 12` about the fan's apex. The
 * mass is `ρ · Σcᵢ / 2`, so `ρ = 2m / Σcᵢ`, which gives `m / 6` times the
 * area-weighted sum. `cᵢ` keeps its sign, so a triangle that faces away
 * from the centroid (in a concave polygon such as a terrain silhouette)
 * subtracts its share, and either winding order gives the same result.
 * @param mass - The mass of the polygon.
 * @param verticesAboutCentroid - The polygon's vertices, in order, already
 * expressed relative to their own centroid.
 * @returns The moment of inertia about the centroid.
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
    const cross = Vec2.cross(current, next);

    numerator +=
      cross *
      (Vec2.dot(current, current) +
        Vec2.dot(current, next) +
        Vec2.dot(next, next));
    denominator += cross;
  }

  return (mass / 6) * (numerator / denominator);
}

/**
 * Calculates the area of a polygon.
 * @param vertices - The polygon's vertices, in order.
 */
export function calculateArea(vertices: readonly Vector2[]): number {
  return Math.abs(calculateSignedArea(vertices)) / 2;
}
