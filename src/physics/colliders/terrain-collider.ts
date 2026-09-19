import { Vec2, Vector2 } from '../../math/index.js';
import { Aabb } from '../types/aabb.js';
import { Collider } from './collider.js';
import {
  calculateArea,
  calculateCentroid,
  calculatePolygonMomentOfInertia,
} from './polygon-math.js';

const EPSILON = 1e-9;

/**
 * A single span of ground between two consecutive {@link TerrainCollider}
 * surface points: one link of the terrain's continuous surface chain, with
 * no closing side or bottom faces of its own. All fields are in the
 * terrain's local space.
 *
 * Narrow-phase collision treats the terrain as this chain of surface edges
 * rather than as a row of closed quadrilaterals, so a body wide enough to
 * span several edges only ever meets the ground's actual surface - there is
 * no interior face between two neighboring edges for it to catch on. An
 * edge's neighbors (the edges immediately before and after it in
 * {@link TerrainCollider.surface}) act as its "ghost" geometry, exactly as
 * a Box2D chain shape's neighboring segments do: they decide which of two
 * edges sharing a vertex owns a contact clamped to it, so the same physical
 * contact is never reported twice with two different normals.
 */
export interface TerrainSurfaceEdge {
  /**
   * The edge's left-hand endpoint, in local space. Always the lesser of the
   * edge's two x-coordinates, since a terrain's points are ordered by
   * strictly increasing x.
   *
   * This aliases the owning collider's own {@link TerrainCollider.points}
   * entry rather than copying it, so it must never be mutated.
   */
  start: Vector2;

  /**
   * The edge's right-hand endpoint, in local space. Always the greater of
   * the edge's two x-coordinates.
   *
   * This aliases the owning collider's own {@link TerrainCollider.points}
   * entry rather than copying it, so it must never be mutated.
   */
  end: Vector2;

  /**
   * The edge's unit-length outward normal, in local space: perpendicular to
   * `start`-`end` and pointing away from the solid slab. Since the slab
   * always extends in the collider's local +y direction, this always points
   * broadly toward local -y.
   */
  normal: Vector2;
}

/**
 * The world-space faces of the solid slab column directly beneath a single
 * {@link TerrainSurfaceEdge}, as consumed by volume queries that genuinely
 * care about the terrain's inside (currently only `raycastTerrain`).
 */
export interface TerrainEdgeSlab {
  /**
   * The column's four vertices, in the same winding as a
   * `PolygonCollider`'s: the edge's two surface points followed by their
   * corresponding points on the terrain's flat bottom edge.
   */
  vertices: Vector2[];

  /**
   * The column's four outward-facing edge normals, corresponding to the
   * edges between consecutive `vertices`.
   */
  normals: Vector2[];
}

/**
 * A static, non-convex 2D ground collider defined by a heightmap: a chain of
 * surface points, ordered left to right, closed off into a solid slab by a
 * flat bottom edge `depth` units below the lowest surface point.
 *
 * Unlike {@link PolygonCollider}, `TerrainCollider` does not re-center its
 * vertices around their centroid - `points` are used exactly as authored, in
 * the collider's own local space, with the owning entity's position acting
 * as a simple translation offset (typically `Vec2.zero`, with the terrain
 * authored directly in world coordinates).
 *
 * Narrow-phase collision against a `TerrainCollider` (see
 * `detectCircleTerrainCollision`/`detectPolygonTerrainCollision`) runs
 * against the {@link surface} chain, never against the slab: the slab only
 * exists to give the shape a well-defined area, silhouette and bounding box
 * (and to give `raycastTerrain` something solid to hit). Contact normals
 * therefore always come from the ground's actual surface, and a body
 * straddling several surface edges gets one contact per edge it genuinely
 * touches instead of a single contact that jumps between them.
 *
 * `TerrainCollider` is intended for static bodies only - attach it with
 * `addColliderComponent` and no `RigidBodyEcsComponent`. A heightmap has no
 * natural mass distribution to simulate as a moving object.
 */
export class TerrainCollider extends Collider {
  public readonly type = 'terrain';
  public readonly points: readonly Vector2[];
  public readonly depth: number;

  /**
   * The flat bottom edge's y-coordinate, in local space: `depth` units below
   * the lowest of `points`.
   */
  public readonly bottomY: number;

  /**
   * The continuous chain of surface edges narrow-phase collision detection
   * tests against, one per consecutive pair of `points`, ordered left to
   * right.
   */
  public readonly surface: readonly TerrainSurfaceEdge[];

