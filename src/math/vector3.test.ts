import { beforeEach, describe, expect, it } from 'vitest';
import {
  createVector3,
  Vector3,
  vector3Add,
  vector3Backward,
  vector3Clone,
  vector3Divide,
  vector3Down,
  vector3Equals,
  vector3FloorComponents,
  vector3Forward,
  vector3Left,
  vector3Magnitude,
  vector3MagnitudeSquared,
  vector3Multiply,
  vector3MultiplyComponents,
  vector3Normalize,
  vector3One,
  vector3Right,
  vector3Set,
  vector3Subtract,
  vector3ToFloat32Array,
  vector3ToString,
  vector3Up,
  vector3Zero,
} from './vector3';

describe('Vector3', () => {
  describe('createVector3', () => {
    it('should create a vector with default values', () => {
      const vector = createVector3();
      expect(vector.x).toBe(0);
      expect(vector.y).toBe(0);
      expect(vector.z).toBe(0);
    });

    it('should create a vector with specified values', () => {
      const vector = createVector3(2, 3, 4);
      expect(vector.x).toBe(2);
      expect(vector.y).toBe(3);
      expect(vector.z).toBe(4);
    });
  });

  describe('constants', () => {
    it('should return correct zero vector', () => {
      expect(vector3Equals(vector3Zero(), createVector3(0, 0, 0))).toBe(true);
    });

    it('should return correct one vector', () => {
      expect(vector3Equals(vector3One(), createVector3(1, 1, 1))).toBe(true);
    });

    it('should return correct up vector', () => {
      expect(vector3Equals(vector3Up(), createVector3(0, 1, 0))).toBe(true);
    });

    it('should return correct down vector', () => {
      expect(vector3Equals(vector3Down(), createVector3(0, -1, 0))).toBe(true);
    });

    it('should return correct left vector', () => {
      expect(vector3Equals(vector3Left(), createVector3(-1, 0, 0))).toBe(true);
    });

    it('should return correct right vector', () => {
      expect(vector3Equals(vector3Right(), createVector3(1, 0, 0))).toBe(true);
    });

    it('should return correct forward vector', () => {
      expect(vector3Equals(vector3Forward(), createVector3(0, 0, 1))).toBe(
        true,
      );
    });

    it('should return correct backward vector', () => {
      expect(vector3Equals(vector3Backward(), createVector3(0, 0, -1))).toBe(
        true,
      );
    });

    it('should return a new object on every call', () => {
      expect(vector3Zero()).not.toBe(vector3Zero());
    });
  });

  describe('vector operations', () => {
    let v1: Vector3;
    let v2: Vector3;

    beforeEach(() => {
      v1 = createVector3(2, 3, 4);
      v2 = createVector3(5, 6, 7);
    });

    it('should set vector components', () => {
      const vector = createVector3();
      const result = vector3Set(vector, v1);
      expect(vector).toEqual(v1);
      expect(result).toBe(vector);
    });

    it('should add vectors in place', () => {
      const result = vector3Add(v1, v2);
      expect(vector3Equals(result, createVector3(7, 9, 11))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should subtract vectors in place', () => {
      const result = vector3Subtract(v1, v2);
      expect(vector3Equals(result, createVector3(-3, -3, -3))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should multiply by scalar in place', () => {
      const result = vector3Multiply(v1, 2);
      expect(vector3Equals(result, createVector3(4, 6, 8))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should multiply components in place', () => {
      const result = vector3MultiplyComponents(v1, v2);
      expect(vector3Equals(result, createVector3(10, 18, 28))).toBe(true);
      expect(result).toBe(v1);
    });

    it('should divide by scalar in place', () => {
      const result = vector3Divide(v1, 2);
      expect(vector3Equals(result, createVector3(1, 1.5, 2))).toBe(true);
      expect(result).toBe(v1);
    });
  });

  describe('vector properties', () => {
    it('should calculate magnitude', () => {
      const vector = createVector3(1, 2, 2);
      expect(vector3Magnitude(vector)).toBe(3);
    });

    it('should calculate magnitude squared', () => {
      const vector = createVector3(1, 2, 2);
      expect(vector3MagnitudeSquared(vector)).toBe(9);
    });

    it('should normalize vector in place', () => {
      const vector = createVector3(1, 2, 2);
      const normalized = vector3Normalize(vector);
      expect(normalized.x).toBeCloseTo(1 / 3);
      expect(normalized.y).toBeCloseTo(2 / 3);
      expect(normalized.z).toBeCloseTo(2 / 3);
      expect(normalized).toBe(vector);
    });

    it('should handle normalizing zero vector', () => {
      const vector = createVector3(0, 0, 0);
      const normalized = vector3Normalize(vector);
      expect(normalized).toEqual(createVector3(0, 0, 0));
    });
  });

  describe('utility methods', () => {
    it('should floor components in place', () => {
      const vector = createVector3(3.7, 4.2, 5.9);
      const floored = vector3FloorComponents(vector);
      expect(vector3Equals(floored, createVector3(3, 4, 5))).toBe(true);
      expect(floored).toBe(vector);
    });

    it('should clone vector without mutating the original', () => {
      const original = createVector3(2, 3, 4);
      const clone = vector3Clone(original);
      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
    });

    it('should convert to string', () => {
      const vector = createVector3(2.123, 3.456, 4.789);
      expect(vector3ToString(vector)).toBe('(2.1, 3.5, 4.8)');
    });

    it('should convert vector to Float32Array', () => {
      const vector = createVector3(2, 3, 4);
      const floatArray = vector3ToFloat32Array(vector);

      expect(floatArray).toBeInstanceOf(Float32Array);
      expect(floatArray).toEqual(new Float32Array([2, 3, 4]));
    });
  });
});
