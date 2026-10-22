import { Vector2 } from '../../../math/vector2.js';
import {
  CellFrame,
  pointToQuadDistance,
  segmentToQuadDistance,
  worldToCellSpace,
  writeInsetQuad,
} from './cell-distance.js';

/** A filled circle, in world space. */
export interface DiscRegion {
  readonly kind: 'disc';

  /** The disc's centre. */
  readonly center: Vector2;

  /** The disc's radius. */
  readonly radius: number;
}

/**
 * The area enclosed by closed loops of points, in world space. A loop with
 * positive signed area surrounds solid and one with negative signed area
 * surrounds a hole; loops never cross, so they nest.
 */
export interface LoopsRegion {
  readonly kind: 'loops';

  /** The loops, each without its first point repeated at the end. */
  readonly loops: readonly (readonly Vector2[])[];

  /** Whether the plane outside every loop is solid. */
  readonly outsideIsSolid: boolean;
}

/** The world-space area a collider fills, as a navigation bake sees it. */
export type BakeRegion = DiscRegion | LoopsRegion;

/** A loop edge's ends, in cell space. */
interface CellEdge {
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
}

/** Where a scan line crosses a loop edge, and which way the edge goes. */
interface Crossing {
  readonly x: number;
  readonly sign: number;
}

/**
 * Finds the first and last row or column, clipped to the grid, whose cell
 * a range of cell-space coordinates grown by `reach` can touch.
 * @param min - The smallest coordinate.
 * @param max - The largest coordinate.
 * @param reach - How far, in cell space, to grow the range.
 * @param count - The number of rows or columns.
 * @returns The first and last index; the first is greater when none is.
 */
const getReachedIndices = (
  min: number,
  max: number,
  reach: number,
  count: number,
): [first: number, last: number] => [
  Math.max(0, Math.ceil(min - 1 - reach)),
  Math.min(count - 1, Math.floor(max + reach)),
];

/**
 * Checks whether a region, grown by a radius, can reach the grid.
 * @param frame - The grid's cell frame.
 * @param region - The region.
 * @param radius - How far to grow the region.
 * @returns `false` if the region's bounds, grown by `radius`, miss the
 * grid's bounds.
 */
const canReachGrid = (
  frame: CellFrame,
  region: BakeRegion,
  radius: number,
): boolean => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  if (region.kind === 'disc') {
    const reach = region.radius + radius;

    minX = region.center.x - reach;
    minY = region.center.y - reach;
    maxX = region.center.x + reach;
    maxY = region.center.y + reach;
  } else {
    for (const loop of region.loops) {
      for (const point of loop) {
        minX = Math.min(minX, point.x - radius);
        minY = Math.min(minY, point.y - radius);
        maxX = Math.max(maxX, point.x + radius);
        maxY = Math.max(maxY, point.y + radius);
      }
    }
  }

  return (
    minX <= frame.worldMax.x &&
    maxX >= frame.worldMin.x &&
    minY <= frame.worldMax.y &&
    maxY >= frame.worldMin.y
  );
};

/**
 * Marks every cell whose inset quad is within `radius` of a disc's
 * centre plus its radius.
 * @param frame - The grid's cell frame.
 * @param disc - The disc.
 * @param radius - How far to grow the disc.
 * @param blocked - One byte per cell, set to `1` for each cell to block.
 */
const markDisc = (
  frame: CellFrame,
  disc: DiscRegion,
  radius: number,
  blocked: Uint8Array,
): void => {
  const reach = disc.radius + radius;
  const center = worldToCellSpace(frame, disc.center);
  const [firstRow, lastRow] = getReachedIndices(
    center.y,
    center.y,
    reach * frame.rowReach,
    frame.rows,
  );
  const [firstColumn, lastColumn] = getReachedIndices(
    center.x,
    center.x,
    reach * frame.columnReach,
    frame.columns,
  );
  const quad = new Float64Array(8);

  for (let row = firstRow; row <= lastRow; row++) {
    for (let column = firstColumn; column <= lastColumn; column++) {
      const index = row * frame.columns + column;

      if (blocked[index] === 1) {
        continue;
      }

      writeInsetQuad(frame, column, row, quad);

      if (pointToQuadDistance(disc.center.x, disc.center.y, quad) <= reach) {
        blocked[index] = 1;
      }
    }
  }
};

