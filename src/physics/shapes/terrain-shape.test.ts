import { describe, expect, it } from 'vitest';
import { TerrainShape } from './terrain-shape.js';
import { Vector2 } from '../../math/index.js';

describe('TerrainShape', () => {
  describe('constructor', () => {
    it('should throw an error if fewer than 2 points are provided', () => {
      expect(() => new TerrainShape([new Vector2(0, 0)], 10)).toThrow();
    });

    it('should throw an error if points are not ordered by strictly increasing x', () => {
      expect(
        () =>
          new TerrainShape(
            [new Vector2(0, 0), new Vector2(0, 10), new Vector2(2, 0)],
            10,
          ),
      ).toThrow();
    });

    it('should throw an error if depth is not positive', () => {
      expect(
        () => new TerrainShape([new Vector2(0, 0), new Vector2(1, 0)], 0),
      ).toThrow();
    });

    it('should not re-center points around a centroid', () => {
      const terrain = new TerrainShape(
        [new Vector2(0, 0), new Vector2(10, 0)],
        10,
      );

      expect(terrain.points[0].x).toBeCloseTo(0);
      expect(terrain.points[0].y).toBeCloseTo(0);
      expect(terrain.points[1].x).toBeCloseTo(10);
      expect(terrain.points[1].y).toBeCloseTo(0);
    });

    it('should place the flat bottom edge depth units below the lowest point', () => {
      const terrain = new TerrainShape(
        [new Vector2(0, -20), new Vector2(10, 5), new Vector2(20, 0)],
        10,
      );

      expect(terrain.bottomY).toBeCloseTo(15);
    });
  });

  describe('segments', () => {
    it('should create one convex quad segment per consecutive pair of points', () => {
      const terrain = new TerrainShape(
        [new Vector2(0, 0), new Vector2(10, 0), new Vector2(20, -5)],
        10,
      );

      expect(terrain.segments).toHaveLength(2);
      expect(terrain.segments[0].minX).toBeCloseTo(0);
      expect(terrain.segments[0].maxX).toBeCloseTo(10);
      expect(terrain.segments[1].minX).toBeCloseTo(10);
      expect(terrain.segments[1].maxX).toBeCloseTo(20);
    });

    it('should produce an upward-facing normal for a flat segment', () => {
      const terrain = new TerrainShape(
        [new Vector2(0, 0), new Vector2(10, 0)],
        10,
      );

      const [topNormal] = terrain.segments[0].normals;

      expect(topNormal.x).toBeCloseTo(0);
      expect(topNormal.y).toBeCloseTo(-1);
    });
  });

  describe('getArea', () => {
    it('should calculate the area of a flat terrain strip', () => {
      const terrain = new TerrainShape(
        [new Vector2(0, 0), new Vector2(10, 0)],
        5,
      );

      expect(terrain.getArea()).toBeCloseTo(50);
    });

    it('should calculate the area of a sloped terrain strip', () => {
      // A single downward slope closed off by a flat bottom at y = 10 forms
      // a trapezoid with parallel verticals of length 10 and 5, width 10.
      const terrain = new TerrainShape(
        [new Vector2(0, 0), new Vector2(10, 5)],
        5,
      );

      expect(terrain.getArea()).toBeCloseTo(((10 + 5) / 2) * 10);
    });
  });

  describe('getMomentOfInertia', () => {
    it('should calculate the moment of inertia of a flat terrain strip like an equivalent rectangle', () => {
      const width = 10;
      const height = 5;
      const mass = 20;

      const terrain = new TerrainShape(
        [new Vector2(0, 0), new Vector2(width, 0)],
        height,
      );

      // Matches PolygonShape.getMomentOfInertia's convention for a
      // rectangle about its centroid (see polygon-shape.test.ts's
      // equivalent square case).
      const expected = (mass / 6) * (width * width + height * height);

      expect(terrain.getMomentOfInertia(mass)).toBeCloseTo(expected);
    });
  });

  describe('getBoundingRadius', () => {
    it('should return the distance from the local origin to the furthest vertex', () => {
      const terrain = new TerrainShape(
        [new Vector2(0, 0), new Vector2(10, 0)],
        5,
      );

      // Furthest vertex from the local origin (0,0) is the bottom-right
      // corner at (10, 5).
      expect(terrain.getBoundingRadius()).toBeCloseTo(
        Math.sqrt(10 * 10 + 5 * 5),
      );
    });
  });
});
