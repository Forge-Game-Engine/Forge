import { describe, expect, it } from 'vitest';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { containsPointPolygon } from './contains-point-polygon.js';

const box = new PolygonCollider([
  { x: -2, y: -1 },
  { x: 2, y: -1 },
  { x: 2, y: 1 },
  { x: -2, y: 1 },
]);

describe('containsPointPolygon', () => {
  const body = { position: { x: 10, y: 20 }, rotation: 0, collider: box };

  it('contains a point inside the polygon', () => {
    expect(containsPointPolygon(body, { x: 11, y: 20.5 })).toBe(true);
  });

  it('contains a point on an edge', () => {
    expect(containsPointPolygon(body, { x: 12, y: 20 })).toBe(true);
  });

  it('contains a vertex', () => {
    expect(containsPointPolygon(body, { x: 8, y: 19 })).toBe(true);
  });

  it('does not contain a point outside the polygon', () => {
    expect(containsPointPolygon(body, { x: 10, y: 21.5 })).toBe(false);
    expect(containsPointPolygon(body, { x: 12.5, y: 20 })).toBe(false);
  });

  it('turns the polygon with the entity', () => {
    const turned = { ...body, rotation: Math.PI / 2 };

    // The box's long side now runs along Y.
    expect(containsPointPolygon(turned, { x: 10, y: 21.5 })).toBe(true);
    expect(containsPointPolygon(turned, { x: 11.5, y: 20 })).toBe(false);
  });

  it('contains points of a triangle authored away from the origin', () => {
    const triangle = {
      position: { x: 0, y: 0 },
      rotation: 0,
      collider: new PolygonCollider([
        { x: 10, y: 10 },
        { x: 14, y: 10 },
        { x: 10, y: 14 },
      ]),
    };

    expect(containsPointPolygon(triangle, { x: 11, y: 11 })).toBe(true);
    expect(containsPointPolygon(triangle, { x: 11.9, y: 11.9 })).toBe(true);
    expect(containsPointPolygon(triangle, { x: 12.1, y: 12.1 })).toBe(false);
    expect(containsPointPolygon(triangle, { x: 0, y: 0 })).toBe(false);
  });
});
