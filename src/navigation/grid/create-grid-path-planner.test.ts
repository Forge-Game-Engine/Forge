import { describe, expect, it } from 'vitest';
import { createIsometricGridLayout } from '../../math/grid-layout/create-isometric-grid-layout.js';
import { createOrthogonalGridLayout } from '../../math/grid-layout/create-orthogonal-grid-layout.js';
import { Vector2 } from '../../math/vector2.js';
import { cellRange } from '../test-helpers/cell-range.js';
import { createGridPathPlanner } from './create-grid-path-planner.js';
import { createNavigationGrid } from './create-navigation-grid.js';
import { findGridPath } from './find-grid-path.js';
import { NavigationGrid } from './navigation-grid.js';

const layout = createOrthogonalGridLayout({ cellWidth: 10, cellHeight: 10 });

const createGrid = (columns: number, rows: number): NavigationGrid =>
  createNavigationGrid({ cells: cellRange(columns, rows), layout });

/** The world centre of a cell of a grid made by `createGrid`. */
const center = (column: number, row: number): Vector2 => ({
  x: column * 10 + 5,
  y: row * 10 + 5,
});

/** A wall down column 3, rows 0 to 3, on an 8 x 6 grid. */
const createWalledGrid = (): NavigationGrid => {
  const grid = createGrid(8, 6);

  grid.fillWalkable(
    { minColumn: 3, minRow: 0, maxColumn: 3, maxRow: 3 },
    false,
  );

  return grid;
};

describe('createGridPathPlanner', () => {
  it('plans one straight segment from the unit to the target across open ground', () => {
    const planner = createGridPathPlanner(createGrid(8, 8));
    const from = { x: 12, y: 13 };
    const to = { x: 66, y: 71 };

    const result = planner.planPath(from, to);

    expect(result.status).toBe('found');
    expect(result.points).toEqual([from, to]);
    expect(result.points[0]).not.toBe(from);
    expect(result.points[1]).not.toBe(to);
  });

  it('turns at the corner of a wall when smoothed', () => {
    const grid = createWalledGrid();
    const planner = createGridPathPlanner(grid);
    const from = { x: 13, y: 12 };
    const to = { x: 57, y: 14 };

    const { status, points } = planner.planPath(from, to);

    expect(status).toBe('found');
    expect(points[0]).toEqual(from);
    expect(points[points.length - 1]).toEqual(to);
    expect(points.length).toBeGreaterThan(2);
    // Every corner it keeps is below the wall.
    expect(points.slice(1, -1).every((point) => point.y > 40)).toBe(true);
  });

  it('walks cell centre to cell centre when not smoothed', () => {
    const grid = createWalledGrid();
    const planner = createGridPathPlanner(grid, { smooth: false });
    const from = { x: 13, y: 12 };
    const to = { x: 57, y: 14 };

    const { points } = planner.planPath(from, to);
    const raw = findGridPath(grid, from, to);

    expect(points).toEqual([from, ...raw.points, to]);
  });

  it('ends at the snapped cell centre for a target inside a wall', () => {
    const grid = createWalledGrid();
    const planner = createGridPathPlanner(grid);
    const inWall = { x: 34, y: 15 };

    const { status, points } = planner.planPath({ x: 13, y: 12 }, inWall);

    expect(status).toBe('found');
    expect(points[points.length - 1]).not.toEqual(inWall);

    const end = points[points.length - 1];
    const cell = grid.worldToCell(end);

    expect(cell).not.toBeNull();
    expect(end).toEqual(grid.cellToWorld(cell!.column, cell!.row));
    expect(grid.isWalkable(cell!.column, cell!.row)).toBe(true);
  });

  it('ends an unreachable path at a cell centre, starting from the unit', () => {
    const grid = createGrid(8, 6);

    // Wall in the right-hand column entirely.
    grid.fillWalkable(
      { minColumn: 6, minRow: 0, maxColumn: 6, maxRow: 5 },
      false,
    );

    const planner = createGridPathPlanner(grid, {
      smooth: false,
      snapRadius: 0,
    });
    const from = { x: 13, y: 12 };
    const result = planner.planPath(from, center(7, 3));
    const raw = findGridPath(grid, from, center(7, 3), { snapRadius: 0 });

    expect(result.status).toBe('unreachable');
    expect(result.expanded).toBe(raw.expanded);
    expect(result.points).toEqual([from, ...raw.points]);
  });

  it('builds a cut-short path, unless keepPartialPath is false', () => {
    const planner = createGridPathPlanner(createWalledGrid());
    const from = { x: 13, y: 12 };
    const to = { x: 57, y: 14 };

    const kept = planner.planPath(from, to, { maxExpanded: 3 });

    expect(kept.status).toBe('limitReached');
    expect(kept.expanded).toBe(3);
    expect(kept.points[0]).toEqual(from);
    expect(kept.points.length).toBeGreaterThanOrEqual(2);

    const dropped = planner.planPath(from, to, {
      maxExpanded: 3,
      keepPartialPath: false,
    });

    expect(dropped).toEqual({
      status: 'limitReached',
      points: [],
      expanded: 3,
    });
  });

  it("doesn't change a found or unreachable result with keepPartialPath false", () => {
    const planner = createGridPathPlanner(createWalledGrid());
    const from = { x: 13, y: 12 };
    const to = { x: 57, y: 14 };

    expect(planner.planPath(from, to, { keepPartialPath: false })).toEqual(
      planner.planPath(from, to),
    );
  });

  it("follows the grid's version", () => {
    const grid = createGrid(4, 4);
    const planner = createGridPathPlanner(grid);

    expect(planner.version).toBe(0);

    grid.setWalkable(1, 1, false);

    expect(planner.version).toBe(grid.version);
    expect(planner.version).toBe(1);
  });

  it('defaults maxPathDistance to one cell', () => {
    expect(createGridPathPlanner(createGrid(2, 2)).maxPathDistance).toBe(10);

    const tall = createNavigationGrid({
      cells: cellRange(2, 2),
      layout: createOrthogonalGridLayout({ cellWidth: 8, cellHeight: 12 }),
    });

    expect(createGridPathPlanner(tall).maxPathDistance).toBe(12);

    const isometric = createNavigationGrid({
      cells: cellRange(2, 2),
      layout: createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
    });

    expect(createGridPathPlanner(isometric).maxPathDistance).toBeCloseTo(
      Math.hypot(32, 16),
    );

    expect(
      createGridPathPlanner(createGrid(2, 2), { maxPathDistance: Infinity })
        .maxPathDistance,
    ).toBe(Infinity);
  });

  it('throws for invalid options', () => {
    const grid = createGrid(2, 2);

    expect(() => createGridPathPlanner(grid, { snapRadius: -1 })).toThrow(
      /snapRadius/,
    );
    expect(() => createGridPathPlanner(grid, { snapRadius: 1.5 })).toThrow(
      /snapRadius/,
    );
    expect(() => createGridPathPlanner(grid, { maxPathDistance: 0 })).toThrow(
      /maxPathDistance/,
    );
    expect(() =>
      createGridPathPlanner(grid, { maxPathDistance: Number.NaN }),
    ).toThrow(/maxPathDistance/);
  });
});
