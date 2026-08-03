import { describe, expect, it } from 'vitest';
import { PolygonCollider } from './polygon-collider.js';
import { createVector2, vector2Zero } from '../../math/index.js';

describe('PolygonCollider', () => {
  describe('constructor', () => {
    it('should throw an error if fewer than 3 vertices are provided', () => {
      expect(
        () => new PolygonCollider([createVector2(0, 0), createVector2(1, 0)]),
      ).toThrow();
    });

    it('should throw an error if the vertices are collinear', () => {
      expect(
        () =>
          new PolygonCollider([
            createVector2(0, 0),
            createVector2(1, 0),
            createVector2(2, 0),
          ]),
      ).toThrow();
    });

    it('should throw an error if the vertices form a concave polygon', () => {
      expect(
        () =>
          new PolygonCollider([
            createVector2(0, 0),
            createVector2(4, 0),
            createVector2(4, 4),
            createVector2(2, 1),
            createVector2(0, 4),
          ]),
      ).toThrow();
    });

    it('should re-center vertices around their centroid', () => {
      const triangle = new PolygonCollider([
        createVector2(0, 0),
        createVector2(4, 0),
        createVector2(0, 4),
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
        createVector2(-1, -1),
        createVector2(1, -1),
        createVector2(1, 1),
        createVector2(-1, 1),
      ]);

      expect(collider.type).toBe('polygon');
    });
  });

  describe('getWorldVertices', () => {
    it('should translate local vertices by position with no rotation', () => {
      const square = new PolygonCollider([
        createVector2(-1, -1),
        createVector2(1, -1),
        createVector2(1, 1),
        createVector2(-1, 1),
      ]);

      const worldVertices = square.getWorldVertices(createVector2(5, 5), 0);

      expect(worldVertices[0].x).toBeCloseTo(4);
      expect(worldVertices[0].y).toBeCloseTo(4);
    });

    it('should rotate local vertices before translating', () => {
      const square = new PolygonCollider([
        createVector2(-1, -1),
        createVector2(1, -1),
        createVector2(1, 1),
        createVector2(-1, 1),
      ]);

      const worldVertices = square.getWorldVertices(vector2Zero(), Math.PI / 2);

      expect(worldVertices[0].x).toBeCloseTo(1);
      expect(worldVertices[0].y).toBeCloseTo(-1);
    });
  });

  describe('computeAabb', () => {
    it('should compute an axis-aligned bounding box that grows for a rotated square', () => {
      const square = new PolygonCollider([
        createVector2(-1, -1),
        createVector2(1, -1),
        createVector2(1, 1),
        createVector2(-1, 1),
      ]);

      const unrotatedAabb = square.computeAabb(vector2Zero(), 0);

      expect(unrotatedAabb.min.x).toBeCloseTo(-1);
      expect(unrotatedAabb.max.x).toBeCloseTo(1);

      const rotatedAabb = square.computeAabb(vector2Zero(), Math.PI / 4);

      expect(rotatedAabb.max.x).toBeCloseTo(Math.SQRT2);
      expect(rotatedAabb.max.y).toBeCloseTo(Math.SQRT2);
    });
  });
});
