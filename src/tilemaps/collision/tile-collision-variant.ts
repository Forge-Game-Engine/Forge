// A tile's collision shape as one cell of a layer holds it: moved by the
// cell's transform bits and snapped to whole steps of the layout's cell
// space. Shared by createTileSet's validation and the outline builder, so
// the builder only ever meets shapes the tile set has already checked. Not
// exported from the package.

import { GridLayout, Vector2 } from '../../math/index.js';
import { applyTileTransform } from '../tiles/tile-transform.js';

/**
 * How many snapping steps a cell is wide in cell space (`2^16`). Collision
 * shapes are compared in these whole steps, so a vertex two neighbors
 * share is one exact pair of integers and shared edges cancel exactly.
 * Every coordinate a layer can reach (`2^30` cells times `2^16` steps)
 * stays a safe integer, and a step is far finer than a pixel.
 */
export const collisionSnapSteps = 65_536;

/** A point in a cell's cell space, in whole snapping steps from `0` to `collisionSnapSteps`. */
export interface SnappedPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Where a shape touches one side of its cell, as a range of the side's
 * parameter (`x` along the top and bottom sides, `y` along the left and
 * right), in snapping steps. `min` equal to `max` is a single touching
 * vertex; otherwise the shape has an edge along the side.
 */
export interface SideContact {
  readonly min: number;
  readonly max: number;
}

/** The index of the top side (`y` is `0`) in {@link TileCollisionVariant.sides}. */
export const topSide = 0;

/** The index of the right side (`x` is `collisionSnapSteps`). */
export const rightSide = 1;

/** The index of the bottom side (`y` is `collisionSnapSteps`). */
export const bottomSide = 2;

/** The index of the left side (`x` is `0`). */
export const leftSide = 3;

/**
 * A tile's collision shape in one cell: a strictly convex polygon in the
 * cell's cell space, in snapping steps, wound with positive signed area so
 * solid is on the right of every edge as it's walked on screen.
 */
export interface TileCollisionVariant {
  /** The polygon's points. */
  readonly points: readonly SnappedPoint[];

  /**
   * What the polygon puts on each side of the cell, by side index
   * (`topSide`, `rightSide`, `bottomSide`, `leftSide`), or `null` where it
   * doesn't touch the side. A strictly convex polygon has at most one edge
   * on each side, and otherwise touches it at one vertex or not at all.
   */
  readonly sides: readonly (SideContact | null)[];

  /** The polygon's edges on no side of the cell, as pairs of points. */
  readonly interiorEdges: readonly (readonly [SnappedPoint, SnappedPoint])[];
}

const half = 0.5;

/**
 * Maps a point of tile-local space (origin at the cell footprint's center,
 * layer-local units) into the cell space of the cell it belongs to, where
 * the footprint is the unit square from `(0, 0)` to `(1, 1)` in both
 * layouts.
 * @param layout - The tile set's layout.
 * @param point - The point, in tile-local space.
 * @returns A new point, in the cell's cell space.
 */
export const tileLocalToCellSpace = (
  layout: GridLayout,
  point: Readonly<Vector2>,
): Vector2 => {
  const cellSpace = layout.localToCellSpace({ x: point.x, y: point.y });

  return { x: cellSpace.x + half, y: cellSpace.y + half };
};

const snap = (value: number): number =>
  Math.min(
    collisionSnapSteps,
    Math.max(0, Math.round(value * collisionSnapSteps)),
  ) + 0;

const cross = (ax: number, ay: number, bx: number, by: number): number =>
  ax * by - ay * bx;

const isSamePoint = (a: SnappedPoint, b: SnappedPoint): boolean =>
  a.x === b.x && a.y === b.y;

/**
 * Whether `point`'s two edges, from `previous` and to `next`, point the
 * same way, so it adds nothing to the polygon.
 */
const isStraightThrough = (
  previous: SnappedPoint,
  point: SnappedPoint,
  next: SnappedPoint,
): boolean => {
  const inX = point.x - previous.x;
  const inY = point.y - previous.y;
  const outX = next.x - point.x;
  const outY = next.y - point.y;

  return cross(inX, inY, outX, outY) === 0 && inX * outX + inY * outY > 0;
};

const removeDuplicatePoints = (points: SnappedPoint[]): SnappedPoint[] => {
  const result: SnappedPoint[] = [];

  for (const point of points) {
    if (result.length === 0 || !isSamePoint(result[result.length - 1], point)) {
      result.push(point);
    }
  }

  while (
    result.length > 1 &&
    isSamePoint(result[result.length - 1], result[0])
  ) {
    result.pop();
  }

  return result;
};

const removeStraightPoints = (points: SnappedPoint[]): SnappedPoint[] => {
  const result = [...points];
  let removed = true;

  // Removing a point leaves its neighbors' edges pointing the same ways, so
  // this only repeats for runs of several straight points.
  while (removed && result.length >= 3) {
    const straight = result.findIndex((point, i) =>
      isStraightThrough(
        result[(i - 1 + result.length) % result.length],
        point,
        result[(i + 1) % result.length],
      ),
    );

    removed = straight !== -1;

    if (removed) {
      result.splice(straight, 1);
    }
  }

  return result;
};

/**
 * Whether a transform bits value holds an odd number of set bits. Each bit
 * is a mirror, so an odd number of them reverses a polygon's winding.
 */
const mirrorsWinding = (bits: number): boolean =>
  ((bits & 1) ^ ((bits >> 1) & 1) ^ ((bits >> 2) & 1)) === 1;

