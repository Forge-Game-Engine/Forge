import { beforeEach, describe, expect, it } from 'vitest';
import {
  createVector2,
  Vector2,
  vector2Add,
  vector2Clone,
  vector2Cross,
  vector2DistanceTo,
  vector2Divide,
  vector2Dot,
  vector2Down,
  vector2Equals,
  vector2FloorComponents,
  vector2Left,
  vector2Magnitude,
  vector2MagnitudeSquared,
  vector2Multiply,
  vector2MultiplyComponents,
  vector2Negate,
  vector2Normalize,
  vector2One,
  vector2Perpendicular,
  vector2Right,
  vector2Rotate,
  vector2Set,
  vector2Subtract,
  vector2ToFloat32Array,
  vector2ToString,
  vector2Up,
  vector2Zero,
} from './vector2';

describe('Vector2', () => {
  describe('createVector2', () => {
    it('should create a vector with default values', () => {
      const vector = createVector2();
      expect(vector.x).toBe(0);
      expect(vector.y).toBe(0);
    });

    it('should create a vector with specified values', () => {
      const vector = createVector2(2, 3);
      expect(vector.x).toBe(2);
      expect(vector.y).toBe(3);
    });
  });

  describe('constants', () => {
    it('should return correct up vector', () => {
      expect(vector2Equals(vector2Up(), createVector2(0, -1))).toBe(true);
    });

    it('should return correct down vector', () => {
      expect(vector2Equals(vector2Down(), createVector2(0, 1))).toBe(true);
    });

    it('should return correct left vector', () => {
      expect(vector2Equals(vector2Left(), createVector2(-1, 0))).toBe(true);
    });

    it('should return correct right vector', () => {
      expect(vector2Equals(vector2Right(), createVector2(1, 0))).toBe(true);
    });

    it('should return correct zero vector', () => {
      expect(vector2Equals(vector2Zero(), createVector2(0, 0))).toBe(true);
    });

    it('should return correct one vector', () => {
      expect(vector2Equals(vector2One(), createVector2(1, 1))).toBe(true);
    });

    it('should return a new object on every call', () => {
      expect(vector2Zero()).not.toBe(vector2Zero());
    });
  });

  describe('vector operations', () => {
    let v1: Vector2;
    let v2: Vector2;

    beforeEach(() => {
      v1 = createVector2(2, 3);
      v2 = createVector2(4, 5);
    });

    it('should set vector components', () => {
      const vector = createVector2();
      const result = vector2Set(vector, v1);
      expect(vector).toEqual(v1);
      expect(result).toBe(vector);
    });

    it('should add vectors in place', () => {
      const result = vector2Add(v1, v2);
      expect(vector2Equals(result, createVector2(6, 8))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should subtract vectors in place', () => {
      const result = vector2Subtract(v1, v2);
      expect(vector2Equals(result, createVector2(-2, -2))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should multiply by scalar in place', () => {
      const result = vector2Multiply(v1, 2);
      expect(vector2Equals(result, createVector2(4, 6))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should multiply components in place', () => {
      const result = vector2MultiplyComponents(v1, v2);
      expect(vector2Equals(result, createVector2(8, 15))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should divide by scalar in place', () => {
      const result = vector2Divide(v1, 2);
      expect(vector2Equals(result, createVector2(1, 1.5))).toBe(true);
      expect(result).toBe(v1);
    });
  });

  describe('vector properties', () => {
    it('should calculate magnitude', () => {
      const vector = createVector2(3, 4);
      expect(vector2Magnitude(vector)).toBe(5);
    });

    it('should calculate magnitude squared', () => {
      const vector = createVector2(3, 4);
      expect(vector2MagnitudeSquared(vector)).toBe(25);
    });

    it('should normalize vector in place', () => {
      const vector = createVector2(3, 4);
      const normalized = vector2Normalize(vector);
      expect(normalized.x).toBeCloseTo(0.6);
      expect(normalized.y).toBeCloseTo(0.8);
      expect(normalized).toBe(vector);
    });

    it('should handle normalizing zero vector', () => {
      const vector = createVector2(0, 0);
      const normalized = vector2Normalize(vector);
      expect(normalized).toEqual(createVector2(0, 0));
    });
  });

  describe('utility methods', () => {
    it('should floor components in place', () => {
      const vector = createVector2(3.7, 4.2);
      const floored = vector2FloorComponents(vector);
      expect(vector2Equals(floored, createVector2(3, 4))).toBe(true);
      expect(floored).toBe(vector);
    });

    it('should clone vector without mutating the original', () => {
      const original = createVector2(2, 3);
      const clone = vector2Clone(original);
      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
    });

    it('should convert to string', () => {
      const vector = createVector2(2.123, 3.456);
      expect(vector2ToString(vector)).toBe('(2.1, 3.5)');
    });

    it('should convert vector to Float32Array', () => {
      const vector = createVector2(2, 3);
      const floatArray = vector2ToFloat32Array(vector);

      expect(floatArray).toBeInstanceOf(Float32Array);
      expect(floatArray).toEqual(new Float32Array([2, 3]));
    });

    it('should calculate distance to another vector (positive coordinates)', () => {
      const v1 = createVector2(1, 2);
      const v2 = createVector2(4, 6);
      expect(vector2DistanceTo(v1, v2)).toBeCloseTo(5);
      expect(vector2DistanceTo(v2, v1)).toBeCloseTo(5);
    });

    it('should calculate distance to another vector (negative coordinates)', () => {
      const v1 = createVector2(-1, -2);
      const v2 = createVector2(-4, -6);
      expect(vector2DistanceTo(v1, v2)).toBeCloseTo(5);
      expect(vector2DistanceTo(v2, v1)).toBeCloseTo(5);
    });

    it('should calculate distance to itself as zero', () => {
      const v = createVector2(3, 4);
      expect(vector2DistanceTo(v, v)).toBe(0);
    });

    it('should calculate distance when one vector is at origin', () => {
      const origin = createVector2(0, 0);
      const v = createVector2(3, 4);
      expect(vector2DistanceTo(origin, v)).toBe(5);
      expect(vector2DistanceTo(v, origin)).toBe(5);
    });

    it('should calculate distance for floating point coordinates', () => {
      const v1 = createVector2(1.5, 2.5);
      const v2 = createVector2(4.5, 6.5);
      expect(vector2DistanceTo(v1, v2)).toBeCloseTo(5);
    });

    it('should rotate vector by 0 radians (no change)', () => {
      const vector = createVector2(1, 0);
      const rotated = vector2Rotate(vector, 0);
      expect(rotated.x).toBeCloseTo(1);
      expect(rotated.y).toBeCloseTo(0);
      expect(rotated).toBe(vector);
    });

    it('should rotate vector by PI/2 radians (90 degrees counterclockwise)', () => {
      const vector = createVector2(1, 0);
      const rotated = vector2Rotate(vector, Math.PI / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(1);
    });

    it('should rotate vector by PI radians (180 degrees)', () => {
      const vector = createVector2(1, 0);
      const rotated = vector2Rotate(vector, Math.PI);
      expect(rotated.x).toBeCloseTo(-1);
      expect(rotated.y).toBeCloseTo(0);
    });

    it('should rotate vector by 3*PI/2 radians (270 degrees counterclockwise)', () => {
      const vector = createVector2(1, 0);
      const rotated = vector2Rotate(vector, (3 * Math.PI) / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(-1);
    });

    it('should rotate vector by negative angle (clockwise)', () => {
      const vector = createVector2(0, 1);
      const rotated = vector2Rotate(vector, -Math.PI / 2);
      expect(rotated.x).toBeCloseTo(1);
      expect(rotated.y).toBeCloseTo(0);
    });

    it('should rotate zero vector and remain zero', () => {
      const vector = createVector2(0, 0);
      const rotated = vector2Rotate(vector, Math.PI / 4);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(0);
    });

    it('should calculate the dot product of two vectors', () => {
      const v1 = createVector2(2, 3);
      const v2 = createVector2(4, 5);
      expect(vector2Dot(v1, v2)).toBe(23);
    });

    it('should calculate the dot product of perpendicular vectors as zero', () => {
      const v1 = createVector2(1, 0);
      const v2 = createVector2(0, 1);
      expect(vector2Dot(v1, v2)).toBe(0);
    });

    it('should calculate the cross product of two vectors', () => {
      const v1 = createVector2(2, 3);
      const v2 = createVector2(4, 5);
      expect(vector2Cross(v1, v2)).toBe(2 * 5 - 3 * 4);
    });

    it('should calculate the cross product of parallel vectors as zero', () => {
      const v1 = createVector2(2, 4);
      const v2 = createVector2(1, 2);
      expect(vector2Cross(v1, v2)).toBe(0);
    });

    it('should rotate a vector -90 degrees in place to make it perpendicular', () => {
      const vector = createVector2(1, 0);
      const perpendicular = vector2Perpendicular(vector);
      expect(vector2Equals(perpendicular, createVector2(0, -1))).toBe(true);
      expect(perpendicular).toBe(vector);
    });

    it('should produce a perpendicular vector with zero dot product against the original', () => {
      const original = createVector2(3, 4);
      const perpendicular = vector2Perpendicular(vector2Clone(original));
      expect(vector2Dot(original, perpendicular)).toBe(0);
    });

    it('should negate a vector in place', () => {
      const vector = createVector2(3, -4);
      const negated = vector2Negate(vector);
      expect(vector2Equals(negated, createVector2(-3, 4))).toBe(true);
      expect(negated).toBe(vector);
    });

    it('should return zero when negating the zero vector', () => {
      const vector = createVector2(0, 0);
      expect(vector2Equals(vector2Negate(vector), vector2Zero())).toBe(true);
    });
  });
});
