import { describe, expect, it } from 'vitest';
import Matter from 'matter-js';
import { Ray, raycast } from './raycast';
import { Vector2 } from '../math';

// Helper: create a rectangle Matter.Body at (x, y) with width and height
function createRect(x: number, y: number, w: number, h: number) {
  return Matter.Bodies.rectangle(x, y, w, h);
}

describe('Ray', () => {
  it('calculates difference, slope, and offsetY', () => {
    const a = new Vector2(0, 0);
    const b = new Vector2(2, 2);
    const ray = new Ray(a, b);

    expect(ray.difference.x).toBeCloseTo(2);
    expect(ray.difference.y).toBeCloseTo(2);
    expect(ray.slope).toBeCloseTo(1);
    expect(ray.offsetY).toBeCloseTo(0);
  });

  it('detects horizontal and vertical rays', () => {
    const h = new Ray(new Vector2(0, 1), new Vector2(2, 1));
    const v = new Ray(new Vector2(1, 0), new Vector2(1, 2));
    expect(h.isHorizontal).toBe(true);
    expect(h.isVertical).toBe(false);
    expect(v.isVertical).toBe(true);
    expect(v.isHorizontal).toBe(false);
  });

  it('pointInBounds works for points inside and outside', () => {
    const ray = new Ray(new Vector2(0, 0), new Vector2(2, 2));
    expect(ray.pointInBounds(new Vector2(1, 1))).toBe(true);
    expect(ray.pointInBounds(new Vector2(3, 3))).toBe(false);
  });

  it('intersect finds intersection of two rays', () => {
    const r1 = new Ray(new Vector2(0, 0), new Vector2(2, 2));
    const r2 = new Ray(new Vector2(0, 2), new Vector2(2, 0));
    const intersection = Ray.intersect(r1, r2);
    expect(intersection).toBeTruthy();
    expect(intersection?.x).toBeCloseTo(1);
    expect(intersection?.y).toBeCloseTo(1);
  });

  it('collisionPoint returns null if not in bounds', () => {
    const r1 = new Ray(new Vector2(0, 0), new Vector2(1, 0));
    const r2 = new Ray(new Vector2(2, 0), new Vector2(2, 1));
    expect(Ray.collisionPoint(r1, r2)).toBeNull();
  });

  it('calculateNormal returns a perpendicular vector', () => {
    const ray = new Ray(new Vector2(0, 0), new Vector2(1, 0));
    const normal = ray.calculateNormal(new Vector2(0, 1));
    expect(Math.abs(normal.x)).toBeLessThan(1e-6);
    expect(Math.abs(normal.y - 1)).toBeLessThan(1e-6);
  });
});

describe('Ray.bodyEdges and bodyCollisions', () => {
  it('returns correct number of edges for a rectangle', () => {
    const body = createRect(0, 0, 2, 2);
    const edges = Ray.bodyEdges(body);
    // Rectangle has 4 edges
    expect(edges.length).toBe(4);
  });

  it('detects collisions with a ray crossing a rectangle', () => {
    const body = createRect(0, 0, 2, 2);
    // Ray from left to right through center
    const ray = new Ray(new Vector2(-2, 0), new Vector2(2, 0));
    const collisions = Ray.bodyCollisions(ray, body);
    // Should hit two edges (left and right)
    expect(collisions.length).toBe(2);
    for (const c of collisions) {
      expect(c.point.y).toBeCloseTo(0);
      expect(Math.abs(c.point.x)).toBeCloseTo(1);
    }
  });
});

describe('raycast', () => {
  it('returns collisions sorted by distance', () => {
    const body = createRect(0, 0, 2, 2);
    const start = new Vector2(-3, 0);
    const end = new Vector2(3, 0);
    const collisions = raycast([body], start, end, true);
    expect(collisions.length).toBe(2);
    expect(collisions[0].point.x).toBeLessThan(collisions[1].point.x);
  });

  it('returns empty array if no intersection', () => {
    const body = createRect(0, 0, 2, 2);
    const start = new Vector2(0, 3);
    const end = new Vector2(2, 3);
    const collisions = raycast([body], start, end);
    expect(collisions.length).toBe(0);
  });

  it('returns correct collision data', () => {
    const body = createRect(0, 0, 2, 2);
    const start = new Vector2(-2, 0);
    const end = new Vector2(2, 0);
    const collisions = raycast([body], start, end);
    expect(collisions.length).toBe(2);
    for (const c of collisions) {
      expect(c.body).toBe(body);
      expect(Array.isArray(c.vertices)).toBe(true);
      expect(c.normal).toBeInstanceOf(Vector2);
    }
  });
});
