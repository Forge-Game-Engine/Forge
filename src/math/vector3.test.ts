import { beforeEach, describe, expect, it } from 'vitest';
import { Vector3 } from './vector3';

describe('Vector3', () => {
  describe('constructor', () => {
    it('should create a vector with default values', () => {
      const vector = new Vector3();
      expect(vector.x).toBe(0);
      expect(vector.y).toBe(0);
      expect(vector.z).toBe(0);
    });

    it('should create a vector with specified values', () => {
      const vector = new Vector3(2, 3, 4);
      expect(vector.x).toBe(2);
      expect(vector.y).toBe(3);
      expect(vector.z).toBe(4);
    });
  });

  describe('static properties', () => {
    it('should return correct zero vector', () => {
      expect(Vector3.zero.equals(new Vector3(0, 0, 0))).toBe(true);
    });

    it('should return correct one vector', () => {
      expect(Vector3.one.equals(new Vector3(1, 1, 1))).toBe(true);
    });

    it('should return correct up vector', () => {
      expect(Vector3.up.equals(new Vector3(0, 1, 0))).toBe(true);
    });

    it('should return correct down vector', () => {
      expect(Vector3.down.equals(new Vector3(0, -1, 0))).toBe(true);
    });

    it('should return correct left vector', () => {
      expect(Vector3.left.equals(new Vector3(-1, 0, 0))).toBe(true);
    });

    it('should return correct right vector', () => {
      expect(Vector3.right.equals(new Vector3(1, 0, 0))).toBe(true);
    });

    it('should return correct forward vector', () => {
      expect(Vector3.forward.equals(new Vector3(0, 0, 1))).toBe(true);
    });

    it('should return correct backward vector', () => {
      expect(Vector3.backward.equals(new Vector3(0, 0, -1))).toBe(true);
    });
  });

  describe('vector operations', () => {
    let v1: Vector3;
    let v2: Vector3;

    beforeEach(() => {
      v1 = new Vector3(2, 3, 4);
      v2 = new Vector3(5, 6, 7);
    });

    it('should set vector components', () => {
      const vector = new Vector3();
      vector.set(v1);
      expect(vector).toEqual(v1);
    });

    it('should add vectors', () => {
      const result = v1.add(v2);
      expect(result.equals(new Vector3(7, 9, 11))).toBe(true);
    });

    it('should subtract vectors', () => {
      const result = v1.subtract(v2);
      expect(result.equals(new Vector3(-3, -3, -3))).toBe(true);
    });

    it('should multiply by scalar', () => {
      const result = v1.multiply(2);
      expect(result.equals(new Vector3(4, 6, 8))).toBe(true);
    });

    it('should multiply components', () => {
      const result = v1.multiplyComponents(v2);
      expect(result.equals(new Vector3(10, 18, 28))).toBe(true);
    });

    it('should divide by scalar', () => {
      const result = v1.divide(2);
      expect(result.equals(new Vector3(1, 1.5, 2))).toBe(true);
    });
  });

  describe('vector properties', () => {
    it('should calculate magnitude', () => {
      const vector = new Vector3(1, 2, 2);
      expect(vector.magnitude()).toBe(3);
    });

    it('should calculate magnitude squared', () => {
      const vector = new Vector3(1, 2, 2);
      expect(vector.magnitudeSquared()).toBe(9);
    });

    it('should normalize vector', () => {
      const vector = new Vector3(1, 2, 2);
      const normalized = vector.normalize();
      expect(normalized.x).toBeCloseTo(1 / 3);
      expect(normalized.y).toBeCloseTo(2 / 3);
      expect(normalized.z).toBeCloseTo(2 / 3);
    });

    it('should handle normalizing zero vector', () => {
      const vector = new Vector3(0, 0, 0);
      const normalized = vector.normalize();
      expect(normalized).toEqual(vector);
    });
  });

  describe('utility methods', () => {
    it('should floor components', () => {
      const vector = new Vector3(3.7, 4.2, 5.9);
      const floored = vector.floorComponents();
      expect(floored.equals(new Vector3(3, 4, 5))).toBe(true);
    });

    it('should clone vector', () => {
      const original = new Vector3(2, 3, 4);
      const clone = original.clone();
      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
    });

    it('should convert to string', () => {
      const vector = new Vector3(2.123, 3.456, 4.789);
      expect(vector.toString()).toBe('(2.1, 3.5, 4.8)');
    });

    it('should convert vector to Float32Array', () => {
      const vector = new Vector3(2, 3, 4);
      const floatArray = vector.toFloat32Array();

      expect(floatArray).toBeInstanceOf(Float32Array);
      expect(floatArray).toEqual(new Float32Array([2, 3, 4]));
    });
  });
});
