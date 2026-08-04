import { beforeEach, describe, expect, it } from 'vitest';
import { Vec2, Vector2 } from './vector2';

describe('Vector2', () => {
  describe('Vec2.create', () => {
    it('should create a vector with default values', () => {
      const vector = Vec2.create();
      expect(vector.x).toBe(0);
      expect(vector.y).toBe(0);
    });

    it('should create a vector with specified values', () => {
      const vector = Vec2.create(2, 3);
      expect(vector.x).toBe(2);
      expect(vector.y).toBe(3);
    });
  });

  describe('constants', () => {
    it('should return correct up vector', () => {
      expect(Vec2.equals(Vec2.up, Vec2.create(0, -1))).toBe(true);
    });

    it('should return correct down vector', () => {
      expect(Vec2.equals(Vec2.down, Vec2.create(0, 1))).toBe(true);
    });

    it('should return correct left vector', () => {
      expect(Vec2.equals(Vec2.left, Vec2.create(-1, 0))).toBe(true);
    });

    it('should return correct right vector', () => {
      expect(Vec2.equals(Vec2.right, Vec2.create(1, 0))).toBe(true);
    });

    it('should return correct zero vector', () => {
      expect(Vec2.equals(Vec2.zero, Vec2.create(0, 0))).toBe(true);
    });

    it('should return correct one vector', () => {
      expect(Vec2.equals(Vec2.one, Vec2.create(1, 1))).toBe(true);
    });

    it('should return a new object on every call', () => {
      expect(Vec2.zero).not.toBe(Vec2.zero);
    });
  });

  describe('vector operations', () => {
    let v1: Vector2;
    let v2: Vector2;

    beforeEach(() => {
      v1 = Vec2.create(2, 3);
      v2 = Vec2.create(4, 5);
    });

    it('should set vector components', () => {
      const vector = Vec2.create();
      const result = Vec2.set(vector, v1);
      expect(vector).toEqual(v1);
      expect(result).toBe(vector);
    });

    it('should add vectors in place', () => {
      const result = Vec2.add(v1, v2);
      expect(Vec2.equals(result, Vec2.create(6, 8))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should subtract vectors in place', () => {
      const result = Vec2.subtract(v1, v2);
      expect(Vec2.equals(result, Vec2.create(-2, -2))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should multiply by scalar in place', () => {
      const result = Vec2.multiply(v1, 2);
      expect(Vec2.equals(result, Vec2.create(4, 6))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should multiply components in place', () => {
      const result = Vec2.multiplyComponents(v1, v2);
      expect(Vec2.equals(result, Vec2.create(8, 15))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should divide by scalar in place', () => {
      const result = Vec2.divide(v1, 2);
      expect(Vec2.equals(result, Vec2.create(1, 1.5))).toBe(true);
      expect(result).toBe(v1);
    });
  });

  describe('vector properties', () => {
    it('should calculate magnitude', () => {
      const vector = Vec2.create(3, 4);
      expect(Vec2.magnitude(vector)).toBe(5);
    });

    it('should calculate magnitude squared', () => {
      const vector = Vec2.create(3, 4);
      expect(Vec2.magnitudeSquared(vector)).toBe(25);
    });

    it('should normalize vector in place', () => {
      const vector = Vec2.create(3, 4);
      const normalized = Vec2.normalize(vector);
      expect(normalized.x).toBeCloseTo(0.6);
      expect(normalized.y).toBeCloseTo(0.8);
      expect(normalized).toBe(vector);
    });

    it('should throw when normalizing a zero-length vector', () => {
      const vector = Vec2.create(0, 0);
      expect(() => Vec2.normalize(vector)).toThrow();
    });
  });

  describe('utility methods', () => {
    it('should floor components in place', () => {
      const vector = Vec2.create(3.7, 4.2);
      const floored = Vec2.floorComponents(vector);
      expect(Vec2.equals(floored, Vec2.create(3, 4))).toBe(true);
      expect(floored).toBe(vector);
    });

    it('should clone vector without mutating the original', () => {
      const original = Vec2.create(2, 3);
      const clone = Vec2.clone(original);
      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
    });

    it('should convert to string', () => {
      const vector = Vec2.create(2.123, 3.456);
      expect(Vec2.toString(vector)).toBe('(2.1, 3.5)');
    });

    it('should convert vector to Float32Array', () => {
      const vector = Vec2.create(2, 3);
      const floatArray = Vec2.toFloat32Array(vector);

      expect(floatArray).toBeInstanceOf(Float32Array);
      expect(floatArray).toEqual(new Float32Array([2, 3]));
    });

    it('should calculate distance to another vector (positive coordinates)', () => {
      const v1 = Vec2.create(1, 2);
      const v2 = Vec2.create(4, 6);
      expect(Vec2.distanceTo(v1, v2)).toBeCloseTo(5);
      expect(Vec2.distanceTo(v2, v1)).toBeCloseTo(5);
    });

    it('should calculate distance to another vector (negative coordinates)', () => {
      const v1 = Vec2.create(-1, -2);
      const v2 = Vec2.create(-4, -6);
      expect(Vec2.distanceTo(v1, v2)).toBeCloseTo(5);
      expect(Vec2.distanceTo(v2, v1)).toBeCloseTo(5);
    });

    it('should calculate distance to itself as zero', () => {
      const v = Vec2.create(3, 4);
      expect(Vec2.distanceTo(v, v)).toBe(0);
    });

    it('should calculate distance when one vector is at origin', () => {
      const origin = Vec2.create(0, 0);
      const v = Vec2.create(3, 4);
      expect(Vec2.distanceTo(origin, v)).toBe(5);
      expect(Vec2.distanceTo(v, origin)).toBe(5);
    });

    it('should calculate distance for floating point coordinates', () => {
      const v1 = Vec2.create(1.5, 2.5);
      const v2 = Vec2.create(4.5, 6.5);
      expect(Vec2.distanceTo(v1, v2)).toBeCloseTo(5);
    });

    it('should rotate vector by 0 radians (no change)', () => {
      const vector = Vec2.create(1, 0);
      const rotated = Vec2.rotate(vector, 0);
      expect(rotated.x).toBeCloseTo(1);
      expect(rotated.y).toBeCloseTo(0);
      expect(rotated).toBe(vector);
    });

    it('should rotate vector by PI/2 radians (90 degrees counterclockwise)', () => {
      const vector = Vec2.create(1, 0);
      const rotated = Vec2.rotate(vector, Math.PI / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(1);
    });

    it('should rotate vector by PI radians (180 degrees)', () => {
      const vector = Vec2.create(1, 0);
      const rotated = Vec2.rotate(vector, Math.PI);
      expect(rotated.x).toBeCloseTo(-1);
      expect(rotated.y).toBeCloseTo(0);
    });

    it('should rotate vector by 3*PI/2 radians (270 degrees counterclockwise)', () => {
      const vector = Vec2.create(1, 0);
      const rotated = Vec2.rotate(vector, (3 * Math.PI) / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(-1);
    });

    it('should rotate vector by negative angle (clockwise)', () => {
      const vector = Vec2.create(0, 1);
      const rotated = Vec2.rotate(vector, -Math.PI / 2);
      expect(rotated.x).toBeCloseTo(1);
      expect(rotated.y).toBeCloseTo(0);
    });

    it('should rotate zero vector and remain zero', () => {
      const vector = Vec2.create(0, 0);
      const rotated = Vec2.rotate(vector, Math.PI / 4);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(0);
    });

    it('should calculate the dot product of two vectors', () => {
      const v1 = Vec2.create(2, 3);
      const v2 = Vec2.create(4, 5);
      expect(Vec2.dot(v1, v2)).toBe(23);
    });

    it('should calculate the dot product of perpendicular vectors as zero', () => {
      const v1 = Vec2.create(1, 0);
      const v2 = Vec2.create(0, 1);
      expect(Vec2.dot(v1, v2)).toBe(0);
    });

    it('should calculate the cross product of two vectors', () => {
      const v1 = Vec2.create(2, 3);
      const v2 = Vec2.create(4, 5);
      expect(Vec2.cross(v1, v2)).toBe(2 * 5 - 3 * 4);
    });

    it('should calculate the cross product of parallel vectors as zero', () => {
      const v1 = Vec2.create(2, 4);
      const v2 = Vec2.create(1, 2);
      expect(Vec2.cross(v1, v2)).toBe(0);
    });

    it('should rotate a vector -90 degrees in place to make it perpendicular', () => {
      const vector = Vec2.create(1, 0);
      const perpendicular = Vec2.perpendicular(vector);
      expect(Vec2.equals(perpendicular, Vec2.create(0, -1))).toBe(true);
      expect(perpendicular).toBe(vector);
    });

    it('should produce a perpendicular vector with zero dot product against the original', () => {
      const original = Vec2.create(3, 4);
      const perpendicular = Vec2.perpendicular(Vec2.clone(original));
      expect(Vec2.dot(original, perpendicular)).toBe(0);
    });

    it('should negate a vector in place', () => {
      const vector = Vec2.create(3, -4);
      const negated = Vec2.negate(vector);
      expect(Vec2.equals(negated, Vec2.create(-3, 4))).toBe(true);
      expect(negated).toBe(vector);
    });

    it('should return zero when negating the zero vector', () => {
      const vector = Vec2.create(0, 0);
      expect(Vec2.equals(Vec2.negate(vector), Vec2.zero)).toBe(true);
    });
  });
});
