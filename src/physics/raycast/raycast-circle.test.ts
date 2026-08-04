import { describe, expect, it } from 'vitest';
import { raycastCircle } from './raycast-circle.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { Vector2 } from '../../math/index.js';

function body(position: Vector2, collider: CircleCollider): CollisionBody {
  return { position, rotation: 0, collider };
}

describe('raycastCircle', () => {
  it('should return null when the ray misses the circle', () => {
    const circleBody = body({ x: 0, y: 5 }, new CircleCollider(1));

    const hit = raycastCircle(circleBody, { x: -5, y: 0 }, { x: 5, y: 0 });

    expect(hit).toBeNull();
  });

  it('should return null when the circle is beyond the segment', () => {
    const circleBody = body({ x: 10, y: 0 }, new CircleCollider(1));

    const hit = raycastCircle(circleBody, { x: -5, y: 0 }, { x: 5, y: 0 });

    expect(hit).toBeNull();
  });

  it('should hit the near edge of the circle', () => {
    const circleBody = body({ x: 0, y: 0 }, new CircleCollider(1));

    const hit = raycastCircle(circleBody, { x: -5, y: 0 }, { x: 5, y: 0 });

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(-1);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.x).toBeCloseTo(-1);
    expect(hit?.normal.y).toBeCloseTo(0);
    expect(hit?.distance).toBeCloseTo(4);
  });

  it('should account for the circle collider offset', () => {
    const collider = new CircleCollider(1);
    collider.offset = { x: 0, y: 3 };
    const circleBody = body({ x: 0, y: 0 }, collider);

    const hit = raycastCircle(circleBody, { x: -5, y: 3 }, { x: 5, y: 3 });

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(-1);
    expect(hit?.point.y).toBeCloseTo(3);
  });

  it('should hit the exit point when the ray starts inside the circle', () => {
    const circleBody = body({ x: 0, y: 0 }, new CircleCollider(1));

    const hit = raycastCircle(circleBody, { x: 0, y: 0 }, { x: 5, y: 0 });

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(1);
    expect(hit?.point.y).toBeCloseTo(0);
  });
});
