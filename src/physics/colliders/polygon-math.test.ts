import { describe, expect, it } from 'vitest';
import { calculatePolygonMomentOfInertia } from './polygon-math.js';

describe('calculatePolygonMomentOfInertia', () => {
  it('gives a 2 by 2 square m(w² + h²) / 12', () => {
    const mass = 3;
    const square = [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
    ];

    expect(calculatePolygonMomentOfInertia(mass, square)).toBeCloseTo(
      (mass * (2 * 2 + 2 * 2)) / 12,
    );
  });

  it('gives a 4 by 2 rectangle m(w² + h²) / 12', () => {
    const mass = 5;
    const rectangle = [
      { x: -2, y: -1 },
      { x: 2, y: -1 },
      { x: 2, y: 1 },
      { x: -2, y: 1 },
    ];

    expect(calculatePolygonMomentOfInertia(mass, rectangle)).toBeCloseTo(
      (mass * (4 * 4 + 2 * 2)) / 12,
    );
  });

  it('gives a right triangle m(a² + b²) / 18 about its centroid', () => {
    const mass = 2;
    const legA = 3;
    const legB = 6;
    // The right angle at the origin, shifted so the centroid is at the
    // origin.
    const triangle = [
      { x: -legA / 3, y: -legB / 3 },
      { x: (2 * legA) / 3, y: -legB / 3 },
      { x: -legA / 3, y: (2 * legB) / 3 },
    ];

    expect(calculatePolygonMomentOfInertia(mass, triangle)).toBeCloseTo(
      (mass * (legA * legA + legB * legB)) / 18,
    );
  });

  it('gives a concave polygon the moment of its parts', () => {
    // A U shape: a 3 by 1 base with two 1 by 2 arms on top. Its centroid,
    // at (1.5, 19 / 14), lies outside it, in the gap between the arms.
    const centroid = { x: 1.5, y: 19 / 14 };
    const u = [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 3 },
      { x: 0, y: 3 },
    ].map((vertex) => ({ x: vertex.x - centroid.x, y: vertex.y - centroid.y }));

    // Each rectangle's own m(w² + h²) / 12 plus m·d² to the U's centroid,
    // with a density of 1.
    const rectangleMoment = (
      width: number,
      height: number,
      centerX: number,
      centerY: number,
    ): number => {
      const mass = width * height;
      const dx = centerX - centroid.x;
      const dy = centerY - centroid.y;

      return (
        (mass * (width * width + height * height)) / 12 +
        mass * (dx * dx + dy * dy)
      );
    };

    const expected =
      rectangleMoment(3, 1, 1.5, 0.5) +
      rectangleMoment(1, 2, 0.5, 2) +
      rectangleMoment(1, 2, 2.5, 2);

    expect(calculatePolygonMomentOfInertia(7, u)).toBeCloseTo(expected);
  });
});
