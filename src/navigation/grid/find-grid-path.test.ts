import { describe, expect, it } from 'vitest';
import { createIsometricGridLayout } from '../../math/grid-layout/create-isometric-grid-layout.js';
import { createOrthogonalGridLayout } from '../../math/grid-layout/create-orthogonal-grid-layout.js';
import { Vector2 } from '../../math/vector2.js';
import { cellRange } from '../test-helpers/cell-range.js';
import { createNavigationGrid } from './create-navigation-grid.js';
import { findGridPath } from './find-grid-path.js';
import { NavigationGrid, NavigationGridDiagonals } from './navigation-grid.js';

const layout = createOrthogonalGridLayout({ cellWidth: 10, cellHeight: 10 });

const isometricLayout = createIsometricGridLayout({
  cellWidth: 64,
  cellHeight: 32,
});

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

describe('findGridPath', () => {
  it('goes around a wall without cutting its corners', () => {
    // A wall down column 3, rows 0 to 3, on a 7 x 6 grid.
    const grid = createGrid(7, 6);

    grid.fillWalkable(
      { minColumn: 3, minRow: 0, maxColumn: 3, maxRow: 3 },
      false,
    );

    const result = findGridPath(grid, center(1, 1), center(5, 1));

    expect(result.status).toBe('found');
    expect(result.startSnapped).toBe(false);
    expect(result.goalSnapped).toBe(false);
    expect(result.startCell).toEqual({ column: 1, row: 1 });
    expect(result.goalCell).toEqual({ column: 5, row: 1 });
    expect(result.points).toHaveLength(result.nodes.length);

    const cells = result.nodes.map((node) => grid.nodeToCell(node));

    expect(result.points).toEqual(
      cells.map(({ column, row }) => grid.cellToWorld(column, row)),
    );

    // It passes below the wall, through row 4.
    expect(cells).toContainEqual({ column: 3, row: 4 });

    for (let i = 1; i < cells.length; i++) {
      const from = cells[i - 1];
      const to = cells[i];

      expect(grid.isWalkable(to.column, to.row)).toBe(true);

      if (from.column !== to.column && from.row !== to.row) {
        expect(grid.isWalkable(to.column, from.row)).toBe(true);
        expect(grid.isWalkable(from.column, to.row)).toBe(true);
      }
    }
  });

  it('walks around costly cells when the detour is cheaper, and through them when it is not', () => {
    const grid = createGrid(5, 3, 'never');

    // A band of cost-6 cells across column 2, rows 0 and 1.
    grid.fillCost({ minColumn: 2, minRow: 0, maxColumn: 2, maxRow: 1 }, 6);

    const around = findGridPath(grid, center(0, 0), center(4, 0));

    // Straight through costs 10 + 60 + 10 + 10; around costs 8 steps of 10.
    expect(around.cost).toBe(80);
    expect(around.nodes).toContain(grid.cellToNode(2, 2));

    grid.setCost(2, 2, 6);

    const through = findGridPath(grid, center(0, 0), center(4, 0));

    expect(through.cost).toBe(90);
    expect(through.nodes).toEqual([0, 1, 2, 3, 4]);
  });

  it('snaps a blocked start and goal to the nearest walkable cell', () => {
    const grid = createGrid(7, 3);

    grid.fillWalkable(
      { minColumn: 0, minRow: 0, maxColumn: 1, maxRow: 2 },
      false,
    );
    grid.setWalkable(5, 1, false);

    // Just inside the wall's right edge, and slightly right of cell 5's
    // centre, so cell 6 is the nearest walkable centre in the first ring.
    const result = findGridPath(grid, { x: -31, y: -35 }, { x: 6, y: -35 });

    expect(result.startSnapped).toBe(true);
    expect(result.startCell).toEqual({ column: 2, row: 1 });
    expect(result.goalSnapped).toBe(true);
    expect(result.goalCell).toEqual({ column: 6, row: 1 });
    expect(result.status).toBe('found');
    expect(result.points[0]).toEqual(center(2, 1));
    expect(result.points.at(-1)).toEqual(center(6, 1));
  });

  it('breaks ties between equally near cells by the lower node id', () => {
    const grid = createGrid(3, 3);

    grid.setWalkable(1, 1, false);

    const result = findGridPath(grid, center(1, 1), center(0, 0));

    // (1, 0), (0, 1), (2, 1) and (1, 2) are all one cell away.
    expect(result.startCell).toEqual({ column: 1, row: 0 });
  });

  it('snaps from a corner cell, where the rings are cut off by the edges', () => {
    const grid = createGrid(4, 4);

    grid.fillWalkable(
      { minColumn: 0, minRow: 0, maxColumn: 1, maxRow: 1 },
      false,
    );

    const result = findGridPath(grid, center(0, 0), center(3, 3));

    // (2, 0) and (0, 2) are as near, and (2, 0) has the lower node id.
    expect(result.startSnapped).toBe(true);
    expect(result.startCell).toEqual({ column: 2, row: 0 });
    expect(result.status).toBe('found');
  });

  it('leaves both ends with a snapRadius of 0', () => {
    const grid = createGrid(5, 3);

    grid.setWalkable(0, 1, false);
    grid.fillWalkable(
      { minColumn: 4, minRow: 0, maxColumn: 4, maxRow: 2 },
      false,
    );

    const result = findGridPath(grid, center(0, 1), center(4, 1), {
      snapRadius: 0,
    });

    expect(result.startSnapped).toBe(false);
    expect(result.goalSnapped).toBe(false);
    expect(result.startCell).toEqual({ column: 0, row: 1 });
    // The start steps out of its wall; the goal can't be entered.
    expect(result.status).toBe('unreachable');
    expect(result.nodes[0]).toBe(grid.cellToNode(0, 1));
    expect(grid.nodeToCell(result.nodes.at(-1) ?? -1)).toEqual({
      column: 3,
      row: 1,
    });
  });

  it('heads as close as it can to a goal buried deeper than snapRadius', () => {
    const grid = createGrid(9, 1);

    grid.fillWalkable(
      { minColumn: 3, minRow: 0, maxColumn: 8, maxRow: 0 },
      false,
    );

    const result = findGridPath(grid, center(0, 0), center(8, 0), {
      snapRadius: 2,
    });

    expect(result.goalSnapped).toBe(false);
    expect(result.goalCell).toEqual({ column: 8, row: 0 });
    expect(result.status).toBe('unreachable');
    expect(result.points).toEqual([center(0, 0), center(1, 0), center(2, 0)]);
  });

  it('clamps an end outside the grid to the nearest edge cell', () => {
    const grid = createGrid(5, 5);
    const result = findGridPath(grid, { x: -500, y: -45 }, { x: -25, y: 500 });

    expect(result.startCell).toEqual({ column: 0, row: 0 });
    expect(result.startSnapped).toBe(true);
    expect(result.goalCell).toEqual({ column: 2, row: 4 });
    expect(result.goalSnapped).toBe(true);
    expect(result.status).toBe('found');
  });

  it('starts from the edge cell nearest in the world on an isometric layout', () => {
    const grid = createNavigationGrid({
      cells: cellRange(4, 8),
      layout: isometricLayout,
    });
    // Cell space (-3, 5): clamping the column alone would give row 5, but
    // the nearest point of the column-0 edge is at row 6.8.
    const outside = isometricLayout.cellSpaceToLocal({ x: -3, y: 5 });
    const result = findGridPath(grid, outside, grid.cellToWorld(3, 0), {
      snapRadius: 0,
    });

    expect(result.startCell).toEqual({ column: 0, row: 6 });
    expect(result.startSnapped).toBe(true);
  });

  it('starts from the edge cell nearest in the world on an isometric grid of negative cells', () => {
    // The grid above, moved by (-5, -3) cells.
    const grid = createNavigationGrid({
      cells: cellRange(4, 8, -5, -3),
      layout: isometricLayout,
    });
    const outside = isometricLayout.cellSpaceToLocal({ x: -8, y: 2 });
    const result = findGridPath(grid, outside, grid.cellToWorld(-2, -3), {
      snapRadius: 0,
    });

    expect(result.startCell).toEqual({ column: -5, row: 3 });
    expect(result.startSnapped).toBe(true);
  });

  it('snaps an end outside the grid past a blocked edge cell', () => {
    const grid = createGrid(5, 5);

    grid.setWalkable(4, 2, false);

    const result = findGridPath(grid, center(0, 2), { x: 100, y: -25 });

    // (4, 1) and (4, 3) are as near, and (4, 1) has the lower node id.
    expect(result.goalSnapped).toBe(true);
    expect(result.goalCell).toEqual({ column: 4, row: 1 });
  });

  describe('on an isometric grid with its centre cell blocked', () => {
    const origin = { x: 40, y: -24 };

    // A 3 x 3 grid of 64 x 32 diamonds. A step along a column or a row
    // runs along a diamond's edge, sqrt(32^2 + 16^2) long; a (1, 1) step is
    // 32 straight down the screen and a (1, -1) step 64 straight across.
    const createDetourGrid = (
      diagonals: NavigationGridDiagonals,
    ): NavigationGrid => {
      const grid = createNavigationGrid({
        cells: cellRange(3, 3),
        layout: isometricLayout,
        origin,
        diagonals,
      });

      grid.setWalkable(1, 1, false);

      return grid;
    };

    const getWorldLength = (points: readonly Vector2[]): number => {
      let length = 0;

      for (let i = 1; i < points.length; i++) {
        length += Math.hypot(
          points[i].x - points[i - 1].x,
          points[i].y - points[i - 1].y,
        );
      }

      return length;
    };

    it("goes round the blocked cell along the diamonds' edges with 'noCornerCutting'", () => {
      const grid = createDetourGrid('noCornerCutting');
      const result = findGridPath(
        grid,
        grid.cellToWorld(0, 1),
        grid.cellToWorld(2, 1),
      );

      expect(result.status).toBe('found');
      // Both diagonal steps out of (0, 1) pass the blocked cell, so the path
      // takes four edge steps, along the top or the bottom row; they tie.
      expect(result.cost).toBeCloseTo(4 * Math.hypot(32, 16), 9);
      expect(getWorldLength(result.points)).toBeCloseTo(result.cost, 9);
      expect(result.points).toHaveLength(5);

      const cells = result.nodes.map((node) => grid.nodeToCell(node));

      for (const [i, { column, row }] of cells.entries()) {
        const center = isometricLayout.getCellCenter(column, row);

        expect(grid.isWalkable(column, row)).toBe(true);
        expect(result.points[i]).toEqual({
          x: center.x + origin.x,
          y: center.y + origin.y,
        });
      }

      for (let i = 1; i < cells.length; i++) {
        expect(
          Math.abs(cells[i].column - cells[i - 1].column) +
            Math.abs(cells[i].row - cells[i - 1].row),
        ).toBe(1);
      }
    });

    it("cuts past the blocked cell's corner, straight down and across the screen, with 'always'", () => {
      const grid = createDetourGrid('always');
      const result = findGridPath(
        grid,
        grid.cellToWorld(0, 1),
        grid.cellToWorld(2, 1),
      );

      expect(result.status).toBe('found');
      // One 64-unit step across and one 32-unit step down, in either order:
      // shorter in the world than the four edge steps.
      expect(result.cost).toBe(96);
      expect(getWorldLength(result.points)).toBeCloseTo(96, 9);
      expect(result.points).toHaveLength(3);
      expect([grid.cellToWorld(1, 0), grid.cellToWorld(1, 2)]).toContainEqual(
        result.points[1],
      );
    });
  });

  it('finds a one-point path when both ends are in the same cell', () => {
    const grid = createGrid(3, 3);
    const result = findGridPath(grid, { x: -49, y: -49 }, { x: -41, y: -41 });

    expect(result.status).toBe('found');
    expect(result.points).toEqual([center(0, 0)]);
    expect(result.cost).toBe(0);
  });

  it('passes maxExpanded to the search', () => {
    const grid = createGrid(20, 1);
    const result = findGridPath(grid, center(0, 0), center(19, 0), {
      maxExpanded: 5,
    });

    expect(result.status).toBe('limitReached');
    expect(result.expanded).toBe(5);
    expect(result.points.length).toBeLessThan(20);
  });

  it('throws for positions that are not finite', () => {
    const grid = createGrid(3, 3);

    expect(() => findGridPath(grid, { x: NaN, y: 0 }, { x: 0, y: 0 })).toThrow(
      "fromWorld (NaN, 0) isn't finite",
    );
    expect(() =>
      findGridPath(grid, { x: 0, y: 0 }, { x: 0, y: Infinity }),
    ).toThrow("toWorld (0, Infinity) isn't finite");
  });

  it.each([-1, 1.5, NaN])('throws for a snapRadius of %s', (snapRadius) => {
    const grid = createGrid(3, 3);

    expect(() =>
      findGridPath(grid, center(0, 0), center(2, 2), { snapRadius }),
    ).toThrow('it must be an integer of at least 0');
  });
});
