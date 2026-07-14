import { describe, expect, it } from 'vitest';
import { PolygonShape } from './polygon-shape.js';
import { Vector2 } from '../../math/index.js';

describe('PolygonShape', () => {
  describe('constructor', () => {
    it('should throw an error if fewer than 3 vertices are provided', () => {
      expect(
        () => new PolygonShape([new Vector2(0, 0), new Vector2(1, 0)]),
      ).toThrow();
    });

    it('should throw an error if the vertices are collinear', () => {
      expect(
        () =>
          new PolygonShape([
            new Vector2(0, 0),
            new Vector2(1, 0),
            new Vector2(2, 0),
          ]),
      ).toThrow();
    });

    it('should throw an error if the vertices form a concave polygon', () => {
      expect(
        () =>
          new PolygonShape([
            new Vector2(0, 0),
            new Vector2(4, 0),
            new Vector2(4, 4),
            new Vector2(2, 1),
            new Vector2(0, 4),
          ]),
      ).toThrow();
    });

    it('should re-center vertices around their centroid', () => {
      const triangle = new PolygonShape([
        new Vector2(0, 0),
        new Vector2(4, 0),
        new Vector2(0, 4),
      ]);

      let sumX = 0;
      let sumY = 0;

      for (const vertex of triangle.vertices) {
        sumX += vertex.x;
        sumY += vertex.y;
      }

      // the centroid of the re-centered vertices should be at the origin
      expect(sumX / triangle.vertices.length).toBeCloseTo(0);
      expect(sumY / triangle.vertices.length).toBeCloseTo(0);

      // (4/3, 4/3) is the centroid of the original triangle
      expect(triangle.vertices[0].x).toBeCloseTo(0 - 4 / 3);
      expect(triangle.vertices[0].y).toBeCloseTo(0 - 4 / 3);
    });

    it('should normalize vertex winding to produce outward-facing normals', () => {
      // a unit square specified in reversed (clockwise-flipped) order
      const reversed = new PolygonShape([
        new Vector2(-1, 1),
        new Vector2(1, 1),
        new Vector2(1, -1),
        new Vector2(-1, -1),
      ]);

      const expectedNormals = [
        new Vector2(0, -1),
        new Vector2(1, 0),
        new Vector2(0, 1),
        new Vector2(-1, 0),
      ];

      for (let i = 0; i < expectedNormals.length; i++) {
        expect(reversed.normals[i].x).toBeCloseTo(expectedNormals[i].x);
        expect(reversed.normals[i].y).toBeCloseTo(expectedNormals[i].y);
      }
    });
  });

  describe('rectangle', () => {
    it('should create a rectangle centered on the origin', () => {
      const rectangle = PolygonShape.rectangle(4, 2);

      expect(rectangle.vertices).toHaveLength(4);
      expect(rectangle.vertices[0].x).toBeCloseTo(-2);
      expect(rectangle.vertices[0].y).toBeCloseTo(-1);
      expect(rectangle.vertices[2].x).toBeCloseTo(2);
      expect(rectangle.vertices[2].y).toBeCloseTo(1);
    });

    it('should produce outward-facing normals', () => {
      const rectangle = PolygonShape.rectangle(2, 2);

      expect(rectangle.normals[0].equals(new Vector2(0, -1))).toBe(true);
      expect(rectangle.normals[1].equals(new Vector2(1, 0))).toBe(true);
      expect(rectangle.normals[2].equals(new Vector2(0, 1))).toBe(true);
      expect(rectangle.normals[3].equals(new Vector2(-1, 0))).toBe(true);
    });
  });

  describe('getArea', () => {
    it('should calculate the area of a rectangle', () => {
      const rectangle = PolygonShape.rectangle(4, 2);

      expect(rectangle.getArea()).toBeCloseTo(8);
    });

    it('should calculate the area of a triangle', () => {
      const triangle = new PolygonShape([
        new Vector2(0, 0),
        new Vector2(4, 0),
        new Vector2(0, 4),
      ]);

      expect(triangle.getArea()).toBeCloseTo(8);
    });
  });

  describe('getMomentOfInertia', () => {
    it('should calculate the moment of inertia of a square', () => {
      const square = PolygonShape.rectangle(2, 2);
      const mass = 10;

      // I = (1/3) * m * s^2 for a square of side length s
      expect(square.getMomentOfInertia(mass)).toBeCloseTo((mass * 4) / 3);
    });
  });

  describe('getBoundingRadius', () => {
    it('should return the distance from the centroid to the furthest vertex', () => {
      const square = PolygonShape.rectangle(2, 2);

      expect(square.getBoundingRadius()).toBeCloseTo(Math.sqrt(2));
    });
  });

  describe('getWorldVertices', () => {
    it('should translate vertices by position with no rotation', () => {
      const square = PolygonShape.rectangle(2, 2);
      const worldVertices = square.getWorldVertices(new Vector2(5, 5), 0);

      expect(worldVertices[0].x).toBeCloseTo(4);
      expect(worldVertices[0].y).toBeCloseTo(4);
    });

    it('should rotate and translate vertices', () => {
      const square = PolygonShape.rectangle(2, 2);
      const worldVertices = square.getWorldVertices(
        new Vector2(5, 5),
        Math.PI / 2,
      );

      expect(worldVertices[0].x).toBeCloseTo(6);
      expect(worldVertices[0].y).toBeCloseTo(4);
    });

    it('should return the cached array while position and angle are unchanged', () => {
      const square = PolygonShape.rectangle(2, 2);
      const position = new Vector2(5, 5);

      expect(square.getWorldVertices(position, 0)).toBe(
        square.getWorldVertices(position, 0),
      );
    });

    it('should return a different instance with a different value when position changes', () => {
      const square = PolygonShape.rectangle(2, 2);
      const first = square.getWorldVertices(new Vector2(5, 5), 0);
      const second = square.getWorldVertices(new Vector2(5, 5), 0);

      expect(first).toBe(second);

      const third = square.getWorldVertices(new Vector2(10, 5), 0);

      expect(third).not.toBe(first);
      expect(third[0].x).toBeCloseTo(9);
      expect(third[0].y).toBeCloseTo(4);
    });
  });

  describe('getWorldNormals', () => {
    it('should rotate normals', () => {
      const square = PolygonShape.rectangle(2, 2);
      const worldNormals = square.getWorldNormals(Math.PI / 2);

      expect(worldNormals[0].x).toBeCloseTo(1);
      expect(worldNormals[0].y).toBeCloseTo(0);
    });

    it('should return the cached array while the angle is unchanged', () => {
      const square = PolygonShape.rectangle(2, 2);

      expect(square.getWorldNormals(0)).toBe(square.getWorldNormals(0));
    });

    it('should return a different instance with a different value when angle changes', () => {
      const square = PolygonShape.rectangle(2, 2);
      const first = square.getWorldNormals(0);
      const second = square.getWorldNormals(Math.PI / 2);

      expect(second).not.toBe(first);
      expect(second[0].x).toBeCloseTo(1);
      expect(second[0].y).toBeCloseTo(0);
    });
  });
});
