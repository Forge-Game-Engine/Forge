import { CircleCollider } from './circle-collider';
import { Vector2 } from '../../math';
import { beforeEach, describe, expect, it } from 'vitest';

describe('CircleCollider', () => {
  let collider: CircleCollider;

  beforeEach(() => {
    collider = new CircleCollider(new Vector2(5, 5), 3); // Center at (5, 5) with radius 3
  });

  describe('minX', () => {
    it('should return the minimum x-coordinate of the circle', () => {
      expect(collider.minX).toBe(2); // 5 - 3 = 2
    });
  });

  describe('maxX', () => {
    it('should return the maximum x-coordinate of the circle', () => {
      expect(collider.maxX).toBe(8); // 5 + 3 = 8
    });
  });

  describe('minY', () => {
    it('should return the minimum y-coordinate of the circle', () => {
      expect(collider.minY).toBe(2); // 5 - 3 = 2
    });
  });

  describe('maxY', () => {
    it('should return the maximum y-coordinate of the circle', () => {
      expect(collider.maxY).toBe(8); // 5 + 3 = 8
    });
  });

  describe('contains', () => {
    it('should return true for a point inside the circle', () => {
      const point = new Vector2(6, 5); // Inside the circle
      expect(collider.contains(point)).toBe(true);
    });

    it('should return true for a point on the edge of the circle', () => {
      const point = new Vector2(8, 5); // On the edge of the circle
      expect(collider.contains(point)).toBe(true);
    });

    it('should return false for a point outside the circle', () => {
      const point = new Vector2(9, 5); // Outside the circle
      expect(collider.contains(point)).toBe(false);
    });

    it('should return false for a point far outside the circle', () => {
      const point = new Vector2(20, 20); // Far outside the circle
      expect(collider.contains(point)).toBe(false);
    });
  });
});
