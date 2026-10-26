import { describe, expect, it } from 'vitest';
import { raycastConvexPolygon } from './raycast-convex-polygon.js';

function square(): {
  vertices: { x: number; y: number }[];
  normals: { x: number; y: number }[];
} {
  return {
    vertices: [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
    ],
    normals: [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ],
  };
}

describe('raycastConvexPolygon', () => {
  it('should return null when the ray misses the polygon entirely', () => {
    const { vertices, normals } = square();

    const hit = raycastConvexPolygon(
      vertices,
      normals,
      { x: -5, y: 5 },
      { x: 5, y: 5 },
    );

    expect(hit).toBeNull();
  });

  it('should hit the nearest face when the ray crosses the polygon', () => {
    const { vertices, normals } = square();

    const hit = raycastConvexPolygon(
      vertices,
      normals,
      { x: -5, y: 0 },
      { x: 5, y: 0 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(-1);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.x).toBeCloseTo(-1);
    expect(hit?.normal.y).toBeCloseTo(0);
    expect(hit?.distance).toBeCloseTo(4);
  });

  it('should hit the exit face when the ray starts inside the polygon', () => {
    const { vertices, normals } = square();

    const hit = raycastConvexPolygon(
      vertices,
      normals,
      { x: 0, y: 0 },
      { x: 5, y: 0 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(1);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.x).toBeCloseTo(1);
    expect(hit?.normal.y).toBeCloseTo(0);
  });

  it('should return null when the segment stops short of the polygon', () => {
    const { vertices, normals } = square();

    const hit = raycastConvexPolygon(
      vertices,
      normals,
      { x: -5, y: 0 },
      { x: -2, y: 0 },
    );

    expect(hit).toBeNull();
  });
});
