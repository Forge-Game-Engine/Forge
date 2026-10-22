import { describe, expect, it } from 'vitest';
import { createIsometricGridLayout } from '../../math/grid-layout/create-isometric-grid-layout.js';
import { createOrthogonalGridLayout } from '../../math/grid-layout/create-orthogonal-grid-layout.js';
import { createGridMetric, getGridDistance } from './grid-metric.js';

describe('createGridMetric', () => {
  it('measures the steps of a rectangular orthogonal layout', () => {
    const metric = createGridMetric(
      createOrthogonalGridLayout({ cellWidth: 32, cellHeight: 16 }),
    );

    expect(metric.columnLength).toBe(32);
    expect(metric.rowLength).toBe(16);
    expect(metric.sameSignDiagonalLength).toBeCloseTo(Math.hypot(32, 16));
    expect(metric.oppositeSignDiagonalLength).toBeCloseTo(Math.hypot(32, 16));
  });

  it('measures the steps of an isometric layout', () => {
    const metric = createGridMetric(
      createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
    );

    expect(metric.columnLength).toBeCloseTo(Math.hypot(32, 16));
    expect(metric.rowLength).toBeCloseTo(Math.hypot(32, 16));
    // Down the screen, and across it.
    expect(metric.sameSignDiagonalLength).toBe(32);
    expect(metric.oppositeSignDiagonalLength).toBe(64);
  });
});

describe('getGridDistance', () => {
  const square = createGridMetric(
    createOrthogonalGridLayout({ cellWidth: 10, cellHeight: 10 }),
  );

  it('is Manhattan distance without diagonals on square cells', () => {
    expect(getGridDistance(square, 3, -4, false)).toBe(70);
    expect(getGridDistance(square, 0, 0, false)).toBe(0);
  });

  it('is octile distance with diagonals on square cells', () => {
    expect(getGridDistance(square, 3, -5, true)).toBeCloseTo(
      30 * Math.SQRT2 + 20,
    );
    expect(getGridDistance(square, -6, 2, true)).toBeCloseTo(
      20 * Math.SQRT2 + 40,
    );
  });

  it('uses the diagonal that matches the offset on an isometric layout', () => {
    const isometric = createGridMetric(
      createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
    );

    expect(getGridDistance(isometric, 2, 2, true)).toBeCloseTo(64);
    expect(getGridDistance(isometric, 2, -2, true)).toBeCloseTo(128);
  });
});
