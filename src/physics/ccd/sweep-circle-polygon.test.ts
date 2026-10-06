import { describe, expect, it } from 'vitest';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { sweepCirclePolygon } from './sweep-circle-polygon.js';

/**
 * A static 100x100 box centered on the origin.
 */
function boxBody(rotation: number = 0): CollisionBody {
  return {
    position: { x: 0, y: 0 },
    rotation,
    collider: new PolygonCollider([
      { x: -50, y: -50 },
      { x: 50, y: -50 },
      { x: 50, y: 50 },
      { x: -50, y: 50 },
    ]),
  };
}

describe('sweepCirclePolygon', () => {
  const circle = new CircleCollider(10);

  it('should find where a circle first touches the face it moves into', () => {
    const hit = sweepCirclePolygon(
      circle,
      boxBody(),
      { x: -100, y: 0 },
      { x: 0, y: 0 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.t).toBeCloseTo(0.4);
    expect(hit?.normal.x).toBeCloseTo(-1);
    expect(hit?.normal.y).toBeCloseTo(0);
    expect(hit?.point.x).toBeCloseTo(-50);
    expect(hit?.point.y).toBeCloseTo(0);
  });

  it('should find the near face of a box the circle would pass straight through', () => {
    const hit = sweepCirclePolygon(
      circle,
      boxBody(),
      { x: -100, y: 0 },
      { x: 100, y: 0 },
    );

    expect(hit?.t).toBeCloseTo(0.2);
    expect(hit?.normal.x).toBeCloseTo(-1);
  });

  it('should return null for a sweep that misses the polygon', () => {
    expect(
      sweepCirclePolygon(
        circle,
        boxBody(),
        { x: -100, y: 100 },
        { x: 100, y: 100 },
      ),
    ).toBeNull();
  });

  it('should return null for a sweep that starts already overlapping the polygon', () => {
    expect(
      sweepCirclePolygon(circle, boxBody(), { x: -55, y: 0 }, { x: 0, y: 0 }),
    ).toBeNull();
  });

  it('should hit at the very end of a sweep that exactly reaches the surface', () => {
    const hit = sweepCirclePolygon(
      circle,
      boxBody(),
      { x: -100, y: 0 },
      { x: -60, y: 0 },
    );

    expect(hit?.t).toBeCloseTo(1);
  });

  it('should return null for a sweep that stops just short of the surface', () => {
    expect(
      sweepCirclePolygon(
        circle,
        boxBody(),
        { x: -100, y: 0 },
        { x: -61, y: 0 },
      ),
    ).toBeNull();
  });

  it('should return null for a circle moving away from the polygon', () => {
    expect(
      sweepCirclePolygon(
        circle,
        boxBody(),
        { x: -60.5, y: 0 },
        { x: -200, y: 0 },
      ),
    ).toBeNull();
  });

  it('should hit a corner with a normal pointing from the corner to the circle', () => {
    // Moving along y = 55, the circle clips the box's (-50, 50) corner
    // rather than either face meeting there.
    const hit = sweepCirclePolygon(
      circle,
      boxBody(),
      { x: -100, y: 55 },
      { x: 0, y: 55 },
    );

    const touchX = -50 - Math.sqrt(75);

    expect(hit?.t).toBeCloseTo((touchX + 100) / 100);
    expect(hit?.point.x).toBeCloseTo(-50);
    expect(hit?.point.y).toBeCloseTo(50);
    expect(hit?.normal.x).toBeCloseTo((touchX + 50) / 10);
    expect(hit?.normal.y).toBeCloseTo(0.5);
  });

  it("should sweep against the polygon's rotated world pose", () => {
    // Rotated 45 degrees, the box's corner points straight at the circle.
    const cornerX = -50 * Math.SQRT2;
    const hit = sweepCirclePolygon(
      circle,
      boxBody(Math.PI / 4),
      { x: -200, y: 0 },
      { x: 0, y: 0 },
    );

    expect(hit?.t).toBeCloseTo((cornerX - 10 + 200) / 200);
    expect(hit?.point.x).toBeCloseTo(cornerX);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.x).toBeCloseTo(-1);
  });

  it("should sweep the circle's center, including its offset", () => {
    const offsetCircle = new CircleCollider(10);

    offsetCircle.offset = { x: 0, y: 5 };

    const hit = sweepCirclePolygon(
      offsetCircle,
      boxBody(),
      { x: -100, y: -5 },
      { x: 0, y: -5 },
    );

    expect(hit?.t).toBeCloseTo(0.4);
    expect(hit?.point.y).toBeCloseTo(0);
  });
});
