import { describe, expect, it } from 'vitest';
import { buildTerrainCurve, heightAtLocalX } from './terrain-curve.js';
import { Vec2 } from '../../math/index.js';

describe('buildTerrainCurve', () => {
  it('should throw an error if fewer than 2 control points are provided', () => {
    expect(() => buildTerrainCurve([Vec2.create(0, 0)], 4)).toThrow();
  });

  it('should start at the first control point', () => {
    const curve = buildTerrainCurve(
      [Vec2.create(0, 5), Vec2.create(10, 5), Vec2.create(20, 5)],
      4,
    );

    expect(curve[0].position.x).toBeCloseTo(0);
    expect(curve[0].position.y).toBeCloseTo(5);
    expect(curve[0].distance).toBeCloseTo(0);
  });

  it('should pass exactly through every control point', () => {
    const controlPoints = [
      Vec2.create(0, 0),
      Vec2.create(10, 40),
      Vec2.create(20, -20),
      Vec2.create(30, 10),
    ];
    const samplesPerSegment = 6;

    const curve = buildTerrainCurve(controlPoints, samplesPerSegment);

    for (let i = 0; i < controlPoints.length; i++) {
      const sampleIndex = i * samplesPerSegment;

      expect(curve[sampleIndex].position.x).toBeCloseTo(controlPoints[i].x);
      expect(curve[sampleIndex].position.y).toBeCloseTo(controlPoints[i].y);
    }
  });

  it('should produce a straight line for evenly-spaced collinear control points', () => {
    const curve = buildTerrainCurve(
      [
        Vec2.create(0, 0),
        Vec2.create(10, 10),
        Vec2.create(20, 20),
        Vec2.create(30, 30),
      ],
      5,
    );

    for (const point of curve) {
      expect(point.position.y).toBeCloseTo(point.position.x);
    }
  });

  it('should produce monotonically increasing x and distance', () => {
    const curve = buildTerrainCurve(
      [
        Vec2.create(0, 0),
        Vec2.create(10, 50),
        Vec2.create(20, -30),
        Vec2.create(30, 0),
      ],
      8,
    );

    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].position.x).toBeGreaterThan(curve[i - 1].position.x);
      expect(curve[i].distance).toBeGreaterThan(curve[i - 1].distance);
    }
  });
});

describe('heightAtLocalX', () => {
  it('should throw an error if given an empty curve', () => {
    expect(() => heightAtLocalX([], 0)).toThrow();
  });

  it('should return the exact height at a sampled point', () => {
    const curve = buildTerrainCurve(
      [Vec2.create(0, 0), Vec2.create(10, 0), Vec2.create(20, 0)],
      4,
    );

    expect(heightAtLocalX(curve, 10)).toBeCloseTo(0);
  });

  it('should linearly interpolate between two bracketing points', () => {
    const curve = [
      { position: Vec2.create(0, 0), distance: 0 },
      { position: Vec2.create(10, 20), distance: 10 },
    ];

    expect(heightAtLocalX(curve, 5)).toBeCloseTo(10);
  });

  it('should clamp to the first point before the start of the curve', () => {
    const curve = [
      { position: Vec2.create(0, 7), distance: 0 },
      { position: Vec2.create(10, 20), distance: 10 },
    ];

    expect(heightAtLocalX(curve, -100)).toBeCloseTo(7);
  });

  it('should clamp to the last point past the end of the curve', () => {
    const curve = [
      { position: Vec2.create(0, 7), distance: 0 },
      { position: Vec2.create(10, 20), distance: 10 },
    ];

    expect(heightAtLocalX(curve, 100)).toBeCloseTo(20);
  });
});
