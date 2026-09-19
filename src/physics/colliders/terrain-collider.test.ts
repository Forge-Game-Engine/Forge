import { describe, expect, it } from 'vitest';
import { buildTerrainEdgeSlab, TerrainCollider } from './terrain-collider.js';
import { Vec2 } from '../../math/index.js';

describe('TerrainCollider', () => {
  describe('constructor', () => {
    it('should throw an error if fewer than 2 points are provided', () => {
      expect(() => new TerrainCollider([{ x: 0, y: 0 }], 100)).toThrow();
    });

    it('should throw an error if points are not ordered by strictly increasing x', () => {
      expect(
        () =>
          new TerrainCollider(
            [
              { x: 0, y: 0 },
              { x: -1, y: 0 },
              { x: 2, y: 0 },
            ],
            100,
          ),
      ).toThrow();
    });

    it('should throw an error if points have equal x', () => {
      expect(
        () =>
          new TerrainCollider(
            [
              { x: 0, y: 0 },
              { x: 0, y: 5 },
            ],
            100,
          ),
      ).toThrow();
    });

    it('should throw an error if depth is not positive', () => {
      expect(
        () =>
          new TerrainCollider(
            [
              { x: 0, y: 0 },
              { x: 10, y: 0 },
            ],
            0,
          ),
      ).toThrow();
    });

    it('should have type "terrain"', () => {
      const collider = new TerrainCollider(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        100,
      );

      expect(collider.type).toBe('terrain');
    });

    it('should set bottomY to depth below the point with the greatest y', () => {
      const collider = new TerrainCollider(
        [
          { x: 0, y: 10 },
          { x: 10, y: -5 },
          { x: 20, y: 0 },
        ],
        100,
      );

      expect(collider.bottomY).toBeCloseTo(110);
    });

    it('should build one surface edge per consecutive pair of points', () => {
      const collider = new TerrainCollider(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 20, y: 0 },
        ],
        100,
      );

      expect(collider.surface).toHaveLength(2);
      expect(collider.surface[0].start.x).toBeCloseTo(0);
      expect(collider.surface[0].end.x).toBeCloseTo(10);
      expect(collider.surface[1].start.x).toBeCloseTo(10);
      expect(collider.surface[1].end.x).toBeCloseTo(20);
    });

    it('should give every surface edge a unit normal pointing away from the slab', () => {
      // The slab always extends toward local +y, so every surface normal
      // must point broadly toward local -y - including on the steep,
      // oppositely-sloped edges either side of the middle point.
      const collider = new TerrainCollider(
        [
          { x: 0, y: 0 },
          { x: 10, y: -10 },
          { x: 20, y: 30 },
        ],
        100,
      );

      expect(collider.surface[0].normal.x).toBeCloseTo(-Math.SQRT1_2);
      expect(collider.surface[0].normal.y).toBeCloseTo(-Math.SQRT1_2);

      for (const edge of collider.surface) {
        expect(Vec2.magnitude(edge.normal)).toBeCloseTo(1);
        expect(edge.normal.y).toBeLessThan(0);
      }
    });

    it('should share each interior point between the two edges that meet at it', () => {
      const collider = new TerrainCollider(
        [
          { x: 0, y: 0 },
          { x: 10, y: 5 },
          { x: 20, y: 0 },
        ],
        100,
      );

      expect(collider.surface[0].end).toBe(collider.points[1]);
      expect(collider.surface[1].start).toBe(collider.points[1]);
    });
  });

  describe('buildTerrainEdgeSlab', () => {
    it('should close a surface edge off into a quad running down to the bottom edge', () => {
      const collider = new TerrainCollider(
        [
          { x: 0, y: 0 },
          { x: 10, y: -4 },
        ],
        50,
      );

      const slab = buildTerrainEdgeSlab(
        collider.surface[0],
        collider.bottomY,
        Vec2.zero,
        0,
      );

      expect(slab.vertices).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: -4 },
        { x: 10, y: 50 },
        { x: 0, y: 50 },
      ]);
      expect(slab.normals[0]).toEqual(collider.surface[0].normal);
      expect(slab.normals[0]).not.toBe(collider.surface[0].normal);
      expect(slab.normals[1].x).toBeCloseTo(1);
      expect(slab.normals[2].y).toBeCloseTo(1);
      expect(slab.normals[3].x).toBeCloseTo(-1);
    });

    it('should transform the quad by the terrain body position and rotation', () => {
      const collider = new TerrainCollider(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        50,
      );

      const slab = buildTerrainEdgeSlab(
        collider.surface[0],
        collider.bottomY,
        { x: 100, y: 200 },
        Math.PI,
      );

      expect(slab.vertices[0].x).toBeCloseTo(100);
      expect(slab.vertices[0].y).toBeCloseTo(200);
      expect(slab.vertices[1].x).toBeCloseTo(90);
      // Rotating by PI flips the slab, so its bottom edge ends up above the
      // surface in world space.
      expect(slab.vertices[2].y).toBeCloseTo(150);
      expect(slab.normals[0].y).toBeCloseTo(1);
    });
  });

  describe('computeAabb', () => {
    it('should span the points and the bottom edge, unrotated', () => {
      const collider = new TerrainCollider(
        [
          { x: -10, y: 5 },
          { x: 0, y: -5 },
          { x: 10, y: 5 },
        ],
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
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        50,
      );

      const aabb = collider.computeAabb({ x: 100, y: 200 }, 0);

      expect(aabb.min.x).toBeCloseTo(100);
      expect(aabb.max.x).toBeCloseTo(110);
      expect(aabb.min.y).toBeCloseTo(200);
    });
  });
});
