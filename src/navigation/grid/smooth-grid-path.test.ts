import { describe, expect, it } from 'vitest';
import { createIsometricGridLayout } from '../../math/grid-layout/create-isometric-grid-layout.js';
import { createOrthogonalGridLayout } from '../../math/grid-layout/create-orthogonal-grid-layout.js';
import { Vector2 } from '../../math/vector2.js';
import { cellRange } from '../test-helpers/cell-range.js';
import { createNavigationGrid } from './create-navigation-grid.js';
import { findGridPath } from './find-grid-path.js';
import { hasLineOfSight } from './has-line-of-sight.js';
import { NavigationGrid, NavigationGridDiagonals } from './navigation-grid.js';
import { smoothGridPath } from './smooth-grid-path.js';

const layout = createOrthogonalGridLayout({ cellWidth: 10, cellHeight: 10 });

const createGrid = (
  columns: number,
  rows: number,
  diagonals: NavigationGridDiagonals = 'noCornerCutting',
): NavigationGrid =>
  createNavigationGrid({
    cells: cellRange(columns, rows),
    layout,
    origin: { x: -50, y: -50 },
    diagonals,
  });

/** The world centre of a cell of a grid made by `createGrid`. */
const center = (column: number, row: number): Vector2 => ({
  x: -50 + column * 10 + 5,
  y: -50 + row * 10 + 5,
});

/**
 * Checks that no segment of a path enters a blocked cell or leaves the
 * grid, by sampling points along each segment, independently of
 * `hasLineOfSight`.
 * @param grid - The grid.
 * @param path - The path's world positions.
 */
const expectSegmentsWalkable = (
  grid: NavigationGrid,
  path: readonly Vector2[],
): void => {
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1];
    const to = path[i];

    for (let sample = 0; sample <= 200; sample++) {
      const t = sample / 200;
      const cell = grid.worldToCell({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      });

      expect(cell).not.toBeNull();

      if (cell) {
        expect(grid.isWalkable(cell.column, cell.row)).toBe(true);
      }
    }
  }
};

/**
 * Measures a path's cost by sampling the cell under the middle of each of
 * many short pieces of it, independently of `smoothGridPath`.
 * @param grid - The grid.
 * @param path - The path's world positions.
 * @returns The sum of each piece's length times its cell's cost.
 */
const pathCost = (grid: NavigationGrid, path: readonly Vector2[]): number => {
  let cost = 0;

  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1];
    const to = path[i];
    const pieceLength = Math.hypot(to.x - from.x, to.y - from.y) / 1000;

    for (let piece = 0; piece < 1000; piece++) {
      const t = (piece + 0.5) / 1000;
      const cell = grid.worldToCell({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      });

      if (cell) {
        cost += pieceLength * grid.getCost(cell.column, cell.row);
      }
    }
  }

  return cost;
};

/**
 * Checks that no segment of a path runs through the inside of a cell of a
 * given cost, by sampling points along each segment and skipping those
 * within a small distance of a cell's edge.
 * @param grid - The grid, made by `createGrid`.
 * @param path - The path's world positions.
 * @param cost - The cost of the cells to avoid.
 * @param applies - Which cells of that cost to avoid; all by default.
 */
const expectSegmentsAvoidCost = (
  grid: NavigationGrid,
  path: readonly Vector2[],
  cost: number,
  applies: (cell: { column: number; row: number }) => boolean = () => true,
): void => {
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1];
    const to = path[i];

    for (let sample = 1; sample < 200; sample++) {
      const t = sample / 200;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      const cellX = (x + 50) / 10;
      const cellY = (y + 50) / 10;
      const nearEdge =
        Math.abs(cellX - Math.round(cellX)) < 1e-6 ||
        Math.abs(cellY - Math.round(cellY)) < 1e-6;
      const cell = grid.worldToCell({ x, y });

      if (!nearEdge && cell && applies(cell)) {
        expect(grid.getCost(cell.column, cell.row)).not.toBe(cost);
      }
    }
  }
};

/** A deterministic pseudo-random number generator, from `0` up to `1`. */
const createRandom = (seed: number): (() => number) => {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;

    return state / 4294967296;
  };
};