  /**
   * Creates a new TerrainCollider instance.
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
        `TerrainCollider requires at least 2 points, received ${points.length}.`,
      );
    }

    for (let i = 0; i < points.length - 1; i++) {
      if (points[i + 1].x <= points[i].x + EPSILON) {
        throw new Error(
          'TerrainCollider points must be ordered by strictly increasing x.',
        );
      }
    }

    if (depth <= 0) {
      throw new Error(
        `TerrainCollider depth must be positive, received "${depth}".`,
      );
    }

    const clonedPoints = points.map((point) => Vec2.clone(point));
    const bottomY = Math.max(...clonedPoints.map((point) => point.y)) + depth;
    const silhouette = silhouetteVertices(clonedPoints, bottomY);
    const centroid = calculateCentroid(silhouette);
    // Clone before subtracting: `silhouette`'s surface vertices are the same
    // objects as `clonedPoints`, which becomes `this.points` below, so this
    // must not mutate them.
    const verticesAboutCentroid = silhouette.map((vertex) =>
      Vec2.subtract(Vec2.clone(vertex), centroid),
    );
    const mass = calculateArea(silhouette);
    const momentOfInertia = calculatePolygonMomentOfInertia(
      mass,
      verticesAboutCentroid,
    );

    super(momentOfInertia, mass);

    this.points = clonedPoints;
    this.depth = depth;
    this.bottomY = bottomY;
    this.surface = buildSurface(clonedPoints);
  }

  public computeAabb(position: Vector2, rotation: number): Aabb {
    // Clone before transforming: `silhouetteVertices` reuses `this.points`'
    // own vector objects for the surface vertices, so this must not mutate
    // the collider's own stored points.
    const worldVertices = silhouetteVertices(this.points, this.bottomY).map(
      (vertex) =>
        Vec2.add(
          Vec2.rotate(Vec2.add(Vec2.clone(vertex), this.offset), rotation),
          position,
        ),
    );

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
      min: { x: minX, y: minY },
      max: { x: maxX, y: maxY },
    };
  }
}

/**
 * Builds the closed, convex quadrilateral column of solid terrain directly
 * beneath a single surface edge, transformed into world space, for volume
 * queries that need the terrain's inside rather than just its surface.
 *
 * Narrow-phase collision deliberately does *not* use this: a moving body
 * must only ever meet the terrain's surface, never the interior faces two
 * neighboring columns share (see {@link TerrainSurfaceEdge}). A ray, by
 * contrast, can legitimately enter the slab from any direction, so
 * `raycastTerrain` does.
 * @param edge - The surface edge whose column to build.
 * @param bottomY - The terrain's {@link TerrainCollider.bottomY}.
 * @param position - The terrain body's world position.
 * @param rotation - The terrain body's world rotation, in radians.
 * @returns The column's world-space vertices and outward-facing normals,
 * freshly allocated so the caller may transform them further in place.
 */
export function buildTerrainEdgeSlab(
  edge: TerrainSurfaceEdge,
  bottomY: number,
  position: Vector2,
  rotation: number,
): TerrainEdgeSlab {
  const localVertices = [
    edge.start,
    edge.end,
    { x: edge.end.x, y: bottomY },
    { x: edge.start.x, y: bottomY },
  ];

  // The three faces closing the column off below the surface are always
  // axis-aligned in local space - the two sides run straight down to the
  // flat bottom edge - so they never need deriving from the vertices.
  const localNormals = [
    edge.normal,
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  return {
    // Clone before transforming: `edge.start`/`edge.end`/`edge.normal` are
    // the collider's own persistent local-space data, reused every tick.
    vertices: localVertices.map((vertex) =>
      Vec2.add(Vec2.rotate(Vec2.clone(vertex), rotation), position),
    ),
    normals: localNormals.map((normal) =>
      Vec2.rotate(Vec2.clone(normal), rotation),
    ),
  };
}

function silhouetteVertices(
  points: readonly Vector2[],
  bottomY: number,
): Vector2[] {
  const first = points[0];
  const last = points[points.length - 1];

  return [...points, { x: last.x, y: bottomY }, { x: first.x, y: bottomY }];
}

function buildSurface(points: readonly Vector2[]): TerrainSurfaceEdge[] {
  const surface: TerrainSurfaceEdge[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];

    // Clone before subtracting: `start`/`end` are the collider's own stored
    // points, which this must not mutate. Rotating the edge -90 degrees
    // gives a normal pointing toward local -y (the points are ordered by
    // increasing x), which is the side the solid slab is *not* on.
    const normal = Vec2.normalize(
      Vec2.perpendicular(Vec2.subtract(Vec2.clone(end), start)),
    );

    surface.push({ start, end, normal });
  }

  return surface;
}
