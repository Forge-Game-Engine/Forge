import { describe, expect, it } from 'vitest';
import { radiansToVector } from './radians-to-vector';

describe('radiansToVector', () => {
  it('returns (0, -1) for 0 radians', () => {
    const vector = radiansToVector(0);
    expect(vector.x).toBeCloseTo(0);
    expect(vector.y).toBeCloseTo(-1);
  });

  it('returns (1, 0) for π/2 radians', () => {
    const vector = radiansToVector(Math.PI / 2);
    expect(vector.x).toBeCloseTo(1);
    expect(vector.y).toBeCloseTo(0);
  });

  it('returns (0, 1) for π radians', () => {
    const vector = radiansToVector(Math.PI);
    expect(vector.x).toBeCloseTo(0);
    expect(vector.y).toBeCloseTo(1);
  });

  it('returns (-1, 0) for 3π/2 radians', () => {
    const vector = radiansToVector((3 * Math.PI) / 2);
    expect(vector.x).toBeCloseTo(-1);
    expect(vector.y).toBeCloseTo(0);
  });

  it('returns a unit vector for any angle', () => {
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 8) {
      const vector = radiansToVector(angle);
      const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
      expect(magnitude).toBeCloseTo(1);
    }
  });
});
