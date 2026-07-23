import { Vector2 } from '../../math/index.js';
import {
  calculateCentroid,
  calculateNormals,
  calculatePolygonMomentOfInertia,
  calculateSignedArea,
} from './polygon-math.js';
import type { ShapeBase } from './shape.js';

const EPSILON = 1e-9;

/**
 * A convex polygon collision shape, defined by a set of local-space
 * vertices. Vertices are re-centered around the polygon's centroid (so
 * `RigidBody.position` represents the center of mass) and normalized to a
 * consistent winding order.
 */
export class PolygonShape implements ShapeBase {
  public readonly type = 'polygon';

  public readonly vertices: readonly Vector2[];

  public readonly normals: readonly Vector2[];

  /**
   * The most recently computed {@link getWorldVertices} result and the
   * position/angle it was computed for. Re-used while both are unchanged to
   * avoid reallocating a vertex array on every call, since narrow-phase
   * collision detection reads world vertices for the same body many times
   * per step.
   */
  private _worldVerticesCache: {
    position: Vector2;
    angle: number;
    vertices: Vector2[];
  } | null;

  /**
   * The most recently computed {@link getWorldNormals} result and the angle
   * it was computed for. Re-used while the angle is unchanged, for the same
   * reason as {@link _worldVerticesCache}.
   */
  private _worldNormalsCache: { angle: number; normals: Vector2[] } | null;

  /**
   * Creates a new PolygonShape instance.
   * @param vertices - The local-space vertices of the polygon, in order.
   * Must describe a convex polygon with at least 3 vertices. Vertices may
   * be supplied in either winding order.
   * @throws An error if fewer than 3 vertices are provided, the vertices
   * are collinear/degenerate, or the vertices do not form a convex polygon.
   */
  constructor(vertices: readonly Vector2[]) {
    if (vertices.length < 3) {
      throw new Error(
        `PolygonShape requires at least 3 vertices, received ${vertices.length}.`,
      );
    }

    let orderedVertices = [...vertices];
    const signedArea = calculateSignedArea(orderedVertices);

    if (Math.abs(signedArea) < EPSILON) {
      throw new Error(
        'PolygonShape vertices must not be collinear or degenerate.',
      );
    }

    if (signedArea < 0) {
      orderedVertices = orderedVertices.slice().reverse();
    }

    PolygonShape._validateConvexity(orderedVertices);

    const centroid = calculateCentroid(orderedVertices);

    this.vertices = orderedVertices.map((vertex) => vertex.subtract(centroid));
    this.normals = calculateNormals(this.vertices);
    this._worldVerticesCache = null;
    this._worldNormalsCache = null;
  }

  /**
   * Creates a rectangular PolygonShape centered on its local origin.
   * @param width - The width of the rectangle.
   * @param height - The height of the rectangle.
   * @returns A new PolygonShape representing the rectangle.
   */
  public static rectangle(width: number, height: number): PolygonShape {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return new PolygonShape([
      new Vector2(-halfWidth, -halfHeight),
      new Vector2(halfWidth, -halfHeight),
      new Vector2(halfWidth, halfHeight),
      new Vector2(-halfWidth, halfHeight),
    ]);
  }

  private static _validateConvexity(vertices: readonly Vector2[]): void {
    const vertexCount = vertices.length;

    for (let i = 0; i < vertexCount; i++) {
      const current = vertices[i];
      const next = vertices[(i + 1) % vertexCount];
      const afterNext = vertices[(i + 2) % vertexCount];

      const edge = next.subtract(current);
      const nextEdge = afterNext.subtract(next);

      if (edge.cross(nextEdge) < -EPSILON) {
        throw new Error('PolygonShape vertices must form a convex polygon.');
      }
    }
  }

  /**
   * Calculates the area of the polygon.
   * @returns The area of the polygon.
   */
  public getArea(): number {
    return Math.abs(calculateSignedArea(this.vertices)) / 2;
  }

  /**
   * Calculates the moment of inertia of the polygon for a given mass.
   * @param mass - The mass of the body the shape belongs to.
   * @returns The moment of inertia of the polygon.
   */
  public getMomentOfInertia(mass: number): number {
    return calculatePolygonMomentOfInertia(mass, this.vertices);
  }

  /**
   * Calculates the radius of the smallest circle, centered on the
   * polygon's centroid, that fully contains the polygon.
   * @returns The bounding radius of the polygon.
   */
  public getBoundingRadius(): number {
    let maxRadiusSquared = 0;

    for (const vertex of this.vertices) {
      maxRadiusSquared = Math.max(maxRadiusSquared, vertex.magnitudeSquared());
    }

    return Math.sqrt(maxRadiusSquared);
  }

  /**
   * Transforms the polygon's local-space vertices into world space.
   * @param position - The world-space position of the body.
   * @param angle - The world-space rotation of the body, in radians.
   * @returns The world-space vertices of the polygon.
   */
  public getWorldVertices(position: Vector2, angle: number): Vector2[] {
    const cache = this._worldVerticesCache;

    if (cache && cache.angle === angle && cache.position.equals(position)) {
      return cache.vertices;
    }

    const vertices = this.vertices.map((vertex) =>
      vertex.rotate(angle).add(position),
    );

    this._worldVerticesCache = { position: position.clone(), angle, vertices };

    return vertices;
  }

  /**
   * Transforms the polygon's local-space face normals into world space.
   * @param angle - The world-space rotation of the body, in radians.
   * @returns The world-space face normals of the polygon.
   */
  public getWorldNormals(angle: number): Vector2[] {
    const cache = this._worldNormalsCache;

    if (cache && cache.angle === angle) {
      return cache.normals;
    }

    const normals = this.normals.map((normal) => normal.rotate(angle));

    this._worldNormalsCache = { angle, normals };

    return normals;
  }
}
