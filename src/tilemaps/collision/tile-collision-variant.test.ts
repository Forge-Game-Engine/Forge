import { describe, expect, it } from 'vitest';
import {
  createIsometricGridLayout,
  createOrthogonalGridLayout,
  GridLayout,
  Vector2,
} from '../../math/index.js';
import { calculateSignedArea } from '../../physics/colliders/polygon-math.js';
import { applyTileTransform } from '../tiles/tile-transform.js';
import {
  bottomSide,
  collisionSnapSteps,
  createTileCollisionVariant,
  describeSnappedShapeProblem,
  leftSide,
  rightSide,
  SnappedPoint,
  snapTileCollisionPolygon,
  topSide,
} from './tile-collision-variant.js';

const steps = collisionSnapSteps;
const square = createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 });
const diamond = createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 });

const sortPoints = (points: readonly SnappedPoint[]): SnappedPoint[] =>
  [...points].sort((a, b) => a.y - b.y || a.x - b.x);

/**
 * Where a tile-local point should land in cell space under `bits`, found
 * the way the image moves: normalize it in the footprint's bounds, move it
 * with `applyTileTransform`, and map it into cell space.
 */
const expectedSnappedPoint = (
  layout: GridLayout,
  point: Vector2,
  bits: number,
): SnappedPoint => {
  const moved = applyTileTransform(
    bits,
    {
      x: point.x / layout.cellWidth + 0.5,
      y: point.y / layout.cellHeight + 0.5,
    },
    { x: 0, y: 0 },
  );
  const cellSpace = layout.localToCellSpace({
    x: (moved.x - 0.5) * layout.cellWidth,
    y: (moved.y - 0.5) * layout.cellHeight,
  });

  return {
    x: Math.round((cellSpace.x + 0.5) * steps) + 0,
    y: Math.round((cellSpace.y + 0.5) * steps) + 0,
  };
};

describe('snapTileCollisionPolygon', () => {
  const halfCellTriangle: Vector2[] = [
    { x: -8, y: 8 },
    { x: 8, y: -8 },
    { x: 8, y: 8 },
  ];

  it.each([0, 1, 2, 3, 4, 5, 6, 7])(
    'moves a half-cell triangle the way transform bits %s move the image, keeping a positive winding',
    (bits) => {
      const snapped = snapTileCollisionPolygon(square, halfCellTriangle, bits);

      expect(sortPoints(snapped)).toEqual(
        sortPoints(
          halfCellTriangle.map((point) =>
            expectedSnappedPoint(square, point, bits),
          ),
        ),
      );
      expect(calculateSignedArea(snapped)).toBeGreaterThan(0);
      expect(describeSnappedShapeProblem(snapped)).toBeNull();
    },
  );

  it.each([0, 1, 2, 3, 4, 5, 6, 7])(
    'maps an isometric diamond onto the whole unit square under transform bits %s',
    (bits) => {
      const snapped = snapTileCollisionPolygon(
        diamond,
        diamond.getCellPolygon(0, 0).map((corner) => ({
          x: corner.x,
          y: corner.y - 16,
        })),
        bits,
      );

      expect(sortPoints(snapped)).toEqual([
        { x: 0, y: 0 },
        { x: steps, y: 0 },
        { x: 0, y: steps },
        { x: steps, y: steps },
      ]);
      expect(calculateSignedArea(snapped)).toBeGreaterThan(0);
    },
  );

  it('removes a point in the middle of an edge, including the first point', () => {
    const snapped = snapTileCollisionPolygon(
      square,
      [
        { x: 0, y: -8 },
        { x: 8, y: -8 },
        { x: 8, y: 8 },
        { x: -8, y: 8 },
        { x: -8, y: -8 },
      ],
      0,
    );

    expect(snapped).toEqual([
      { x: steps, y: 0 },
      { x: steps, y: steps },
      { x: 0, y: steps },
      { x: 0, y: 0 },
    ]);
  });

  it('merges points that snap to the same place', () => {
    const snapped = snapTileCollisionPolygon(
      square,
      [
        { x: -8, y: -8 },
        { x: -8 + 1e-6, y: -8 },
        { x: 8, y: 8 },
        { x: -8, y: 8 },
      ],
      0,
    );

    expect(snapped).toHaveLength(3);
  });

  it('merges a last point that snaps onto the first', () => {
    const snapped = snapTileCollisionPolygon(
      square,
      [
        { x: -8, y: -8 },
        { x: 8, y: -8 },
        { x: 8, y: 8 },
        { x: -8, y: 8 },
        { x: -8, y: -8 + 1e-6 },
      ],
      0,
    );

    expect(snapped).toEqual([
      { x: 0, y: 0 },
      { x: steps, y: 0 },
      { x: steps, y: steps },
      { x: 0, y: steps },
    ]);
  });
});

