import { Vector2 } from '../../math/index.js';
import { Aabb } from '../types/aabb.js';
import { Collider } from './collider.js';
import {
  calculateArea,
  calculateCentroid,
  calculateNormals,
  calculatePolygonMomentOfInertia,
  calculateSignedArea,
} from './polygon-math.js';

const EPSILON = 1e-9;

function validateConvexity(vertices: readonly Vector2[]): void {
  const vertexCount = vertices.length;

  for (let i = 0; i < vertexCount; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertexCount];
    const afterNext = vertices[(i + 2) % vertexCount];

    const edge = next.subtract(current);
    const nextEdge = afterNext.subtract(next);

    if (edge.cross(nextEdge) < -EPSILON) {
      throw new Error('PolygonCollider vertices must form a convex polygon.');
    }
  }
}

/**
 * A convex polygon collider, defined by a set of local-space vertices.
 * Vertices are re-centered around the polygon's centroid (so the entity's
 * position represents the center of mass) and normalized to a consistent
 * winding order.
 */
export class PolygonCollider extends Collider {
  public readonly type = 'polygon';
  public offset: Vector2 = Vector2.zero;
  public readonly vertices: readonly Vector2[];
  public readonly normals: readonly Vector2[];

  /**
   * Creates a new PolygonCollider instance.
   * @param vertices - The local-space vertices of the polygon, in order.
   * Must describe a convex polygon with at least 3 vertices. Vertices may
   * be supplied in either winding order.
   * @param density - The density used to derive mass from the polygon's
   * area.
   * @throws An error if fewer than 3 vertices are provided, the vertices
   * are collinear/degenerate, or the vertices do not form a convex polygon.
   */
  constructor(vertices: readonly Vector2[], density: number = 1) {
    if (vertices.length < 3) {
      throw new Error(
        `PolygonCollider requires at least 3 vertices, received ${vertices.length}.`,
      );
    }

    let orderedVertices = [...vertices];
    const signedArea = calculateSignedArea(orderedVertices);

    if (Math.abs(signedArea) < EPSILON) {
      throw new Error(
        'PolygonCollider vertices must not be collinear or degenerate.',
      );
    }

    if (signedArea < 0) {
      orderedVertices = orderedVertices.slice().reverse();
    }

    validateConvexity(orderedVertices);

    const centroid = calculateCentroid(orderedVertices);
    const centeredVertices = orderedVertices.map((vertex) =>
      vertex.subtract(centroid),
    );

    const mass = density * calculateArea(centeredVertices);
    const momentOfInertia = calculatePolygonMomentOfInertia(
      mass,
      centeredVertices,
    );

    super(momentOfInertia, mass);

    this.vertices = centeredVertices;
    this.normals = calculateNormals(centeredVertices);
  }

  /**
   * Transforms the collider's local-space vertices into world space.
   * @param position - The world-space position of the entity.
   * @param rotation - The world-space rotation of the entity, in radians.
   * @returns The world-space vertices of the polygon.
   */
  public getWorldVertices(position: Vector2, rotation: number): Vector2[] {
    return this.vertices.map((vertex) =>
      vertex.add(this.offset).rotate(rotation).add(position),
    );
  }

  /**
   * Transforms the collider's local-space face normals into world space.
   * @param rotation - The world-space rotation of the entity, in radians.
   * @returns The world-space face normals of the polygon.
   */
  public getWorldNormals(rotation: number): Vector2[] {
    return this.normals.map((normal) => normal.rotate(rotation));
  }

  public computeAabb(position: Vector2, rotation: number): Aabb {
    const worldVertices = this.getWorldVertices(position, rotation);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const vertex of worldVertices) {
      minX = Math.min(minX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxX = Math.max(maxX, vertex.x);
      maxY = Math.max(maxY, vertex.y);
    }

    return {
      min: new Vector2(minX, minY),
      max: new Vector2(maxX, maxY),
    };
  }
}
