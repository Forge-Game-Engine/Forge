import { GridLayout } from '../../../math/grid-layout/grid-layout.js';
import { Vector2 } from '../../../math/vector2.js';
import { NavigationGrid } from '../navigation-grid.js';

/**
 * How far, as a fraction of a cell, each side of a cell is moved inwards
 * before it's tested against a shape. A shape has to overlap a cell's
 * inside, not just touch its edge, to block it, so a wall whose edge lies
 * on a cell boundary blocks the cells it's in and not the neighbors it
 * touches, even after its points went through a rotation and a few
 * subtractions on the way to the grid.
 */
export const cellInset = 1e-6;

/**
 * Where a navigation grid's cells are in the world, measured once for a
 * bake.
 */
export interface CellFrame {
  /** The number of columns. */
  readonly columns: number;

  /** The number of rows. */
  readonly rows: number;

  /** The grid's layout, which maps between local space and cell space. */
  readonly layout: GridLayout;

  /**
   * The world position of the frame's cell space origin, the grid's first
   * cell's layout-origin corner.
   */
  readonly origin: Vector2;

  /** The world offset of one column. */
  readonly columnStep: Vector2;

  /** The world offset of one row. */
  readonly rowStep: Vector2;

  /**
   * How far along cell space's `x` axis a world distance of `1` can reach,
   * in any direction: the length of the first row of the world-to-cell
   * space map.
   */
  readonly columnReach: number;

  /** How far along cell space's `y` axis a world distance of `1` can reach. */
  readonly rowReach: number;

  /** The grid's world bounds' smallest corner. */
  readonly worldMin: Vector2;

  /** The grid's world bounds' largest corner. */
  readonly worldMax: Vector2;
}

/**
 * Measures where a grid's cells are. The frame counts columns and rows from
 * the grid's first cell, so its cell `(c, r)` is the grid's
 * `(cells.minColumn + c, cells.minRow + r)` and `r * columns + c` is that
 * cell's node id.
 * @param grid - The grid.
 * @returns The grid's cell frame.
 */
export const createCellFrame = (grid: NavigationGrid): CellFrame => {
  const { columns, rows, layout, cells } = grid;
  const firstCorner = layout.cellSpaceToLocal({
    x: cells.minColumn,
    y: cells.minRow,
  });
  const origin = {
    x: grid.origin.x + firstCorner.x,
    y: grid.origin.y + firstCorner.y,
  };
  const columnStep = layout.cellSpaceToLocal({ x: 1, y: 0 });
  const rowStep = layout.cellSpaceToLocal({ x: 0, y: 1 });
  const cellSpaceOfX = layout.localToCellSpace({ x: 1, y: 0 });
  const cellSpaceOfY = layout.localToCellSpace({ x: 0, y: 1 });
  const cornersX = [
    0,
    columns * columnStep.x,
    rows * rowStep.x,
    columns * columnStep.x + rows * rowStep.x,
  ];
  const cornersY = [
    0,
    columns * columnStep.y,
    rows * rowStep.y,
    columns * columnStep.y + rows * rowStep.y,
  ];

  return {
    columns,
    rows,
    layout,
    origin,
    columnStep,
    rowStep,
    columnReach: Math.hypot(cellSpaceOfX.x, cellSpaceOfY.x),
    rowReach: Math.hypot(cellSpaceOfX.y, cellSpaceOfY.y),
    worldMin: {
      x: origin.x + Math.min(...cornersX),
      y: origin.y + Math.min(...cornersY),
    },
    worldMax: {
      x: origin.x + Math.max(...cornersX),
      y: origin.y + Math.max(...cornersY),
    },
  };
};

/**
 * Converts a world position to the grid's continuous cell space, where cell
 * `(c, r)` is the unit square `[c, c + 1) x [r, r + 1)`.
 * @param frame - The grid's cell frame.
 * @param point - The world position.
 * @returns A new `Vector2` in cell space.
 */
export const worldToCellSpace = (frame: CellFrame, point: Vector2): Vector2 =>
  frame.layout.localToCellSpace({
    x: point.x - frame.origin.x,
    y: point.y - frame.origin.y,
  });

/**
 * Writes the world positions of a cell's inset quad's four corners, the
 * cell-space corners `(c + ε, r + ε)`, `(c + 1 - ε, r + ε)`,
 * `(c + 1 - ε, r + 1 - ε)` and `(c + ε, r + 1 - ε)` with `ε` the
 * {@link cellInset}. The layout keeps winding, so the quad's signed area is
 * positive.
 * @param frame - The grid's cell frame.
 * @param column - The cell's column.
 * @param row - The cell's row.
 * @param quad - Eight numbers to write, `x` then `y` of each corner.
 */
export const writeInsetQuad = (
  frame: CellFrame,
  column: number,
  row: number,
  quad: Float64Array,
): void => {
  const { origin, columnStep, rowStep } = frame;
  const near = cellInset;
  const far = 1 - cellInset;
  const corners = [
    [column + near, row + near],
    [column + far, row + near],
    [column + far, row + far],
    [column + near, row + far],
  ];

  for (let i = 0; i < 4; i++) {
    const [u, v] = corners[i];

    quad[i * 2] = origin.x + u * columnStep.x + v * rowStep.x;
    quad[i * 2 + 1] = origin.y + u * columnStep.y + v * rowStep.y;
  }
};