/**
 * Maps a loop region's edges into cell space.
 * @param frame - The grid's cell frame.
 * @param region - The loops, in world space.
 * @returns Every edge of every loop, in cell space.
 */
const getCellEdges = (frame: CellFrame, region: LoopsRegion): CellEdge[] => {
  const edges: CellEdge[] = [];

  for (const loop of region.loops) {
    const cellLoop = loop.map((point) => worldToCellSpace(frame, point));

    for (let i = 0; i < cellLoop.length; i++) {
      const a = cellLoop[i];
      const b = cellLoop[(i + 1) % cellLoop.length];

      edges.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y });
    }
  }

  return edges;
};

/**
 * Buckets edges by the rows whose centre line they cross, so each row only
 * looks at its own. An edge crosses row r's centre line y = r + 0.5 when
 * min(ay, by) <= y < max(ay, by): the half-open rule counts a vertex on the
 * line once and skips edges along it.
 * @param edges - The edges, in cell space.
 * @param firstRow - The first row to bucket.
 * @param lastRow - The last row to bucket.
 * @returns One list of edges per row from `firstRow` to `lastRow`.
 */
const bucketEdgesByRow = (
  edges: readonly CellEdge[],
  firstRow: number,
  lastRow: number,
): CellEdge[][] => {
  const rowEdges: CellEdge[][] = Array.from(
    { length: lastRow - firstRow + 1 },
    () => [],
  );

  for (const edge of edges) {
    const edgeFirstRow = Math.max(
      firstRow,
      Math.ceil(Math.min(edge.ay, edge.by) - 0.5),
    );
    const edgeLastRow = Math.min(
      lastRow,
      Math.ceil(Math.max(edge.ay, edge.by) - 0.5) - 1,
    );

    for (let row = edgeFirstRow; row <= edgeLastRow; row++) {
      rowEdges[row - firstRow].push(edge);
    }
  }

  return rowEdges;
};

/**
 * Marks the cells of one row whose centre's winding reaches the threshold.
 * @param frame - The grid's cell frame.
 * @param row - The row.
 * @param edges - The edges crossing the row's centre line, in cell space.
 * @param threshold - The least winding that's solid.
 * @param blocked - One byte per cell, set to `1` for each cell to block.
 */
const fillRow = (
  frame: CellFrame,
  row: number,
  edges: readonly CellEdge[],
  threshold: number,
  blocked: Uint8Array,
): void => {
  const y = row + 0.5;
  const crossings: Crossing[] = edges.map((edge) => ({
    x: edge.ax + ((y - edge.ay) * (edge.bx - edge.ax)) / (edge.by - edge.ay),
    sign: edge.ay > edge.by ? 1 : -1,
  }));

  crossings.sort((a, b) => a.x - b.x);

  let winding = 0;
  let next = 0;

  for (let column = 0; column < frame.columns; column++) {
    while (next < crossings.length && crossings[next].x < column + 0.5) {
      winding += crossings[next].sign;
      next++;
    }

    if (winding >= threshold) {
      blocked[row * frame.columns + column] = 1;
    }
  }
};

/**
 * Marks every cell whose centre is inside the loops' solid, by counting
 * winding along one scan line per row through the cell centres. In cell
 * space every row is a strip of unit squares on every layout, and the
 * layout keeps winding, so an edge going up the cell space adds `1` to
 * every point to its right and one going down subtracts `1`. A point is
 * solid when its winding is `1` or more, or `0` or more when the outside of
 * every loop is solid.
 * @param frame - The grid's cell frame.
 * @param region - The loops.
 * @param blocked - One byte per cell, set to `1` for each cell to block.
 */
const fillLoops = (
  frame: CellFrame,
  region: LoopsRegion,
  blocked: Uint8Array,
): void => {
  const edges = getCellEdges(frame, region);
  const threshold = region.outsideIsSolid ? 0 : 1;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const edge of edges) {
    minY = Math.min(minY, edge.ay);
    maxY = Math.max(maxY, edge.ay);
  }

  // The rows whose centre line some edge crosses. Outside them the winding
  // is 0 everywhere, which is only solid when the outside is.
  const firstRow = region.outsideIsSolid
    ? 0
    : Math.max(0, Math.ceil(minY - 0.5));
  const lastRow = region.outsideIsSolid
    ? frame.rows - 1
    : Math.min(frame.rows - 1, Math.ceil(maxY - 0.5) - 1);

  if (firstRow > lastRow) {
    return;
  }

  const rowEdges = bucketEdgesByRow(edges, firstRow, lastRow);

  for (let row = firstRow; row <= lastRow; row++) {
    fillRow(frame, row, rowEdges[row - firstRow], threshold, blocked);
  }
};