describe('describeSnappedShapeProblem', () => {
  it('accepts a strictly convex polygon', () => {
    expect(
      describeSnappedShapeProblem([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ]),
    ).toBeNull();
  });

  it('rejects fewer than 3 points', () => {
    expect(
      describeSnappedShapeProblem([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ]),
    ).toMatch(/fewer than 3/);
  });

  it('rejects a reflex point', () => {
    expect(
      describeSnappedShapeProblem([
        { x: 0, y: 0 },
        { x: 5, y: 2 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ]),
    ).toBe('isn’t strictly convex');
  });

  it('rejects a polygon wound the wrong way', () => {
    expect(
      describeSnappedShapeProblem([
        { x: 0, y: 0 },
        { x: 5, y: 10 },
        { x: 10, y: 0 },
      ]),
    ).toBe('isn’t strictly convex');
  });

  it('rejects a star that goes round twice', () => {
    const pentagon = [0, 1, 2, 3, 4].map((index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;

      return {
        x: Math.round(1000 + Math.cos(angle) * 800),
        y: Math.round(1000 + Math.sin(angle) * 800),
      };
    });
    const star = [0, 2, 4, 1, 3].map((index) => pentagon[index]);

    expect(describeSnappedShapeProblem(pentagon)).toBeNull();
    expect(describeSnappedShapeProblem(star)).toBe('crosses itself');
  });
});

describe('createTileCollisionVariant', () => {
  it('puts a full cell on every side and has no interior edges', () => {
    const variant = createTileCollisionVariant([
      { x: 0, y: 0 },
      { x: steps, y: 0 },
      { x: steps, y: steps },
      { x: 0, y: steps },
    ]);

    expect(variant.sides).toEqual([
      { min: 0, max: steps },
      { min: 0, max: steps },
      { min: 0, max: steps },
      { min: 0, max: steps },
    ]);
    expect(variant.interiorEdges).toEqual([]);
  });

  it('gives a slope two sides, a touching corner and its diagonal', () => {
    // Solid in the bottom-right half.
    const variant = createTileCollisionVariant([
      { x: 0, y: steps },
      { x: steps, y: 0 },
      { x: steps, y: steps },
    ]);

    expect(variant.sides[topSide]).toEqual({ min: steps, max: steps });
    expect(variant.sides[rightSide]).toEqual({ min: 0, max: steps });
    expect(variant.sides[bottomSide]).toEqual({ min: 0, max: steps });
    expect(variant.sides[leftSide]).toEqual({ min: steps, max: steps });
    expect(variant.interiorEdges).toEqual([
      [
        { x: 0, y: steps },
        { x: steps, y: 0 },
      ],
    ]);
  });

  it('touches a side at one vertex in its middle', () => {
    const variant = createTileCollisionVariant([
      { x: 0, y: 0 },
      { x: steps, y: 0 },
      { x: steps / 2, y: steps },
    ]);

    expect(variant.sides[bottomSide]).toEqual({
      min: steps / 2,
      max: steps / 2,
    });
    expect(variant.interiorEdges).toHaveLength(2);
  });
});
