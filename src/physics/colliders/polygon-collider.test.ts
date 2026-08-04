import { describe, expect, it } from 'vitest';
import { PolygonCollider } from './polygon-collider.js';
import { Vec2 } from '../../math/index.js';

describe('PolygonCollider', () => {
  describe('constructor', () => {
    it('should throw an error if fewer than 3 vertices are provided', () => {
      expect(
        () =>
          new PolygonCollider([
            { x: 0, y: 0 },
            { x: 1, y: 0 },
          ]),
      ).toThrow();
    });

    it('should throw an error if the vertices are collinear', () => {
      expect(
        () =>
          new PolygonCollider([
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
          ]),
      ).toThrow();
    });

    it('should throw an error if the vertices form a concave polygon', () => {
      expect(
        () =>
          new PolygonCollider([
            { x: 0, y: 0 },
            { x: 4, y: 0 },
            { x: 4, y: 4 },
            { x: 2, y: 1 },
            { x: 0, y: 4 },
          ]),
      ).toThrow();
    });

    it('should re-center vertices around their centroid', () => {
      const triangle = new PolygonCollider([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 4 },
      ]);

      let sumX = 0;
      let sumY = 0;

      for (const vertex of triangle.vertices) {
        sumX += vertex.x;
        sumY += vertex.y;
      }

      expect(sumX / triangle.vertices.length).toBeCloseTo(0);
      expect(sumY / triangle.vertices.length).toBeCloseTo(0);
    });

    it('should have type "polygon"', () => {
      const collider = new PolygonCollider([
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
      ]);

      expect(collider.type).toBe('polygon');
    });
  });

  describe('getWorldVertices', () => {
    it('should translate local vertices by position with no rotation', () => {
      const square = new PolygonCollider([
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
      ]);

      const worldVertices = square.getWorldVertices({ x: 5, y: 5 }, 0);

      expect(worldVertices[0].x).toBeCloseTo(4);
      expect(worldVertices[0].y).toBeCloseTo(4);
    });

    it('should rotate local vertices before translating', () => {
      const square = new PolygonCollider([
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
      ]);

      const worldVertices = square.getWorldVertices(Vec2.zero, Math.PI / 2);

      expect(worldVertices[0].x).toBeCloseTo(1);
      expect(worldVertices[0].y).toBeCloseTo(-1);
    });
  });

  describe('computeAabb', () => {
    it('should compute an axis-aligned bounding box that grows for a rotated square', () => {
      const square = new PolygonCollider([
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
      ]);

      const unrotatedAabb = square.computeAabb(Vec2.zero, 0);

      expect(unrotatedAabb.min.x).toBeCloseTo(-1);
      expect(unrotatedAabb.max.x).toBeCloseTo(1);

      const rotatedAabb = square.computeAabb(Vec2.zero, Math.PI / 4);

      expect(rotatedAabb.max.x).toBeCloseTo(Math.SQRT2);
      expect(rotatedAabb.max.y).toBeCloseTo(Math.SQRT2);
    });
  });
});