/**
 * Finds the squared distance from a point to a segment.
 * @param px - The point's `x`.
 * @param py - The point's `y`.
 * @param ax - The segment's start `x`.
 * @param ay - The segment's start `y`.
 * @param bx - The segment's end `x`.
 * @param by - The segment's end `y`.
 * @returns The squared distance.
 */
const pointToSegmentDistanceSquared = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number => {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.min(
          1,
          Math.max(0, ((px - ax) * dx + (py - ay) * dy) / lengthSquared),
        );
  const offsetX = ax + t * dx - px;
  const offsetY = ay + t * dy - py;

  return offsetX * offsetX + offsetY * offsetY;
};

/**
 * Checks whether a point is inside a quad, edges included.
 * @param px - The point's `x`.
 * @param py - The point's `y`.
 * @param quad - The quad's corners, wound to a positive signed area.
 * @returns `true` if the point is inside the quad or on its edge.
 */
const isPointInQuad = (px: number, py: number, quad: Float64Array): boolean => {
  for (let i = 0; i < 4; i++) {
    const ax = quad[i * 2];
    const ay = quad[i * 2 + 1];
    const bx = quad[((i + 1) % 4) * 2];
    const by = quad[((i + 1) % 4) * 2 + 1];

    if ((bx - ax) * (py - ay) - (by - ay) * (px - ax) < 0) {
      return false;
    }
  }

  return true;
};

/**
 * Finds which side of the line through `a` and `b` a point is on.
 * @returns Positive on one side, negative on the other, `0` on the line.
 */
const orientation = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number,
): number => (bx - ax) * (py - ay) - (by - ay) * (px - ax);

/**
 * Checks whether two values have strictly opposite signs.
 */
const haveOppositeSigns = (a: number, b: number): boolean =>
  (a > 0 && b < 0) || (a < 0 && b > 0);

/**
 * Checks whether a segment crosses one of a quad's edges at a point inside
 * both. Segments that only touch, or overlap along a line, aren't counted:
 * an end of one is then on the other, so the distance between their ends
 * finds them.
 * @param ax - The segment's start `x`.
 * @param ay - The segment's start `y`.
 * @param bx - The segment's end `x`.
 * @param by - The segment's end `y`.
 * @param quad - The quad's corners.
 * @param edge - The quad's edge, from corner `edge` to the next corner.
 * @returns `true` if they cross.
 */
const crossesQuadEdge = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  quad: Float64Array,
  edge: number,
): boolean => {
  const next = (edge + 1) % 4;
  const cx = quad[edge * 2];
  const cy = quad[edge * 2 + 1];
  const dx = quad[next * 2];
  const dy = quad[next * 2 + 1];

  return (
    haveOppositeSigns(
      orientation(ax, ay, bx, by, cx, cy),
      orientation(ax, ay, bx, by, dx, dy),
    ) &&
    haveOppositeSigns(
      orientation(cx, cy, dx, dy, ax, ay),
      orientation(cx, cy, dx, dy, bx, by),
    )
  );
};

/**
 * Finds the distance from a point to a quad.
 * @param px - The point's `x`.
 * @param py - The point's `y`.
 * @param quad - The quad's corners, wound to a positive signed area.
 * @returns The distance, `0` when the point is inside the quad.
 */
export const pointToQuadDistance = (
  px: number,
  py: number,
  quad: Float64Array,
): number => {
  if (isPointInQuad(px, py, quad)) {
    return 0;
  }

  let distanceSquared = Infinity;

  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;

    distanceSquared = Math.min(
      distanceSquared,
      pointToSegmentDistanceSquared(
        px,
        py,
        quad[i * 2],
        quad[i * 2 + 1],
        quad[next * 2],
        quad[next * 2 + 1],
      ),
    );
  }

  return Math.sqrt(distanceSquared);
};

/**
 * Finds the distance from a segment to a quad: `0` when the segment has an
 * end inside the quad or crosses one of its edges, and otherwise the least
 * of the distances from the quad's corners to the segment and from the
 * segment's ends to the quad's edges.
 * @param ax - The segment's start `x`.
 * @param ay - The segment's start `y`.
 * @param bx - The segment's end `x`.
 * @param by - The segment's end `y`.
 * @param quad - The quad's corners, wound to a positive signed area.
 * @returns The distance.
 */
export const segmentToQuadDistance = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  quad: Float64Array,
): number => {
  if (isPointInQuad(ax, ay, quad) || isPointInQuad(bx, by, quad)) {
    return 0;
  }

  let distanceSquared = Infinity;

  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    const cx = quad[i * 2];
    const cy = quad[i * 2 + 1];
    const dx = quad[next * 2];
    const dy = quad[next * 2 + 1];

    if (crossesQuadEdge(ax, ay, bx, by, quad, i)) {
      return 0;
    }

    distanceSquared = Math.min(
      distanceSquared,
      pointToSegmentDistanceSquared(cx, cy, ax, ay, bx, by),
      pointToSegmentDistanceSquared(ax, ay, cx, cy, dx, dy),
      pointToSegmentDistanceSquared(bx, by, cx, cy, dx, dy),
    );
  }

  return Math.sqrt(distanceSquared);
};
