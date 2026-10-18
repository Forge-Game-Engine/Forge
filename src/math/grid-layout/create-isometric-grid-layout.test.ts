import { describe, expect, it } from 'vitest';
import { createIsometricGridLayout } from './create-isometric-grid-layout.js';
import { describeGridLayoutContract } from './test-helpers/grid-layout-contract.js';

describeGridLayoutContract(
  'createIsometricGridLayout',
  createIsometricGridLayout,
  ({ cellWidth, cellHeight }) => (cellWidth * cellHeight) / 2,
);

describe('createIsometricGridLayout', () => {
  const layout = createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 });

  it('puts cell (1, 0) at (32, 32) and maps it back', () => {
    expect(layout.getCellCenter(1, 0)).toEqual({ x: 32, y: 32 });
    expect(layout.localToCell({ x: 32, y: 32 })).toEqual({
      column: 1,
      row: 0,
    });
  });

  it('moves down and right along a column, and down and left along a row', () => {
    expect(layout.getCellCenter(0, 0)).toEqual({ x: 0, y: 16 });
    expect(layout.getCellCenter(0, 1)).toEqual({ x: -32, y: 32 });
    expect(layout.getCellCenter(1, 1)).toEqual({ x: 0, y: 48 });
    expect(layout.getCellCenter(-1, 0)).toEqual({ x: -32, y: 0 });
  });

  it("returns cell (0, 0)'s diamond, starting at its top corner", () => {
    expect(layout.getCellPolygon(0, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 32, y: 16 },
      { x: 0, y: 32 },
      { x: -32, y: 16 },
    ]);
    expect(layout.getCellFootprintBounds(0, 0)).toEqual({
      min: { x: -32, y: 0 },
      max: { x: 32, y: 32 },
    });
  });

  it("gives cell (0, 0)'s corners to the cells that own them", () => {
    expect(layout.localToCell({ x: 0, y: 0 })).toEqual({ column: 0, row: 0 });
    expect(layout.localToCell({ x: 32, y: 16 })).toEqual({
      column: 1,
      row: 0,
    });
    expect(layout.localToCell({ x: 0, y: 32 })).toEqual({
      column: 1,
      row: 1,
    });
    expect(layout.localToCell({ x: -32, y: 16 })).toEqual({
      column: 0,
      row: 1,
    });
  });

  it('gives each cell its top-left and top-right edges', () => {
    // Midpoints of (0, 0)'s top-right and top-left edges.
    expect(layout.localToCell({ x: 16, y: 8 })).toEqual({ column: 0, row: 0 });
    expect(layout.localToCell({ x: -16, y: 8 })).toEqual({
      column: 0,
      row: 0,
    });
    // Midpoints of its bottom-right and bottom-left edges.
    expect(layout.localToCell({ x: 16, y: 24 })).toEqual({
      column: 1,
      row: 0,
    });
    expect(layout.localToCell({ x: -16, y: 24 })).toEqual({
      column: 0,
      row: 1,
    });
  });

  it('converts to and from cell space', () => {
    expect(layout.localToCellSpace({ x: 32, y: 32 })).toEqual({
      x: 1.5,
      y: 0.5,
    });
    expect(layout.cellSpaceToLocal({ x: 1.5, y: 0.5 })).toEqual({
      x: 32,
      y: 32,
    });
  });

  it('returns the range of cells a rect overlaps', () => {
    expect(
      layout.getCellRangeForLocalRect({
        min: { x: -1, y: 1 },
        max: { x: 1, y: 31 },
      }),
    ).toEqual({ minColumn: 0, minRow: 0, maxColumn: 0, maxRow: 0 });
    expect(
      layout.getCellRangeForLocalRect({
        min: { x: 0, y: 0 },
        max: { x: 64, y: 32 },
      }),
    ).toEqual({ minColumn: 0, minRow: -1, maxColumn: 2, maxRow: 1 });
  });
});