/**
 * Moves a collision polygon by a cell's transform bits and snaps it into
 * cell space. The bits move the shape within the footprint's bounding box
 * the way they move a tile's image within its rect (`applyTileTransform`),
 * so a turned or mirrored tile collides where it draws. Points that snap
 * to the same place are merged, and points whose two edges point the same
 * way are removed.
 * @param layout - The tile set's layout.
 * @param polygon - The polygon, in tile-local space, wound with positive
 * signed area.
 * @param bits - The cell's transform bits, from `getTileTransformBits`.
 * @returns The snapped points, wound with positive signed area if the
 * polygon was convex. Check them with {@link describeSnappedShapeProblem}.
 */
export const snapTileCollisionPolygon = (
  layout: GridLayout,
  polygon: readonly Readonly<Vector2>[],
  bits: number,
): SnappedPoint[] => {
  const { cellWidth, cellHeight } = layout;
  const normalized: Vector2 = { x: 0, y: 0 };
  const points = polygon.map((point) => {
    normalized.x = point.x / cellWidth + half;
    normalized.y = point.y / cellHeight + half;
    applyTileTransform(bits, normalized, normalized);

    const cellSpace = tileLocalToCellSpace(layout, {
      x: (normalized.x - half) * cellWidth,
      y: (normalized.y - half) * cellHeight,
    });

    return { x: snap(cellSpace.x), y: snap(cellSpace.y) };
  });

  if (mirrorsWinding(bits)) {
    points.reverse();
  }

  return removeStraightPoints(removeDuplicatePoints(points));
};

/**
 * Whether direction `a`'s angle, measured in `[0, 2π)` from `+X` towards
 * `+Y`, is less than direction `b`'s, compared exactly.
 */
const isAngleLess = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean => {
  // Directions in [0, π) are the first half; the rest are the second.
  const halfOfA = ay > 0 || (ay === 0 && ax > 0) ? 0 : 1;
  const halfOfB = by > 0 || (by === 0 && bx > 0) ? 0 : 1;

  if (halfOfA !== halfOfB) {
    return halfOfA < halfOfB;
  }

  return cross(ax, ay, bx, by) > 0;
};

/**
 * Says why snapped points aren't a strictly convex, simple polygon, checked
 * exactly in integers.
 * @param points - The points, from {@link snapTileCollisionPolygon}.
 * @returns A phrase describing the problem (`"isn't strictly convex"`), or
 * `null` if the points are a strictly convex polygon that goes round once.
 */
export const describeSnappedShapeProblem = (
  points: readonly SnappedPoint[],
): string | null => {
  const count = points.length;

  if (count < 3) {
    return 'has fewer than 3 distinct points that aren’t in a straight line';
  }

  let wraps = 0;

  for (let i = 0; i < count; i++) {
    const point = points[i];
    const next = points[(i + 1) % count];
    const afterNext = points[(i + 2) % count];
    const inX = next.x - point.x;
    const inY = next.y - point.y;
    const outX = afterNext.x - next.x;
    const outY = afterNext.y - next.y;

    if (cross(inX, inY, outX, outY) <= 0) {
      return 'isn’t strictly convex';
    }

    // Every turn is less than π, so the edge directions' angles only drop
    // where they pass +X: counting the drops counts the turns round.
    if (isAngleLess(outX, outY, inX, inY)) {
      wraps++;
    }
  }

  return wraps === 1 ? null : 'crosses itself';
};

/**
 * Finds where a strictly convex polygon touches each side of its cell, and
 * its edges on no side.
 * @param points - Points that {@link describeSnappedShapeProblem} accepts.
 * @returns The variant.
 */
export const createTileCollisionVariant = (
  points: readonly SnappedPoint[],
): TileCollisionVariant => {
  const steps = collisionSnapSteps;
  const sides: (SideContact | null)[] = [null, null, null, null];
  const interiorEdges: [SnappedPoint, SnappedPoint][] = [];

  points.forEach((start, index) => {
    const end = points[(index + 1) % points.length];

    // Solid is on the right of each edge as it's walked on screen, so an
    // edge on the top side runs towards +x, on the right towards +y, on
    // the bottom towards -x and on the left towards -y.
    if (start.y === 0 && end.y === 0) {
      sides[topSide] = { min: start.x, max: end.x };
    } else if (start.x === steps && end.x === steps) {
      sides[rightSide] = { min: start.y, max: end.y };
    } else if (start.y === steps && end.y === steps) {
      sides[bottomSide] = { min: end.x, max: start.x };
    } else if (start.x === 0 && end.x === 0) {
      sides[leftSide] = { min: end.y, max: start.y };
    } else {
      interiorEdges.push([start, end]);
    }
  });

  // A side with no edge on it may still have one vertex on it.
  for (const point of points) {
    if (point.y === 0) {
      sides[topSide] ??= { min: point.x, max: point.x };
    }

    if (point.x === steps) {
      sides[rightSide] ??= { min: point.y, max: point.y };
    }

    if (point.y === steps) {
      sides[bottomSide] ??= { min: point.x, max: point.x };
    }

    if (point.x === 0) {
      sides[leftSide] ??= { min: point.y, max: point.y };
    }
  }

  return { points, sides, interiorEdges };
};

/** The variant of a `'cell'` shape: the whole unit square, under every transform. */
export const fullCellVariant: TileCollisionVariant = createTileCollisionVariant(
  [
    { x: 0, y: 0 },
    { x: collisionSnapSteps, y: 0 },
    { x: collisionSnapSteps, y: collisionSnapSteps },
    { x: 0, y: collisionSnapSteps },
  ],
);
