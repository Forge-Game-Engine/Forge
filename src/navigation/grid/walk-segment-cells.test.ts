import { describe, expect, it } from 'vitest';
import { createIsometricGridLayout } from '../../math/grid-layout/create-isometric-grid-layout.js';
import { createOrthogonalGridLayout } from '../../math/grid-layout/create-orthogonal-grid-layout.js';
import { Vector2 } from '../../math/vector2.js';
import { cellRange } from '../test-helpers/cell-range.js';
import { createNavigationGrid } from './create-navigation-grid.js';
import { NavigationGrid } from './navigation-grid.js';
import { walkSegmentCells } from './walk-segment-cells.js';

const grid = createNavigationGrid({
  cells: cellRange(10, 10),
  layout: createOrthogonalGridLayout({ cellWidth: 10, cellHeight: 10 }),
  origin: { x: -50, y: -50 },
});

/** A world position of `grid`, in cell units. */
const at = (x: number, y: number): Vector2 => ({
  x: -50 + x * 10,
  y: -50 + y * 10,
});

/**
 * Walks a segment and records each cell's share of it.
 * @param walkedGrid - The grid.
 * @param from - The segment's start.
 * @param to - The segment's end.
 * @returns Each touched cell as `"column,row"`, mapped to its share.
 */
const shares = (
  walkedGrid: NavigationGrid,
  from: Vector2,
  to: Vector2,
): Map<string, number> => {
  const result = new Map<string, number>();

  walkSegmentCells(walkedGrid, from, to, (column, row, share) => {
    result.set(`${column},${row}`, share);

    return true;
  });

  return result;
};

const sum = (values: Map<string, number>): number =>
  [...values.values()].reduce((total, value) => total + value, 0);

describe('walkSegmentCells', () => {
  it('gives each cell of a horizontal segment its part of the length', () => {
    const result = shares(grid, at(1.5, 2.5), at(3.5, 2.5));

    expect([...result.keys()]).toEqual(['1,2', '2,2', '3,2']);
    expect(result.get('1,2')).toBeCloseTo(0.25);
    expect(result.get('2,2')).toBeCloseTo(0.5);
    expect(result.get('3,2')).toBeCloseTo(0.25);
  });

  it('gives a cell touched only at a corner no share', () => {
    const result = shares(grid, at(1.5, 1.5), at(2.5, 2.5));

    expect(result.get('1,1')).toBeCloseTo(0.5);
    expect(result.get('2,2')).toBeCloseTo(0.5);
    expect(result.get('1,2')).toBe(0);
    expect(result.get('2,1')).toBe(0);
    expect(sum(result)).toBeCloseTo(1);
  });

  it('splits a horizontal segment along a row edge between both rows', () => {
    const result = shares(grid, at(1.5, 3), at(2.5, 3));

    expect(result.get('1,2')).toBeCloseTo(0.25);
    expect(result.get('1,3')).toBeCloseTo(0.25);
    expect(result.get('2,2')).toBeCloseTo(0.25);
    expect(result.get('2,3')).toBeCloseTo(0.25);
  });

  it('splits a vertical segment along a column edge between both columns', () => {
    const result = shares(grid, at(4, 6.5), at(4, 5.5));

    expect([...result.keys()]).toEqual(['3,6', '3,5', '4,6', '4,5']);
    expect(sum(result)).toBeCloseTo(1);

    for (const share of result.values()) {
      expect(share).toBeCloseTo(0.25);
    }
  });

  it('gives every cell of a vertical segment inside a column its part', () => {
    const result = shares(grid, at(4.5, 6.5), at(4.5, 4.5));

    expect([...result.keys()]).toEqual(['4,6', '4,5', '4,4']);
    expect(result.get('4,6')).toBeCloseTo(0.25);
    expect(result.get('4,5')).toBeCloseTo(0.5);
    expect(result.get('4,4')).toBeCloseTo(0.25);
  });

  it('gives a segment walked backwards the same shares', () => {
    const pairs = [
      [at(0.2, 0.7), at(7.9, 3.1)],
      [at(1.5, 6.5), at(6.5, 1.5)],
      [at(2.5, 2.5), at(8.5, 2.5)],
    ];

    const byCell = (a: string, b: string): number => a.localeCompare(b);

    for (const [start, end] of pairs) {
      const forwards = shares(grid, start, end);
      const backwards = shares(grid, end, start);

      expect([...backwards.keys()].sort(byCell)).toEqual(
        [...forwards.keys()].sort(byCell),
      );

      for (const [cell, share] of backwards) {
        expect(share).toBeGreaterThanOrEqual(0);
        expect(share).toBeCloseTo(forwards.get(cell) ?? Number.NaN);
      }
    }
  });

  it('gives shares that add up to one for any segment', () => {
    const isometric = createNavigationGrid({
      cells: cellRange(8, 8),
      layout: createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
      origin: { x: 0.3, y: 0.7 },
    });

    expect(sum(shares(grid, at(0.2, 0.7), at(7.9, 3.1)))).toBeCloseTo(1);
    expect(sum(shares(grid, at(7.9, 3.1), at(0.2, 0.7)))).toBeCloseTo(1);
    expect(sum(shares(grid, at(2, 2), at(2, 2)))).toBeCloseTo(1);
    expect(
      sum(
        shares(
          isometric,
          isometric.cellToWorld(0, 7),
          isometric.cellToWorld(7, 0),
        ),
      ),
    ).toBeCloseTo(1);
  });

  it('stops when the visitor returns false', () => {
    const visited: string[] = [];
    const finished = walkSegmentCells(
      grid,
      at(0.5, 0.5),
      at(5.5, 0.5),
      (column, row) => {
        visited.push(`${column},${row}`);

        return column < 2;
      },
    );

    expect(finished).toBe(false);
    expect(visited).toEqual(['0,0', '1,0', '2,0']);
  });

  it('throws for a position that is not finite', () => {
    expect(() =>
      walkSegmentCells(grid, { x: Number.NaN, y: 0 }, at(0, 0), () => true),
    ).toThrow('fromWorld (NaN, 0) isn');
    expect(() =>
      walkSegmentCells(grid, at(0, 0), { x: 0, y: Infinity }, () => true),
    ).toThrow('toWorld (0, Infinity) isn');
  });
});
