import { describe, expect, it } from 'vitest';
import { createIsometricGridLayout } from '../../../math/grid-layout/create-isometric-grid-layout.js';
import { createOrthogonalGridLayout } from '../../../math/grid-layout/create-orthogonal-grid-layout.js';
import { createNavigationGrid } from '../create-navigation-grid.js';
import {
  cellInset,
  createCellFrame,
  pointToQuadDistance,
  segmentToQuadDistance,
  worldToCellSpace,
  writeInsetQuad,
} from './cell-distance.js';

const unitSquare = new Float64Array([0, 0, 10, 0, 10, 10, 0, 10]);

describe('createCellFrame', () => {
  it('measures the steps, reach and world bounds of an orthogonal grid', () => {
    const frame = createCellFrame(
      createNavigationGrid({
        columns: 4,
        rows: 3,
        layout: createOrthogonalGridLayout({ cellWidth: 32, cellHeight: 16 }),
        origin: { x: 10, y: -5 },
      }),
    );

    expect(frame.columnStep).toEqual({ x: 32, y: 0 });
    expect(frame.rowStep).toEqual({ x: 0, y: 16 });
    expect(frame.columnReach).toBeCloseTo(1 / 32);
    expect(frame.rowReach).toBeCloseTo(1 / 16);
    expect(frame.worldMin).toEqual({ x: 10, y: -5 });
    expect(frame.worldMax).toEqual({ x: 138, y: 43 });
  });

  it('bounds an isometric grid by its diamond', () => {
    const frame = createCellFrame(
      createNavigationGrid({
        columns: 2,
        rows: 2,
        layout: createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
      }),
    );

    expect(frame.worldMin).toEqual({ x: -64, y: 0 });
    expect(frame.worldMax).toEqual({ x: 64, y: 64 });
  });

  it('reaches far enough along each axis for any direction', () => {
    const frame = createCellFrame(
      createNavigationGrid({
        columns: 2,
        rows: 2,
        layout: createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
      }),
    );

    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      const point = worldToCellSpace(frame, {
        x: Math.cos(angle),
        y: Math.sin(angle),
      });

      expect(Math.abs(point.x)).toBeLessThanOrEqual(frame.columnReach + 1e-12);
      expect(Math.abs(point.y)).toBeLessThanOrEqual(frame.rowReach + 1e-12);
    }
  });
});

describe('writeInsetQuad', () => {
  it("writes the cell's corners moved inwards by the inset", () => {
    const frame = createCellFrame(
      createNavigationGrid({
        columns: 4,
        rows: 4,
        layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
        origin: { x: 100, y: 0 },
      }),
    );
    const quad = new Float64Array(8);
    const near = cellInset * 16;

    writeInsetQuad(frame, 1, 2, quad);

    const expected = [
      116 + near,
      32 + near,
      132 - near,
      32 + near,
      132 - near,
      48 - near,
      116 + near,
      48 - near,
    ];

    expected.forEach((value, i) => {
      expect(quad[i]).toBeCloseTo(value, 9);
    });
  });
});

describe('pointToQuadDistance', () => {
  it('is 0 inside the quad and on its edge', () => {
    expect(pointToQuadDistance(5, 5, unitSquare)).toBe(0);
    expect(pointToQuadDistance(10, 3, unitSquare)).toBe(0);
  });

  it('measures to the nearest edge or corner outside it', () => {
    expect(pointToQuadDistance(13, 5, unitSquare)).toBe(3);
    expect(pointToQuadDistance(13, 14, unitSquare)).toBe(5);
  });
});

describe('segmentToQuadDistance', () => {
  it('is 0 for a segment with an end inside the quad', () => {
    expect(segmentToQuadDistance(5, 5, 50, 50, unitSquare)).toBe(0);
  });

  it('is 0 for a segment that crosses the quad', () => {
    expect(segmentToQuadDistance(-5, 5, 15, 6, unitSquare)).toBe(0);
  });

  it('measures from a quad corner to the segment', () => {
    expect(segmentToQuadDistance(13, 17, 17, 13, unitSquare)).toBeCloseTo(
      Math.hypot(5, 5),
    );
  });

  it('measures from a segment end to a quad edge', () => {
    expect(segmentToQuadDistance(4, -2, 6, -20, unitSquare)).toBe(2);
  });

  it('measures a segment parallel to an edge', () => {
    expect(segmentToQuadDistance(-5, 12, 15, 12, unitSquare)).toBe(2);
  });
});
