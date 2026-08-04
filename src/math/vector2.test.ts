import { beforeEach, describe, expect, it } from 'vitest';
import { Vec2, Vector2 } from './vector2';

describe('Vector2', () => {
  describe('constants', () => {
    it('should return correct up vector', () => {
      expect(Vec2.equals(Vec2.up, { x: 0, y: -1 })).toBe(true);
    });

    it('should return correct down vector', () => {
      expect(Vec2.equals(Vec2.down, { x: 0, y: 1 })).toBe(true);
    });

    it('should return correct left vector', () => {
      expect(Vec2.equals(Vec2.left, { x: -1, y: 0 })).toBe(true);
    });

    it('should return correct right vector', () => {
      expect(Vec2.equals(Vec2.right, { x: 1, y: 0 })).toBe(true);
    });

    it('should return correct zero vector', () => {
      expect(Vec2.equals(Vec2.zero, { x: 0, y: 0 })).toBe(true);
    });

    it('should return correct one vector', () => {
      expect(Vec2.equals(Vec2.one, { x: 1, y: 1 })).toBe(true);
    });

    it('should return a new object on every call', () => {
      expect(Vec2.zero).not.toBe(Vec2.zero);
    });
  });

  describe('vector operations', () => {
    let v1: Vector2;
    let v2: Vector2;

    beforeEach(() => {
      v1 = { x: 2, y: 3 };
      v2 = { x: 4, y: 5 };
    });

    it('should set vector components', () => {
      const vector = { x: 0, y: 0 };
      const result = Vec2.set(vector, v1);
      expect(vector).toEqual(v1);
      expect(result).toBe(vector);
    });

    it('should add vectors in place', () => {
      const result = Vec2.add(v1, v2);
      expect(Vec2.equals(result, { x: 6, y: 8 })).toBe(true);
      expect(result).toBe(v1);
    });

    it('should subtract vectors in place', () => {
      const result = Vec2.subtract(v1, v2);
      expect(Vec2.equals(result, { x: -2, y: -2 })).toBe(true);
      expect(result).toBe(v1);
    });

    it('should multiply by scalar in place', () => {
      const result = Vec2.multiply(v1, 2);
      expect(Vec2.equals(result, { x: 4, y: 6 })).toBe(true);
      expect(result).toBe(v1);
    });

    it('should multiply components in place', () => {
      const result = Vec2.multiplyComponents(v1, v2);
      expect(Vec2.equals(result, { x: 8, y: 15 })).toBe(true);
      expect(result).toBe(v1);
    });

    it('should divide by scalar in place', () => {
      const result = Vec2.divide(v1, 2);
      expect(Vec2.equals(result, { x: 1, y: 1.5 })).toBe(true);
      expect(result).toBe(v1);
    });
  });

  describe('vector properties', () => {
    it('should calculate magnitude', () => {
      const vector = { x: 3, y: 4 };
      expect(Vec2.magnitude(vector)).toBe(5);
    });

    it('should calculate magnitude squared', () => {
      const vector = { x: 3, y: 4 };
      expect(Vec2.magnitudeSquared(vector)).toBe(25);
    });

    it('should normalize vector in place', () => {
      const vector = { x: 3, y: 4 };
      const normalized = Vec2.normalize(vector);
      expect(normalized.x).toBeCloseTo(0.6);
      expect(normalized.y).toBeCloseTo(0.8);
      expect(normalized).toBe(vector);
    });

    it('should throw when normalizing a zero-length vector', () => {
      const vector = { x: 0, y: 0 };
      expect(() => Vec2.normalize(vector)).toThrow();
    });
  });

  describe('utility methods', () => {
    it('should floor components in place', () => {
      const vector = { x: 3.7, y: 4.2 };
      const floored = Vec2.floorComponents(vector);
      expect(Vec2.equals(floored, { x: 3, y: 4 })).toBe(true);
      expect(floored).toBe(vector);
    });

    it('should clone vector without mutating the original', () => {
      const original = { x: 2, y: 3 };
      const clone = Vec2.clone(original);
      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
    });

    it('should convert to string', () => {
      const vector = { x: 2.123, y: 3.456 };
      expect(Vec2.toString(vector)).toBe('(2.1, 3.5)');
    });

    it('should convert vector to Float32Array', () => {
      const vector = { x: 2, y: 3 };
      const floatArray = Vec2.toFloat32Array(vector);

      expect(floatArray).toBeInstanceOf(Float32Array);
      expect(floatArray).toEqual(new Float32Array([2, 3]));
    });

    it('should calculate distance to another vector (positive coordinates)', () => {
      const v1 = { x: 1, y: 2 };
      const v2 = { x: 4, y: 6 };
      expect(Vec2.distanceTo(v1, v2)).toBeCloseTo(5);
      expect(Vec2.distanceTo(v2, v1)).toBeCloseTo(5);
    });

    it('should calculate distance to another vector (negative coordinates)', () => {
      const v1 = { x: -1, y: -2 };
      const v2 = { x: -4, y: -6 };
      expect(Vec2.distanceTo(v1, v2)).toBeCloseTo(5);
      expect(Vec2.distanceTo(v2, v1)).toBeCloseTo(5);
    });

    it('should calculate distance to itself as zero', () => {
      const v = { x: 3, y: 4 };
      expect(Vec2.distanceTo(v, v)).toBe(0);
    });

    it('should calculate distance when one vector is at origin', () => {
      const origin = { x: 0, y: 0 };
      const v = { x: 3, y: 4 };
      expect(Vec2.distanceTo(origin, v)).toBe(5);
      expect(Vec2.distanceTo(v, origin)).toBe(5);
    });

    it('should calculate distance for floating point coordinates', () => {
      const v1 = { x: 1.5, y: 2.5 };
      const v2 = { x: 4.5, y: 6.5 };
      expect(Vec2.distanceTo(v1, v2)).toBeCloseTo(5);
    });

    it('should rotate vector by 0 radians (no change)', () => {
      const vector = { x: 1, y: 0 };
      const rotated = Vec2.rotate(vector, 0);
      expect(rotated.x).toBeCloseTo(1);
      expect(rotated.y).toBeCloseTo(0);
      expect(rotated).toBe(vector);
    });

    it('should rotate vector by PI/2 radians (90 degrees counterclockwise)', () => {
      const vector = { x: 1, y: 0 };
      const rotated = Vec2.rotate(vector, Math.PI / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(1);
    });

    it('should rotate vector by PI radians (180 degrees)', () => {
      const vector = { x: 1, y: 0 };
      const rotated = Vec2.rotate(vector, Math.PI);
      expect(rotated.x).toBeCloseTo(-1);
      expect(rotated.y).toBeCloseTo(0);
    });

    it('should rotate vector by 3*PI/2 radians (270 degrees counterclockwise)', () => {
      const vector = { x: 1, y: 0 };
      const rotated = Vec2.rotate(vector, (3 * Math.PI) / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(-1);
    });

    it('should rotate vector by negative angle (clockwise)', () => {
      const vector = { x: 0, y: 1 };
      const rotated = Vec2.rotate(vector, -Math.PI / 2);
      expect(rotated.x).toBeCloseTo(1);
      expect(rotated.y).toBeCloseTo(0);
    });

    it('should rotate zero vector and remain zero', () => {
      const vector = { x: 0, y: 0 };
      const rotated = Vec2.rotate(vector, Math.PI / 4);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(0);
    });

    it('should calculate the dot product of two vectors', () => {
      const v1 = { x: 2, y: 3 };
      const v2 = { x: 4, y: 5 };
      expect(Vec2.dot(v1, v2)).toBe(23);
    });

    it('should calculate the dot product of perpendicular vectors as zero', () => {
      const v1 = { x: 1, y: 0 };
      const v2 = { x: 0, y: 1 };
      expect(Vec2.dot(v1, v2)).toBe(0);
    });

    it('should calculate the cross product of two vectors', () => {
      const v1 = { x: 2, y: 3 };
      const v2 = { x: 4, y: 5 };
      expect(Vec2.cross(v1, v2)).toBe(2 * 5 - 3 * 4);
    });

    it('should calculate the cross product of parallel vectors as zero', () => {
      const v1 = { x: 2, y: 4 };
      const v2 = { x: 1, y: 2 };
      expect(Vec2.cross(v1, v2)).toBe(0);
    });

    it('should rotate a vector -90 degrees in place to make it perpendicular', () => {
      const vector = { x: 1, y: 0 };
      const perpendicular = Vec2.perpendicular(vector);
      expect(Vec2.equals(perpendicular, { x: 0, y: -1 })).toBe(true);
      expect(perpendicular).toBe(vector);
    });

    it('should produce a perpendicular vector with zero dot product against the original', () => {
      const original = { x: 3, y: 4 };
      const perpendicular = Vec2.perpendicular(Vec2.clone(original));
      expect(Vec2.dot(original, perpendicular)).toBe(0);
    });

    it('should negate a vector in place', () => {
      const vector = { x: 3, y: -4 };
      const negated = Vec2.negate(vector);
      expect(Vec2.equals(negated, { x: -3, y: 4 })).toBe(true);
      expect(negated).toBe(vector);
    });

    it('should return zero when negating the zero vector', () => {
      const vector = { x: 0, y: 0 };
      expect(Vec2.equals(Vec2.negate(vector), Vec2.zero)).toBe(true);
    });
  });
});
