import { Vector2 } from '../../math/vector2.js';
import { NavigationGrid } from '../grid/navigation-grid.js';

/** A world-space shape the reference measures distances to. */
export type ReferenceShape =
  | { kind: 'disc'; center: Vector2; radius: number }
  | {
      kind: 'loops';
      loops: readonly (readonly Vector2[])[];
      outsideIsSolid?: boolean;
    };

/** What the reference decided about a cell. */
export type ReferenceVerdict = 'blocked' | 'open' | 'undecided';

/** How many samples along each side of a cell. */
const samplesPerSide = 17;

/** The inset the bake moves each side of a cell by, as a fraction. */
const inset = 1e-6;

const pointToSegmentDistance = (p: Vector2, a: Vector2, b: Vector2): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared),
        );

  return Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
};

/**
 * Finds a point's winding number around loops by casting a ray towards
 * `+X` and counting the edges it crosses. A loop with positive signed area
 * goes down (towards `+Y`) on its right side, so downward crossings count
 * `+1`.
 */
const getWinding = (
  p: Vector2,
  loops: readonly (readonly Vector2[])[],
): number => {
  let winding = 0;

  for (const loop of loops) {
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i];
      const b = loop[(i + 1) % loop.length];
      const crossesLine = a.y <= p.y !== b.y <= p.y;

      if (!crossesLine) {
        continue;
      }

      const x = a.x + ((p.y - a.y) * (b.x - a.x)) / (b.y - a.y);

      if (x > p.x) {
        winding += a.y < b.y ? 1 : -1;
      }
    }
  }

  return winding;
};

/**
 * Finds the distance from a point to a shape, `0` inside it.
 * @param point - The world point.
 * @param shape - The shape.
 * @returns The distance.
 */
export const distanceToShape = (
  point: Vector2,
  shape: ReferenceShape,
): number => {
  if (shape.kind === 'disc') {
    return Math.max(
      0,
      Math.hypot(point.x - shape.center.x, point.y - shape.center.y) -
        shape.radius,
    );
  }

  const threshold = shape.outsideIsSolid === true ? 0 : 1;

  if (getWinding(point, shape.loops) >= threshold) {
    return 0;
  }

  let distance = Infinity;

  for (const loop of shape.loops) {
    for (let i = 0; i < loop.length; i++) {
      distance = Math.min(
        distance,
        pointToSegmentDistance(point, loop[i], loop[(i + 1) % loop.length]),
      );
    }
  }

  return distance;
};

/**
 * Decides, by sampling, whether a cell's inset quad is within `radius` of
 * any of the shapes. The sampled distance is never less than the true one,
 * and at most half a sample spacing's diagonal more, so a cell is
 * `'blocked'` when a sample is within `radius`, `'open'` when every sample
 * is further than `radius` plus that bound, and `'undecided'` otherwise.
 * @param grid - The grid.
 * @param column - The cell's column.
 * @param row - The cell's row.
 * @param shapes - The world shapes.
 * @param radius - The agent radius.
 * @returns The verdict.
 */
export const getReferenceVerdict = (
  grid: NavigationGrid,
  column: number,
  row: number,
  shapes: readonly ReferenceShape[],
  radius: number,
): ReferenceVerdict => {
  const { layout, origin } = grid;
  const step = (1 - 2 * inset) / (samplesPerSide - 1);
  const columnStep = layout.cellSpaceToLocal({ x: step, y: 0 });
  const rowStep = layout.cellSpaceToLocal({ x: 0, y: step });
  const bound =
    Math.max(
      Math.hypot(columnStep.x + rowStep.x, columnStep.y + rowStep.y),
      Math.hypot(columnStep.x - rowStep.x, columnStep.y - rowStep.y),
    ) / 2;
  let distance = Infinity;

  for (let i = 0; i < samplesPerSide; i++) {
    for (let j = 0; j < samplesPerSide; j++) {
      const local = layout.cellSpaceToLocal({
        x: column + inset + i * step,
        y: row + inset + j * step,
      });
      const point = { x: local.x + origin.x, y: local.y + origin.y };

      for (const shape of shapes) {
        distance = Math.min(distance, distanceToShape(point, shape));
      }
    }
  }

  if (distance <= radius) {
    return 'blocked';
  }

  return distance - bound > radius ? 'open' : 'undecided';
};

/**
 * Compares a baked grid with the reference.
 * @param grid - The baked grid.
 * @param shapes - The world shapes it was baked from.
 * @param radius - The agent radius it was baked with.
 * @returns The cells the bake got wrong, and how many cells the reference
 * couldn't decide.
 */
export const compareWithReference = (
  grid: NavigationGrid,
  shapes: readonly ReferenceShape[],
  radius: number,
): { wrong: string[]; undecided: number; blocked: number } => {
  const wrong: string[] = [];
  const { minColumn, minRow, maxColumn, maxRow } = grid.cells;
  let undecided = 0;
  let blocked = 0;

  for (let row = minRow; row <= maxRow; row++) {
    for (let column = minColumn; column <= maxColumn; column++) {
      const verdict = getReferenceVerdict(grid, column, row, shapes, radius);
      const isWalkable = grid.isWalkable(column, row);

      if (!isWalkable) {
        blocked++;
      }

      if (verdict === 'undecided') {
        undecided++;
      } else if ((verdict === 'open') !== isWalkable) {
        wrong.push(`(${column}, ${row}) should be ${verdict}`);
      }
    }
  }

  return { wrong, undecided, blocked };
};

/**
 * Lists a grid's blocked cells as `"column,row"` strings, for comparing
 * with an exact expectation.
 * @param grid - The grid.
 * @returns The blocked cells, in row-major order.
 */
export const getBlockedCells = (grid: NavigationGrid): string[] => {
  const cells: string[] = [];
  const { minColumn, minRow, maxColumn, maxRow } = grid.cells;

  for (let row = minRow; row <= maxRow; row++) {
    for (let column = minColumn; column <= maxColumn; column++) {
      if (!grid.isWalkable(column, row)) {
        cells.push(`${column},${row}`);
      }
    }
  }

  return cells;
};

/**
 * Lists every cell of an inclusive range as `"column,row"` strings, in
 * row-major order.
 */
export const getRangeCells = (
  minColumn: number,
  minRow: number,
  maxColumn: number,
  maxRow: number,
): string[] => {
  const cells: string[] = [];

  for (let row = minRow; row <= maxRow; row++) {
    for (let column = minColumn; column <= maxColumn; column++) {
      cells.push(`${column},${row}`);
    }
  }

  return cells;
};
