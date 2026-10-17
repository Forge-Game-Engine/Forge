import { describe, expect, it } from 'vitest';
import { createOrthogonalGridLayout } from './create-orthogonal-grid-layout.js';
import { describeGridLayoutContract } from './test-helpers/grid-layout-contract.js';

describeGridLayoutContract(
  'createOrthogonalGridLayout',
  createOrthogonalGridLayout,
  ({ cellWidth, cellHeight }) => cellWidth * cellHeight,
);

describe('createOrthogonalGridLayout', () => {
  const layout = createOrthogonalGridLayout({ cellWidth: 64, cellHeight: 32 });

  it('puts cell (1, 0) at (96, 16) and maps it back', () => {
    expect(layout.getCellCenter(1, 0)).toEqual({ x: 96, y: 16 });
    expect(layout.localToCell({ x: 96, y: 16 })).toEqual({
      column: 1,
      row: 0,
    });
  });

  it('puts rows below each other, Y-down', () => {
    expect(layout.getCellCenter(0, 1)).toEqual({ x: 32, y: 48 });
    expect(layout.getCellCenter(-1, -1)).toEqual({ x: -32, y: -16 });
    expect(layout.localToCell({ x: -1, y: -1 })).toEqual({
      column: -1,
      row: -1,
    });
  });

  it("returns a cell's rect, starting at its top-left corner", () => {
    expect(layout.getCellPolygon(1, 2)).toEqual([
      { x: 64, y: 64 },
      { x: 128, y: 64 },
      { x: 128, y: 96 },
      { x: 64, y: 96 },
    ]);
    expect(layout.getCellFootprintBounds(1, 2)).toEqual({
      min: { x: 64, y: 64 },
      max: { x: 128, y: 96 },
    });
  });

  it('gives each cell its top and left edges and its top-left corner', () => {
    expect(layout.localToCell({ x: 64, y: 32 })).toEqual({
      column: 1,
      row: 1,
    });
    expect(layout.localToCell({ x: 64, y: 40 })).toEqual({
      column: 1,
      row: 1,
    });
    expect(layout.localToCell({ x: 70, y: 32 })).toEqual({
      column: 1,
      row: 1,
    });
  });

  it('converts to and from cell space', () => {
    expect(layout.localToCellSpace({ x: 96, y: 8 })).toEqual({
      x: 1.5,
      y: 0.25,
    });
    expect(layout.cellSpaceToLocal({ x: 1.5, y: 0.25 })).toEqual({
      x: 96,
      y: 8,
    });
  });

  it('returns the cells a rect overlaps', () => {
    expect(
      layout.getCellRangeForLocalRect({
        min: { x: -10, y: 0 },
        max: { x: 128, y: 31 },
      }),
    ).toEqual({ minColumn: -1, minRow: 0, maxColumn: 2, maxRow: 0 });
  });
});
