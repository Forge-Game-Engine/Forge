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

    it('should keep its vertices where they were authored', () => {
      const triangle = new PolygonCollider([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 4 },
      ]);

      expect(triangle.vertices).toEqual([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 4 },
      ]);
    });

    it('should report its centroid as its local center of mass', () => {
      const triangle = new PolygonCollider([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 4 },
      ]);

      expect(triangle.localCenterOfMass.x).toBeCloseTo(4 / 3);
      expect(triangle.localCenterOfMass.y).toBeCloseTo(4 / 3);
    });

    it('should give a box the moment of inertia m(w² + h²) / 12', () => {
      const box = new PolygonCollider([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 2 },
        { x: 0, y: 2 },
      ]);

      expect(box.mass).toBeCloseTo(8);
      expect(box.momentOfInertia).toBeCloseTo((8 * (4 * 4 + 2 * 2)) / 12);
    });

    it('should compute its moment of inertia about its centroid, wherever it is authored', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 4 },
      ];
      const authored = new PolygonCollider(vertices);
      const shifted = new PolygonCollider(
        vertices.map((vertex) => ({ x: vertex.x + 10, y: vertex.y - 7 })),
      );

      expect(shifted.mass).toBeCloseTo(authored.mass);
      expect(shifted.momentOfInertia).toBeCloseTo(authored.momentOfInertia);
    });

    it('should not keep references to the vertices it was given', () => {
      const vertices = [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 4 },
      ];
      const triangle = new PolygonCollider(vertices);

      vertices[1].x = 100;

      expect(triangle.vertices[1]).toEqual({ x: 4, y: 0 });
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

    it.each([0, Math.PI / 3, Math.PI, -2])(
      'should place an asymmetric shape at its authored vertices transformed by the entity (rotation %f)',
      (rotation) => {
        const authored = [
          { x: 1, y: 0 },
          { x: 5, y: 0 },
          { x: 1, y: 2 },
        ];
        const polygon = new PolygonCollider(authored);
        const position = { x: -3, y: 7 };
        const worldVertices = polygon.getWorldVertices(position, rotation);

        authored.forEach((vertex, i) => {
          expect(worldVertices[i].x).toBeCloseTo(
            position.x +
              vertex.x * Math.cos(rotation) -
              vertex.y * Math.sin(rotation),
          );
          expect(worldVertices[i].y).toBeCloseTo(
            position.y +
              vertex.x * Math.sin(rotation) +
              vertex.y * Math.cos(rotation),
          );
        });
      },
    );

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
