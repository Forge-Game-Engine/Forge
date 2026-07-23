import { Vector2 } from '../../math/index.js';

/**
 * Calculates the signed area of a polygon (twice the actual area). Positive
 * for a polygon whose vertices are wound in this engine's canonical
 * "outward-normal" order (see {@link PolygonShape}'s constructor), negative
 * for the reverse winding.
 * @param vertices - The polygon's vertices, in order.
 * @returns The signed area of the polygon.
 */
export function calculateSignedArea(vertices: readonly Vector2[]): number {
  let signedArea = 0;

  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];

    signedArea += current.cross(next);
  }

  return signedArea;
}

/**
 * Calculates the centroid (center of mass, for a uniform-density polygon)
 * of a simple polygon.
 * @param vertices - The polygon's vertices, in order.
 * @returns The centroid of the polygon.
 */
export function calculateCentroid(vertices: readonly Vector2[]): Vector2 {
  let centroidX = 0;
  let centroidY = 0;
  let signedArea = 0;

  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    const cross = current.cross(next);

    signedArea += cross;
    centroidX += (current.x + next.x) * cross;
    centroidY += (current.y + next.y) * cross;
  }

  const factor = 1 / (3 * signedArea);

  return new Vector2(centroidX * factor, centroidY * factor);
}

/**
 * Calculates the outward-facing edge normal for each edge of a polygon
 * (the edge from vertex `i` to vertex `i + 1`), assuming vertices are
 * wound in this engine's canonical order (see {@link calculateSignedArea}).
 * @param vertices - The polygon's vertices, in order.
 * @returns The polygon's edge normals, in the same order as `vertices`.
 */
export function calculateNormals(vertices: readonly Vector2[]): Vector2[] {
  const normals: Vector2[] = [];

  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    const edge = next.subtract(current);

    normals.push(edge.perpendicular().normalize());
  }

  return normals;
}

/**
 * Calculates the moment of inertia of a polygon for a given mass, about its
 * own center of mass.
 * @param mass - The mass of the body the polygon belongs to.
 * @param verticesAboutCentroid - The polygon's vertices, in order, relative
 * to its own centroid (i.e. already translated so their average, weighted
 * by {@link calculateCentroid}, is the origin).
 * @returns The moment of inertia of the polygon.
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
    const cross = Math.abs(current.cross(next));

    numerator +=
      cross * (current.dot(current) + current.dot(next) + next.dot(next));
    denominator += cross;
  }

  return (mass / 3) * (numerator / denominator);
}
