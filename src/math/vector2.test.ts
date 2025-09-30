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
      expect(Vector2.up.equals(new Vector2(0, -1))).toBe(true);
    });

    it('should return correct down vector', () => {
      expect(Vector2.down.equals(new Vector2(0, 1))).toBe(true);
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

    it('should calculate distance to another vector (positive coordinates)', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(4, 6);
      expect(v1.distanceTo(v2)).toBeCloseTo(5);
      expect(v2.distanceTo(v1)).toBeCloseTo(5);
    });

    it('should calculate distance to another vector (negative coordinates)', () => {
      const v1 = new Vector2(-1, -2);
      const v2 = new Vector2(-4, -6);
      expect(v1.distanceTo(v2)).toBeCloseTo(5);
      expect(v2.distanceTo(v1)).toBeCloseTo(5);
    });

    it('should calculate distance to itself as zero', () => {
      const v = new Vector2(3, 4);
      expect(v.distanceTo(v)).toBe(0);
    });

    it('should calculate distance when one vector is at origin', () => {
      const origin = new Vector2(0, 0);
      const v = new Vector2(3, 4);
      expect(origin.distanceTo(v)).toBe(5);
      expect(v.distanceTo(origin)).toBe(5);
    });

    it('should calculate distance for floating point coordinates', () => {
      const v1 = new Vector2(1.5, 2.5);
      const v2 = new Vector2(4.5, 6.5);
      expect(v1.distanceTo(v2)).toBeCloseTo(5);
    });

    it('should rotate vector by 0 radians (no change)', () => {
      const vector = new Vector2(1, 0);
      const rotated = vector.rotate(0);
      expect(rotated.x).toBeCloseTo(1);
      expect(rotated.y).toBeCloseTo(0);
    });

    it('should rotate vector by PI/2 radians (90 degrees counterclockwise)', () => {
      const vector = new Vector2(1, 0);
      const rotated = vector.rotate(Math.PI / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(1);
    });

    it('should rotate vector by PI radians (180 degrees)', () => {
      const vector = new Vector2(1, 0);
      const rotated = vector.rotate(Math.PI);
      expect(rotated.x).toBeCloseTo(-1);
      expect(rotated.y).toBeCloseTo(0);
    });

    it('should rotate vector by 3*PI/2 radians (270 degrees counterclockwise)', () => {
      const vector = new Vector2(1, 0);
      const rotated = vector.rotate((3 * Math.PI) / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(-1);
    });

    it('should rotate vector by negative angle (clockwise)', () => {
      const vector = new Vector2(0, 1);
      const rotated = vector.rotate(-Math.PI / 2);
      expect(rotated.x).toBeCloseTo(1);
      expect(rotated.y).toBeCloseTo(0);
    });

    it('should rotate zero vector and remain zero', () => {
      const vector = new Vector2(0, 0);
      const rotated = vector.rotate(Math.PI / 4);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(0);
    });
  });
});
