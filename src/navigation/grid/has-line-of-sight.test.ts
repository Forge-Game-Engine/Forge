import { describe, expect, it } from 'vitest';
import { createIsometricGridLayout } from '../../math/grid-layout/create-isometric-grid-layout.js';
import { createOrthogonalGridLayout } from '../../math/grid-layout/create-orthogonal-grid-layout.js';
import { Vector2 } from '../../math/vector2.js';
import { cellRange } from '../test-helpers/cell-range.js';
import { createNavigationGrid } from './create-navigation-grid.js';
import { hasLineOfSight } from './has-line-of-sight.js';
import { NavigationGrid } from './navigation-grid.js';

const layout = createOrthogonalGridLayout({ cellWidth: 10, cellHeight: 10 });

const createGrid = (columns: number, rows: number): NavigationGrid =>
  createNavigationGrid({
    cells: cellRange(columns, rows),
    layout,
    origin: { x: -50, y: -50 },
  });

/** The world centre of a cell of a grid made by `createGrid`. */
const center = (column: number, row: number): Vector2 => ({
  x: -50 + column * 10 + 5,
  y: -50 + row * 10 + 5,
});

/** A world position of a grid made by `createGrid`, in cell units. */
const at = (x: number, y: number): Vector2 => ({
  x: -50 + x * 10,
  y: -50 + y * 10,
});

/**
 * Checks whether a segment touches a closed unit square, by clipping the
 * segment to the square's four sides.
 * @param from - The segment's start, in cell space.
 * @param to - The segment's end, in cell space.
 * @param column - The square's column.
 * @param row - The square's row.
 * @returns `true` if any point of the segment is in the square or on its
 * boundary.
 */
const touchesCell = (
  from: Vector2,
  to: Vector2,
  column: number,
  row: number,
): boolean => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const sides = [
    { p: -dx, q: from.x - column },
    { p: dx, q: column + 1 - from.x },
    { p: -dy, q: from.y - row },
    { p: dy, q: row + 1 - from.y },
  ];
  let t0 = 0;
  let t1 = 1;

  for (const { p, q } of sides) {
    if (p === 0) {
      if (q < 0) {
        return false;
      }

      continue;
    }

    const t = q / p;

    if (p < 0) {
      t0 = Math.max(t0, t);
    } else {
      t1 = Math.min(t1, t);
    }
  }

  return t0 <= t1;
};

/**
 * Checks every cell near a segment, one by one, for a grid whose world
 * positions are cell space.
 * @param grid - The grid, with cells from `(-1, -1)` to `(12, 12)` at most.
 * @param from - The segment's start.
 * @param to - The segment's end.
 * @returns `true` if every cell the segment touches is in the grid and
 * walkable.
 */
const isEveryTouchedCellOpen = (
  grid: NavigationGrid,
  from: Vector2,
  to: Vector2,
): boolean => {
  for (let column = -2; column < 14; column++) {
    for (let row = -2; row < 14; row++) {
      const isOpen = grid.hasCell(column, row) && grid.isWalkable(column, row);

      if (!isOpen && touchesCell(from, to, column, row)) {
        return false;
      }
    }
  }

  return true;
};

/** A deterministic pseudo-random number generator, from `0` up to `1`. */
const createRandom = (seed: number): (() => number) => {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;

    return state / 4294967296;
  };
};

