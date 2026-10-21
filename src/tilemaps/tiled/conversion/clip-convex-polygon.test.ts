import { describe, expect, it } from 'vitest';
import { clipConvexPolygon, isConvexPolygon } from './clip-convex-polygon.js';

const square = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

describe('isConvexPolygon', () => {
  it('accepts convex polygons in either winding, with straight corners', () => {
    expect(isConvexPolygon(square)).toBe(true);
    expect(isConvexPolygon([...square].reverse())).toBe(true);
    expect(
      isConvexPolygon([
        { x: 0, y: 0 },
        { x: 0.5, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ]),
    ).toBe(true);
  });

  it('rejects a concave polygon', () => {
    expect(
      isConvexPolygon([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0.5, y: 0.25 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ]),
    ).toBe(false);
  });

  it('rejects a star that turns the same way at every corner', () => {
    const star = [0, 2, 4, 1, 3].map((index) => {
      const angle = (index / 5) * 2 * Math.PI;

      return { x: Math.cos(angle), y: Math.sin(angle) };
    });

    expect(isConvexPolygon(star)).toBe(false);
  });

  it('rejects a polygon with no area', () => {
    expect(
      isConvexPolygon([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]),
    ).toBe(false);
  });
});

describe('clipConvexPolygon', () => {
  it('keeps a polygon inside the region as it is', () => {
    const inside = [
      { x: 0.25, y: 0.25 },
      { x: 0.75, y: 0.25 },
      { x: 0.5, y: 0.75 },
    ];

    expect(clipConvexPolygon(inside, square)).toEqual(inside);
  });

  it('cuts off what reaches outside the region', () => {
    expect(
      clipConvexPolygon(
        [
          { x: 0.5, y: -1 },
          { x: 1, y: -1 },
          { x: 1, y: 1 },
          { x: 0.5, y: 1 },
        ],
        square,
      ),
    ).toEqual([
      { x: 0.5, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0.5, y: 1 },
    ]);
  });

  it('gives nothing for a polygon outside the region', () => {
    expect(
      clipConvexPolygon(
        [
          { x: 2, y: 2 },
          { x: 3, y: 2 },
          { x: 3, y: 3 },
        ],
        square,
      ),
    ).toEqual([]);
  });
});