describe('smoothGridPath', () => {
  it('smooths a path across an open room into one straight segment', () => {
    const grid = createGrid(10, 6);
    const { status, points } = findGridPath(grid, center(0, 0), center(9, 4));

    expect(status).toBe('found');
    expect(points.length).toBeGreaterThan(2);
    expect(smoothGridPath(grid, points)).toEqual([center(0, 0), center(9, 4)]);
  });

  it('smooths a path along an L-shaped corridor into two segments', () => {
    const grid = createGrid(6, 6);

    // Only row 0 and column 5 are walkable.
    grid.fillWalkable(cellRange(5, 5, 0, 1), false);

    const { status, points } = findGridPath(grid, center(0, 0), center(5, 5));

    expect(status).toBe('found');
    expect(smoothGridPath(grid, points)).toEqual([
      center(0, 0),
      center(5, 0),
      center(5, 5),
    ]);
  });

  it('keeps a waypoint at each corner of a wall the path turns around', () => {
    // A wall down column 3, rows 0 to 3, on a 7 x 6 grid.
    const grid = createGrid(7, 6);

    grid.fillWalkable(
      { minColumn: 3, minRow: 0, maxColumn: 3, maxRow: 3 },
      false,
    );

    const path = [
      center(1, 1),
      center(1, 2),
      center(1, 3),
      center(2, 4),
      center(3, 4),
      center(4, 4),
      center(5, 3),
      center(5, 2),
      center(5, 1),
    ];

    // (2, 4) and (4, 4) are the farthest points that see past the wall's
    // bottom corners, since a segment that grazes cell (3, 3)'s corner
    // isn't in line of sight.
    expect(smoothGridPath(grid, path)).toEqual([
      center(1, 1),
      center(2, 4),
      center(4, 4),
      center(5, 1),
    ]);
  });

  it('keeps the corner waypoint of a searched path around a wall', () => {
    const grid = createGrid(7, 6);

    grid.fillWalkable(
      { minColumn: 3, minRow: 0, maxColumn: 3, maxRow: 3 },
      false,
    );

    const { points } = findGridPath(grid, center(1, 1), center(5, 1));
    const smoothed = smoothGridPath(grid, points);

    expect(smoothed[0]).toEqual(center(1, 1));
    expect(smoothed[smoothed.length - 1]).toEqual(center(5, 1));
    expect(smoothed.length).toBeGreaterThan(2);
    expect(smoothed.length).toBeLessThan(points.length);
    expectSegmentsWalkable(grid, smoothed);
  });

  it('never smooths a path through a blocked cell', () => {
    const random = createRandom(779);

    for (let trial = 0; trial < 20; trial++) {
      const grid = createGrid(16, 12);

      for (let column = 0; column < 16; column++) {
        for (let row = 0; row < 12; row++) {
          grid.setWalkable(column, row, random() > 0.25);
        }
      }

      grid.setWalkable(0, 0, true);
      grid.setWalkable(15, 11, true);

      const { status, points } = findGridPath(
        grid,
        center(0, 0),
        center(15, 11),
      );

      if (status !== 'found') {
        continue;
      }

      const smoothed = smoothGridPath(grid, points);

      expect(smoothed[0]).toEqual(points[0]);
      expect(smoothed[smoothed.length - 1]).toEqual(points[points.length - 1]);
      expect(smoothed.length).toBeLessThanOrEqual(points.length);
      expectSegmentsWalkable(grid, smoothed);

      for (let i = 1; i < smoothed.length; i++) {
        expect(hasLineOfSight(grid, smoothed[i - 1], smoothed[i])).toBe(true);
      }
    }
  });

  it('keeps the next point when no later point is in line of sight', () => {
    const grid = createGrid(5, 3);

    // The path starts inside a blocked cell, which a search does when it
    // can't snap the start out of a wall.
    grid.setWalkable(0, 1, false);

    const path = [center(0, 1), center(1, 1), center(2, 1), center(3, 1)];

    expect(smoothGridPath(grid, path)).toEqual([
      center(0, 1),
      center(1, 1),
      center(3, 1),
    ]);
  });

  it('keeps going around costly cells the cheapest path went around', () => {
    // Mud across the middle of the grid, between the start and the goal.
    const grid = createGrid(9, 5);

    grid.fillCost({ minColumn: 3, minRow: 1, maxColumn: 5, maxRow: 3 }, 3);

    // Rightwards, leftwards, and up and to the left across the mud.
    const ends = [
      [center(0, 2), center(8, 2)],
      [center(8, 2), center(0, 2)],
      [center(8, 3), center(0, 1)],
    ];

    for (const [from, to] of ends) {
      const { status, points } = findGridPath(grid, from, to);
      const smoothed = smoothGridPath(grid, points);

      expect(status).toBe('found');
      expect(smoothed.length).toBeGreaterThan(2);
      expectSegmentsAvoidCost(grid, smoothed, 3);
      expect(pathCost(grid, smoothed)).toBeLessThanOrEqual(
        pathCost(grid, points),
      );
    }
  });

  it('keeps going around costly cells when the path crosses one of the same cost', () => {
    // A field of swamp the path goes around, and a river down column 8 it
    // has to cross, both costing 3.
    const grid = createGrid(12, 7);

    grid.fillCost({ minColumn: 3, minRow: 2, maxColumn: 5, maxRow: 4 }, 3);
    grid.fillCost({ minColumn: 8, minRow: 0, maxColumn: 8, maxRow: 6 }, 3);

    const { status, points } = findGridPath(grid, center(0, 3), center(11, 3));
    const smoothed = smoothGridPath(grid, points);

    expect(status).toBe('found');
    expect(smoothed.length).toBeGreaterThan(2);
    expectSegmentsAvoidCost(grid, smoothed, 3, (cell) => cell.column !== 8);
    expect(pathCost(grid, smoothed)).toBeLessThanOrEqual(
      pathCost(grid, points),
    );
  });

  it('smooths a path across costly cells it has to cross', () => {
    // A river down column 4 that every path crosses.
    const grid = createGrid(9, 5);

    grid.fillCost({ minColumn: 4, minRow: 0, maxColumn: 4, maxRow: 4 }, 3);

    const path = [
      center(0, 0),
      center(1, 1),
      center(2, 2),
      center(3, 2),
      center(4, 2),
      center(5, 2),
      center(6, 2),
      center(7, 3),
      center(8, 4),
    ];

    expect(smoothGridPath(grid, path)).toEqual([center(0, 0), center(8, 4)]);
  });

  it('takes a shortcut across cheaper cells', () => {
    const grid = createGrid(6, 3);

    grid.fillCost(cellRange(6, 3), 2);
    grid.fillCost({ minColumn: 0, minRow: 1, maxColumn: 5, maxRow: 1 }, 0.5);

    // The path detours along the costly row 0, and the straight shortcut
    // along the cheap row 1 costs less.
    const path = [
      center(0, 1),
      center(1, 0),
      center(2, 0),
      center(3, 0),
      center(4, 0),
      center(5, 1),
    ];

    expect(smoothGridPath(grid, path)).toEqual([center(0, 1), center(5, 1)]);
  });

  it('smooths a path across an open isometric room into one segment', () => {
    const grid = createNavigationGrid({
      cells: cellRange(8, 8),
      layout: createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
      origin: { x: 0.3, y: 0.7 },
    });
    const from = grid.cellToWorld(0, 7);
    const to = grid.cellToWorld(7, 0);
    const { points } = findGridPath(grid, from, to);

    expect(points.length).toBeGreaterThan(2);
    expect(smoothGridPath(grid, points)).toEqual([from, to]);
  });

  it('returns a new array of new points and leaves the path alone', () => {
    const grid = createGrid(5, 5);
    const path = [center(0, 0), center(1, 1), center(2, 2)];
    const copy = path.map((point) => ({ ...point }));
    const smoothed = smoothGridPath(grid, path);

    expect(path).toEqual(copy);
    expect(smoothed).toEqual([center(0, 0), center(2, 2)]);
    expect(smoothed[0]).not.toBe(path[0]);
    expect(smoothed[1]).not.toBe(path[2]);
  });

  it('returns an empty path for an empty path and a copy of a single point', () => {
    const grid = createGrid(3, 3);
    const point = center(1, 1);
    const smoothed = smoothGridPath(grid, [point]);

    expect(smoothGridPath(grid, [])).toEqual([]);
    expect(smoothed).toEqual([point]);
    expect(smoothed[0]).not.toBe(point);
  });

  it('throws for a point that is not finite', () => {
    const grid = createGrid(3, 3);

    expect(() =>
      smoothGridPath(grid, [center(0, 0), { x: Number.NaN, y: 0 }]),
    ).toThrow('point 1 (NaN, 0) isn');
  });
});
