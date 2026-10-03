import { describe, expect, it } from 'vitest';
import { sampleSpawnShape } from './sample-spawn-shape.js';
import { Random, Vec2 } from '../../math/index.js';

describe('sampleSpawnShape', () => {
  const random = new Random('spawn-shape-seed');
  const samples = 200;

  it('always returns the center for a point', () => {
    expect(sampleSpawnShape({ type: 'point' }, random)).toEqual(Vec2.zero);
  });

  it('returns points inside a circle', () => {
    for (let i = 0; i < samples; i++) {
      const point = sampleSpawnShape({ type: 'circle', radius: 3 }, random);

      expect(Vec2.magnitude(point)).toBeLessThanOrEqual(3);
    }
  });

  it('returns points on the edge of a ring', () => {
    for (let i = 0; i < samples; i++) {
      const point = sampleSpawnShape({ type: 'ring', radius: 2 }, random);

      expect(Vec2.magnitude(point)).toBeCloseTo(2);
    }
  });

  it('returns points inside a box centered on the origin', () => {
    for (let i = 0; i < samples; i++) {
      const point = sampleSpawnShape(
        { type: 'box', width: 4, height: 2 },
        random,
      );

      expect(Math.abs(point.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(point.y)).toBeLessThanOrEqual(1);
    }
  });
});
