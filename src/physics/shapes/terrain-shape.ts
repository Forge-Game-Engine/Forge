import { Vector2 } from '../../math/index.js';
import {
  calculateCentroid,
  calculateNormals,
  calculatePolygonMomentOfInertia,
  calculateSignedArea,
} from './polygon-math.js';
import type { ShapeBase } from './shape.js';

/**
 * A single span of ground between two consecutive {@link TerrainShape}
 * surface points, closed off into a convex quadrilateral by a flat bottom
 * edge. `vertices`/`normals` follow this engine's canonical winding (see
 * `PolygonShape`'s constructor): top-left, top-right, bottom-right,
 * bottom-left, with outward-facing normals in the same order. All fields
 * are in the terrain's local space.
 */
export interface TerrainSegment {
  /**
   * The segment's four vertices, in local space: the two surface points
   * followed by their corresponding points on the terrain's flat bottom
   * edge.
   */
  vertices: readonly Vector2[];

  /**
   * The segment's four outward-facing edge normals, in local space,
   * corresponding to the edges between consecutive `vertices`.
   */
  normals: readonly Vector2[];

  /**
   * The lesser of the segment's two surface points' x-coordinates. Used to
   * cheaply filter candidate segments before running narrow-phase collision
   * checks against them.
   */
  minX: number;

  /**
   * The greater of the segment's two surface points' x-coordinates.
   */
  maxX: number;
}

const EPSILON = 1e-9;

/**
 * A static, non-convex 2D ground collider defined by a heightmap: a chain
 * of surface points, ordered left to right, closed off into a solid slab by
 * a flat bottom edge `depth` units below the lowest surface point.
 *
 * Unlike {@link PolygonShape}, `TerrainShape` does not re-center its
 * vertices around their centroid - `points` are used exactly as authored,
 * in the shape's own local space, with the owning `RigidBody`'s `position`
 * acting as a simple translation offset (typically `Vector2.zero`, with the
 * terrain authored directly in world coordinates). This matches how
 * heightmap terrain is normally authored, and keeps a terrain's points
 * meaningful on their own without also tracking a separately-computed
 * centroid offset.
 *
 * Narrow-phase collision against a `TerrainShape` (see
 * `detectCircleTerrainCollision`/`detectPolygonTerrainCollision`) is
 * resolved per-segment: each pair of consecutive surface points, plus the
 * flat bottom edge, forms a convex quadrilateral ({@link segments}), and the
 * existing circle/polygon narrow-phase routines run against whichever
 * segments overlap the other body's local x-range.
 *
 * Terrain is intended to always be static (see `RigidBodyOptions.isStatic`)
 * - a heightmap has no meaningful mass distribution to simulate as a moving
 * body. `getArea`/`getMomentOfInertia` are still implemented correctly (for
 * a hypothetical dynamic use), but are never called for a static body.
 */
export class TerrainShape implements ShapeBase {
  public readonly type = 'terrain';

  public readonly points: readonly Vector2[];

  public readonly depth: number;

  /**
   * The flat bottom edge's y-coordinate, in local space: `depth` units
   * below the lowest of `points`.
   */
  public readonly bottomY: number;

  /**
   * The convex quadrilaterals narrow-phase collision detection tests
   * against, one per consecutive pair of `points`.
   */
  public readonly segments: readonly TerrainSegment[];

  /**
   * Creates a new TerrainShape instance.
   * @param points - The local-space surface points of the terrain, ordered
   * by strictly increasing x. Must contain at least 2 points.
   * @param depth - The thickness of the terrain slab below its lowest
   * point. Must be positive.
   * @throws An error if fewer than 2 points are provided, the points are
   * not ordered by strictly increasing x, or `depth` is not positive.
   */
  constructor(points: readonly Vector2[], depth: number) {
    if (points.length < 2) {
      throw new Error(
        `TerrainShape requires at least 2 points, received ${points.length}.`,
      );
    }

    for (let i = 0; i < points.length - 1; i++) {
      if (points[i + 1].x <= points[i].x + EPSILON) {
        throw new Error(
          'TerrainShape points must be ordered by strictly increasing x.',
        );
      }
    }

    if (depth <= 0) {
      throw new Error(
        `TerrainShape depth must be positive, received "${depth}".`,
      );
    }

    this.points = points.map((point) => point.clone());
    this.depth = depth;
    this.bottomY = Math.max(...this.points.map((point) => point.y)) + depth;
    this.segments = this._buildSegments();
  }

  /**
   * Calculates the area of the terrain's full silhouette (its surface
   * points, closed off by the flat bottom edge).
   * @returns The area of the terrain.
   */
  public getArea(): number {
    return Math.abs(calculateSignedArea(this._silhouetteVertices())) / 2;
  }

  /**
   * Calculates the moment of inertia of the terrain's full silhouette for a
   * given mass, about its own center of mass.
   * @param mass - The mass of the body the shape belongs to.
   * @returns The moment of inertia of the terrain.
   */
  public getMomentOfInertia(mass: number): number {
    const silhouette = this._silhouetteVertices();
    const centroid = calculateCentroid(silhouette);
    const verticesAboutCentroid = silhouette.map((vertex) =>
      vertex.subtract(centroid),
    );

    return calculatePolygonMomentOfInertia(mass, verticesAboutCentroid);
  }

  /**
   * Calculates the radius of the smallest circle, centered on the shape's
   * local origin (not its centroid - see the class documentation), that
   * fully contains the terrain.
   * @returns The bounding radius of the terrain.
   */
  public getBoundingRadius(): number {
    let maxRadiusSquared = 0;

    for (const vertex of this._silhouetteVertices()) {
      maxRadiusSquared = Math.max(maxRadiusSquared, vertex.magnitudeSquared());
    }

    return Math.sqrt(maxRadiusSquared);
  }

  private _silhouetteVertices(): Vector2[] {
    const first = this.points[0];
    const last = this.points[this.points.length - 1];

    return [
      ...this.points,
      new Vector2(last.x, this.bottomY),
      new Vector2(first.x, this.bottomY),
    ];
  }

  private _buildSegments(): TerrainSegment[] {
    const segments: TerrainSegment[] = [];

    for (let i = 0; i < this.points.length - 1; i++) {
      const surfaceLeft = this.points[i];
      const surfaceRight = this.points[i + 1];

      const vertices: Vector2[] = [
        surfaceLeft,
        surfaceRight,
        new Vector2(surfaceRight.x, this.bottomY),
        new Vector2(surfaceLeft.x, this.bottomY),
      ];

      segments.push({
        vertices,
        normals: calculateNormals(vertices),
        minX: surfaceLeft.x,
        maxX: surfaceRight.x,
      });
    }

    return segments;
  }
}
