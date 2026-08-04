import { vectorToRadians } from './vector-to-radians';
import { describe, expect, it } from 'vitest';

describe('vectorToRadians', () => {
  it('should convert a vector pointing along the positive x-axis to 0 radians', () => {
    const vector = { x: 1, y: 0 };
    expect(vectorToRadians(vector)).toBeCloseTo(0);
  });

  it('should convert a vector pointing along the positive y-axis to π/2 radians', () => {
    const vector = { x: 0, y: 1 };
    expect(vectorToRadians(vector)).toBeCloseTo(Math.PI / 2);
  });

  it('should convert a vector pointing along the negative x-axis to π radians', () => {
    const vector = { x: -1, y: 0 };
    expect(vectorToRadians(vector)).toBeCloseTo(Math.PI);
  });

  it('should convert a vector pointing along the negative y-axis to -π/2 radians', () => {
    const vector = { x: 0, y: -1 };
    expect(vectorToRadians(vector)).toBeCloseTo(-Math.PI / 2);
  });

  it('should convert a vector pointing to (1, 1) to π/4 radians', () => {
    const vector = { x: 1, y: 1 };
    expect(vectorToRadians(vector)).toBeCloseTo(Math.PI / 4);
  });

  it('should convert a vector pointing to (-1, -1) to -3π/4 radians', () => {
    const vector = { x: -1, y: -1 };
    expect(vectorToRadians(vector)).toBeCloseTo((-3 * Math.PI) / 4);
  });

  it('should handle zero vector', () => {
    const vector = { x: 0, y: 0 };
    expect(vectorToRadians(vector)).toBeCloseTo(0);
  });
});