describe('hasLineOfSight', () => {
  it('sees across an open grid', () => {
    const grid = createGrid(8, 6);

    expect(hasLineOfSight(grid, center(0, 0), center(7, 5))).toBe(true);
    expect(hasLineOfSight(grid, center(7, 0), center(0, 5))).toBe(true);
    expect(hasLineOfSight(grid, center(3, 5), center(3, 0))).toBe(true);
  });

  it('is blocked by a blocked cell on the segment', () => {
    const grid = createGrid(8, 6);

    grid.setWalkable(4, 2, false);

    expect(hasLineOfSight(grid, center(0, 2), center(7, 2))).toBe(false);
    expect(hasLineOfSight(grid, center(7, 2), center(0, 2))).toBe(false);
    expect(hasLineOfSight(grid, center(0, 1), center(7, 1))).toBe(true);
  });

  it('is blocked through an exact corner between two blocked cells', () => {
    const grid = createGrid(4, 4);

    grid.setWalkable(2, 1, false);
    grid.setWalkable(1, 2, false);

    expect(hasLineOfSight(grid, center(1, 1), center(2, 2))).toBe(false);
    expect(hasLineOfSight(grid, center(2, 2), center(1, 1))).toBe(false);
    expect(hasLineOfSight(grid, center(0, 0), center(3, 3))).toBe(false);
  });

  it('counts every cell at a corner it passes through, so it never clips a wall corner', () => {
    const grid = createGrid(4, 4);

    grid.setWalkable(2, 1, false);

    expect(hasLineOfSight(grid, center(1, 1), center(2, 2))).toBe(false);
    expect(hasLineOfSight(grid, center(1, 2), center(2, 1))).toBe(false);
    expect(hasLineOfSight(grid, center(1, 0), center(3, 0))).toBe(true);
  });

  it('is blocked by a cell whose edge it only grazes', () => {
    const grid = createGrid(6, 3);

    grid.setWalkable(0, 1, false);

    // The segment starts on the edge between cells (0, 1) and (1, 1).
    expect(hasLineOfSight(grid, at(1, 1.5), center(5, 1))).toBe(false);
    expect(hasLineOfSight(grid, at(1.01, 1.5), center(5, 1))).toBe(true);
  });

  it('passes beside a blocked cell it does not touch', () => {
    const grid = createGrid(6, 3);

    grid.setWalkable(0, 1, false);
    grid.setWalkable(4, 0, false);

    // From (0.5, 0.5) to (4.5, 1.5) in cell units, which stays in row 0
    // across column 0 and in row 1 across column 4.
    expect(hasLineOfSight(grid, center(0, 0), center(4, 1))).toBe(true);
  });

  it('is blocked outside the grid', () => {
    const grid = createGrid(4, 4);

    expect(hasLineOfSight(grid, center(1, 1), at(5, 1.5))).toBe(false);
    expect(hasLineOfSight(grid, at(-1, -1), center(1, 1))).toBe(false);
    expect(hasLineOfSight(grid, at(-5, 2), at(-1, 2))).toBe(false);
  });

  it('checks the cell a zero-length segment is in', () => {
    const grid = createGrid(4, 4);

    grid.setWalkable(2, 2, false);

    expect(hasLineOfSight(grid, center(1, 1), center(1, 1))).toBe(true);
    expect(hasLineOfSight(grid, center(2, 2), center(2, 2))).toBe(false);
  });

  it('works on a grid whose cells start below (0, 0)', () => {
    const grid = createNavigationGrid({
      cells: cellRange(4, 4, -2, -2),
      layout,
      origin: { x: 3, y: -7 },
    });

    grid.setWalkable(-1, -1, false);

    const cellCenter = (column: number, row: number): Vector2 =>
      grid.cellToWorld(column, row);

    expect(hasLineOfSight(grid, cellCenter(-2, -2), cellCenter(1, -2))).toBe(
      true,
    );
    expect(hasLineOfSight(grid, cellCenter(-2, -2), cellCenter(1, 1))).toBe(
      false,
    );
  });

  it('follows the diamonds of an isometric grid', () => {
    const grid = createNavigationGrid({
      cells: cellRange(6, 6),
      layout: createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
      origin: { x: 0.3, y: 0.7 },
    });
    const cellCenter = (column: number, row: number): Vector2 =>
      grid.cellToWorld(column, row);

    // Straight right on screen, from cell (2, 3) to (3, 2), through the
    // corner the two share with cells (2, 2) and (3, 3).
    expect(hasLineOfSight(grid, cellCenter(2, 3), cellCenter(3, 2))).toBe(true);

    grid.setWalkable(3, 3, false);

    expect(hasLineOfSight(grid, cellCenter(2, 3), cellCenter(3, 2))).toBe(
      false,
    );
    expect(hasLineOfSight(grid, cellCenter(0, 0), cellCenter(5, 0))).toBe(true);
    expect(hasLineOfSight(grid, cellCenter(3, 0), cellCenter(3, 5))).toBe(
      false,
    );
  });

  it('agrees with a check of every cell the segment touches', () => {
    // One world unit per cell, so world positions are cell space.
    const grid = createNavigationGrid({
      cells: cellRange(12, 12),
      layout: createOrthogonalGridLayout({ cellWidth: 1, cellHeight: 1 }),
    });
    const random = createRandom(779);

    for (let column = 0; column < 12; column++) {
      for (let row = 0; row < 12; row++) {
        grid.setWalkable(column, row, random() > 0.08);
      }
    }

    let visible = 0;

    for (let i = 0; i < 2000; i++) {
      const from = { x: random() * 14 - 1, y: random() * 14 - 1 };
      const to = { x: random() * 14 - 1, y: random() * 14 - 1 };
      const expected = isEveryTouchedCellOpen(grid, from, to);

      if (expected) {
        visible++;
      }

      expect(hasLineOfSight(grid, from, to)).toBe(expected);
    }

    // Both answers come up often enough for the comparison to mean
    // something.
    expect(visible).toBeGreaterThan(100);
    expect(visible).toBeLessThan(1900);
  });

  it('throws for a position that is not finite', () => {
    const grid = createGrid(4, 4);

    expect(() =>
      hasLineOfSight(grid, { x: Number.NaN, y: 0 }, center(1, 1)),
    ).toThrow('fromWorld (NaN, 0) isn');
    expect(() =>
      hasLineOfSight(grid, center(1, 1), { x: 0, y: Infinity }),
    ).toThrow('toWorld (0, Infinity) isn');
  });
});
