import { beforeEach, describe, expect, it } from 'vitest';
import { Vector2 } from './vector2';

describe('Vector2', () => {
  describe('constructor', () => {
    it('should create a vector with default values', () => {
      const vector = new Vector2();
      expect(vector.x).toBe(0);
      expect(vector.y).toBe(0);
    });

    it('should create a vector with specified values', () => {
      const vector = new Vector2(2, 3);
      expect(vector.x).toBe(2);
      expect(vector.y).toBe(3);
    });
  });

  describe('static properties', () => {
    it('should return correct up vector', () => {
      expect(Vector2.up.equals(new Vector2(0, 1))).toBe(true);
    });

    it('should return correct down vector', () => {
      expect(Vector2.down.equals(new Vector2(0, -1))).toBe(true);
    });

    it('should return correct left vector', () => {
      expect(Vector2.left.equals(new Vector2(-1, 0))).toBe(true);
    });

    it('should return correct right vector', () => {
      expect(Vector2.right.equals(new Vector2(1, 0))).toBe(true);
    });

    it('should return correct zero vector', () => {
      expect(Vector2.zero.equals(new Vector2(0, 0))).toBe(true);
    });

    it('should return correct one vector', () => {
      expect(Vector2.one.equals(new Vector2(1, 1))).toBe(true);
    });
  });

  describe('vector operations', () => {
    let v1: Vector2;
    let v2: Vector2;

    beforeEach(() => {
      v1 = new Vector2(2, 3);
      v2 = new Vector2(4, 5);
    });

    it('should set vector components', () => {
      const vector = new Vector2();
      vector.set(v1);
      expect(vector).toEqual(v1);
    });

    it('should add vectors', () => {
      const result = v1.add(v2);
      expect(result.equals(new Vector2(6, 8))).toBe(true);
    });

    it('should subtract vectors', () => {
      const result = v1.subtract(v2);
      expect(result.equals(new Vector2(-2, -2))).toBe(true);
    });

    it('should multiply by scalar', () => {
      const result = v1.multiply(2);
      expect(result.equals(new Vector2(4, 6))).toBe(true);
    });

    it('should multiply components', () => {
      const result = v1.multiplyComponents(v2);
      expect(result.equals(new Vector2(8, 15))).toBe(true);
    });

    it('should divide by scalar', () => {
      const result = v1.divide(2);
      expect(result.equals(new Vector2(1, 1.5))).toBe(true);
    });
  });

  describe('vector properties', () => {
    it('should calculate magnitude', () => {
      const vector = new Vector2(3, 4);
      expect(vector.magnitude()).toBe(5);
    });

    it('should calculate magnitude squared', () => {
      const vector = new Vector2(3, 4);
      expect(vector.magnitudeSquared()).toBe(25);
    });

    it('should normalize vector', () => {
      const vector = new Vector2(3, 4);
      const normalized = vector.normalize();
      expect(normalized.x).toBeCloseTo(0.6);
      expect(normalized.y).toBeCloseTo(0.8);
    });

    it('should handle normalizing zero vector', () => {
      const vector = new Vector2(0, 0);
      const normalized = vector.normalize();
      expect(normalized).toEqual(vector);
    });
  });

  describe('utility methods', () => {
    it('should floor components', () => {
      const vector = new Vector2(3.7, 4.2);
      const floored = vector.floorComponents();
      expect(floored.equals(new Vector2(3, 4))).toBe(true);
    });

    it('should clone vector', () => {
      const original = new Vector2(2, 3);
      const clone = original.clone();
      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
    });

    it('should convert to string', () => {
      const vector = new Vector2(2.123, 3.456);
      expect(vector.toString()).toBe('(2.1, 3.5)');
    });

    it('should convert vector to Float32Array', () => {
      const vector = new Vector2(2, 3);
      const floatArray = vector.toFloat32Array();

      expect(floatArray).toBeInstanceOf(Float32Array);
      expect(floatArray).toEqual(new Float32Array([2, 3]));
    });
  });
});