/**
 * Marks every cell whose inset quad is within `radius` of a segment. The
 * candidates are the cells a world-space disc of `radius` swept along the
 * segment can touch, row by row, so a long diagonal wall only visits the
 * cells near it, not its whole bounding box.
 * @param frame - The grid's cell frame.
 * @param a - The segment's start, in world space.
 * @param b - The segment's end, in world space.
 * @param radius - How far from the segment a cell is blocked.
 * @param blocked - One byte per cell, set to `1` for each cell to block.
 * @param quad - Eight numbers of scratch space for a cell's inset quad.
 */
const markSegment = (
  frame: CellFrame,
  a: Vector2,
  b: Vector2,
  radius: number,
  blocked: Uint8Array,
  quad: Float64Array,
): void => {
  const ca = worldToCellSpace(frame, a);
  const cb = worldToCellSpace(frame, b);
  const reachX = radius * frame.columnReach;
  const reachY = radius * frame.rowReach;
  const [firstRow, lastRow] = getReachedIndices(
    Math.min(ca.y, cb.y),
    Math.max(ca.y, cb.y),
    reachY,
    frame.rows,
  );
  const dy = cb.y - ca.y;

  for (let row = firstRow; row <= lastRow; row++) {
    let start = 0;
    let end = 1;

    // The part of the segment that can reach this row: the cells of row r
    // are within the radius of points whose cell-space y is in
    // [r - reachY, r + 1 + reachY].
    if (dy !== 0) {
      const t0 = (row - reachY - ca.y) / dy;
      const t1 = (row + 1 + reachY - ca.y) / dy;

      start = Math.max(0, Math.min(t0, t1));
      end = Math.min(1, Math.max(t0, t1));
    }

    if (start > end) {
      continue;
    }

    const startX = ca.x + start * (cb.x - ca.x);
    const endX = ca.x + end * (cb.x - ca.x);
    const [firstColumn, lastColumn] = getReachedIndices(
      Math.min(startX, endX),
      Math.max(startX, endX),
      reachX,
      frame.columns,
    );

    for (let column = firstColumn; column <= lastColumn; column++) {
      const index = row * frame.columns + column;

      if (blocked[index] === 1) {
        continue;
      }

      writeInsetQuad(frame, column, row, quad);

      if (segmentToQuadDistance(a.x, a.y, b.x, b.y, quad) <= radius) {
        blocked[index] = 1;
      }
    }
  }
};

/**
 * Marks every cell whose inset quad comes within `radius` of a region.
 *
 * A loop region overlaps a cell's quad within the radius exactly when the
 * quad's centre is inside the region, or some edge of the region is within
 * the radius of the quad: if the quad meets the region but its centre
 * isn't inside, the boundary crosses the quad, and if it's near the region
 * without meeting it, the nearest point of the region is on its boundary.
 * So the fill pass and the edge pass together are exact.
 * @param frame - The grid's cell frame.
 * @param region - The region, in world space.
 * @param radius - How far, in world units, to grow the region.
 * @param blocked - One byte per cell, set to `1` for each cell to block.
 * Cells already `1` are skipped.
 */
export const markRegion = (
  frame: CellFrame,
  region: BakeRegion,
  radius: number,
  blocked: Uint8Array,
): void => {
  if (region.kind === 'loops' && region.loops.length === 0) {
    return;
  }

  const isOutsideSolid = region.kind === 'loops' && region.outsideIsSolid;

  if (!isOutsideSolid && !canReachGrid(frame, region, radius)) {
    return;
  }

  if (region.kind === 'disc') {
    markDisc(frame, region, radius, blocked);

    return;
  }

  fillLoops(frame, region, blocked);

  const quad = new Float64Array(8);

  for (const loop of region.loops) {
    for (let i = 0; i < loop.length; i++) {
      markSegment(
        frame,
        loop[i],
        loop[(i + 1) % loop.length],
        radius,
        blocked,
        quad,
      );
    }
  }
};
