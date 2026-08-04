import { beforeEach, describe, expect, it } from 'vitest';
import { Vec3, Vector3 } from './vector3';

describe('Vector3', () => {
  describe('Vec3.create', () => {
    it('should create a vector with default values', () => {
      const vector = Vec3.create();
      expect(vector.x).toBe(0);
      expect(vector.y).toBe(0);
      expect(vector.z).toBe(0);
    });

    it('should create a vector with specified values', () => {
      const vector = Vec3.create(2, 3, 4);
      expect(vector.x).toBe(2);
      expect(vector.y).toBe(3);
      expect(vector.z).toBe(4);
    });
  });

  describe('constants', () => {
    it('should return correct zero vector', () => {
      expect(Vec3.equals(Vec3.zero, Vec3.create(0, 0, 0))).toBe(true);
    });

    it('should return correct one vector', () => {
      expect(Vec3.equals(Vec3.one, Vec3.create(1, 1, 1))).toBe(true);
    });

    it('should return correct up vector', () => {
      expect(Vec3.equals(Vec3.up, Vec3.create(0, 1, 0))).toBe(true);
    });

    it('should return correct down vector', () => {
      expect(Vec3.equals(Vec3.down, Vec3.create(0, -1, 0))).toBe(true);
    });

    it('should return correct left vector', () => {
      expect(Vec3.equals(Vec3.left, Vec3.create(-1, 0, 0))).toBe(true);
    });

    it('should return correct right vector', () => {
      expect(Vec3.equals(Vec3.right, Vec3.create(1, 0, 0))).toBe(true);
    });

    it('should return correct forward vector', () => {
      expect(Vec3.equals(Vec3.forward, Vec3.create(0, 0, 1))).toBe(true);
    });

    it('should return correct backward vector', () => {
      expect(Vec3.equals(Vec3.backward, Vec3.create(0, 0, -1))).toBe(true);
    });

    it('should return a new object on every call', () => {
      expect(Vec3.zero).not.toBe(Vec3.zero);
    });
  });

  describe('vector operations', () => {
    let v1: Vector3;
    let v2: Vector3;

    beforeEach(() => {
      v1 = Vec3.create(2, 3, 4);
      v2 = Vec3.create(5, 6, 7);
    });

    it('should set vector components', () => {
      const vector = Vec3.create();
      const result = Vec3.set(vector, v1);
      expect(vector).toEqual(v1);
      expect(result).toBe(vector);
    });

    it('should add vectors in place', () => {
      const result = Vec3.add(v1, v2);
      expect(Vec3.equals(result, Vec3.create(7, 9, 11))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should subtract vectors in place', () => {
      const result = Vec3.subtract(v1, v2);
      expect(Vec3.equals(result, Vec3.create(-3, -3, -3))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should multiply by scalar in place', () => {
      const result = Vec3.multiply(v1, 2);
      expect(Vec3.equals(result, Vec3.create(4, 6, 8))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should multiply components in place', () => {
      const result = Vec3.multiplyComponents(v1, v2);
      expect(Vec3.equals(result, Vec3.create(10, 18, 28))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should divide by scalar in place', () => {
      const result = Vec3.divide(v1, 2);
      expect(Vec3.equals(result, Vec3.create(1, 1.5, 2))).toBe(true);
      expect(result).toBe(v1);
    });
  });

  describe('vector properties', () => {
    it('should calculate magnitude', () => {
      const vector = Vec3.create(1, 2, 2);
      expect(Vec3.magnitude(vector)).toBe(3);
    });

    it('should calculate magnitude squared', () => {
      const vector = Vec3.create(1, 2, 2);
      expect(Vec3.magnitudeSquared(vector)).toBe(9);
    });

    it('should normalize vector in place', () => {
      const vector = Vec3.create(1, 2, 2);
      const normalized = Vec3.normalize(vector);
      expect(normalized.x).toBeCloseTo(1 / 3);
      expect(normalized.y).toBeCloseTo(2 / 3);
      expect(normalized.z).toBeCloseTo(2 / 3);
      expect(normalized).toBe(vector);
    });

    it('should throw when normalizing a zero-length vector', () => {
      const vector = Vec3.create(0, 0, 0);
      expect(() => Vec3.normalize(vector)).toThrow();
    });
  });

  describe('utility methods', () => {
    it('should floor components in place', () => {
      const vector = Vec3.create(3.7, 4.2, 5.9);
      const floored = Vec3.floorComponents(vector);
      expect(Vec3.equals(floored, Vec3.create(3, 4, 5))).toBe(true);
      expect(floored).toBe(vector);
    });

    it('should clone vector without mutating the original', () => {
      const original = Vec3.create(2, 3, 4);
      const clone = Vec3.clone(original);
      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
    });

    it('should convert to string', () => {
      const vector = Vec3.create(2.123, 3.456, 4.789);
      expect(Vec3.toString(vector)).toBe('(2.1, 3.5, 4.8)');
    });

    it('should convert vector to Float32Array', () => {
      const vector = Vec3.create(2, 3, 4);
      const floatArray = Vec3.toFloat32Array(vector);

      expect(floatArray).toBeInstanceOf(Float32Array);
      expect(floatArray).toEqual(new Float32Array([2, 3, 4]));
    });
  });
});
