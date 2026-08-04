import { describe, expect, it } from 'vitest';
import { TerrainCollider } from './terrain-collider.js';
import { Vec2 } from '../../math/index.js';

describe('TerrainCollider', () => {
  describe('constructor', () => {
    it('should throw an error if fewer than 2 points are provided', () => {
      expect(() => new TerrainCollider([Vec2.create(0, 0)], 100)).toThrow();
    });

    it('should throw an error if points are not ordered by strictly increasing x', () => {
      expect(
        () =>
          new TerrainCollider(
            [Vec2.create(0, 0), Vec2.create(-1, 0), Vec2.create(2, 0)],
            100,
          ),
      ).toThrow();
    });

    it('should throw an error if points have equal x', () => {
      expect(
        () => new TerrainCollider([Vec2.create(0, 0), Vec2.create(0, 5)], 100),
      ).toThrow();
    });

    it('should throw an error if depth is not positive', () => {
      expect(
        () => new TerrainCollider([Vec2.create(0, 0), Vec2.create(10, 0)], 0),
      ).toThrow();
    });

    it('should have type "terrain"', () => {
      const collider = new TerrainCollider(
        [Vec2.create(0, 0), Vec2.create(10, 0)],
        100,
      );

      expect(collider.type).toBe('terrain');
    });

    it('should set bottomY to depth below the point with the greatest y', () => {
      const collider = new TerrainCollider(
        [Vec2.create(0, 10), Vec2.create(10, -5), Vec2.create(20, 0)],
        100,
      );

      expect(collider.bottomY).toBeCloseTo(110);
    });

    it('should build one segment per consecutive pair of points', () => {
      const collider = new TerrainCollider(
        [Vec2.create(0, 0), Vec2.create(10, 0), Vec2.create(20, 0)],
        100,
      );

      expect(collider.segments).toHaveLength(2);
      expect(collider.segments[0].minX).toBeCloseTo(0);
      expect(collider.segments[0].maxX).toBeCloseTo(10);
      expect(collider.segments[1].minX).toBeCloseTo(10);
      expect(collider.segments[1].maxX).toBeCloseTo(20);
    });
  });

  describe('computeAabb', () => {
    it('should span the points and the bottom edge, unrotated', () => {
      const collider = new TerrainCollider(
        [Vec2.create(-10, 5), Vec2.create(0, -5), Vec2.create(10, 5)],
        50,
      );

      const aabb = collider.computeAabb(Vec2.zero, 0);

      expect(aabb.min.x).toBeCloseTo(-10);
      expect(aabb.max.x).toBeCloseTo(10);
      expect(aabb.min.y).toBeCloseTo(-5);
      expect(aabb.max.y).toBeCloseTo(55);
    });

    it('should translate the AABB by position', () => {
      const collider = new TerrainCollider(
        [Vec2.create(0, 0), Vec2.create(10, 0)],
        50,
      );

      const aabb = collider.computeAabb(Vec2.create(100, 200), 0);

      expect(aabb.min.x).toBeCloseTo(100);
      expect(aabb.max.x).toBeCloseTo(110);
      expect(aabb.min.y).toBeCloseTo(200);
    });
  });
});
