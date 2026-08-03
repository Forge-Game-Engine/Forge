import { describe, expect, it } from 'vitest';
import { CircleCollider } from './circle-collider.js';
import { createVector2 } from '../../math/index.js';

describe('CircleCollider', () => {
  it('should have type "circle"', () => {
    const collider = new CircleCollider(1);

    expect(collider.type).toBe('circle');
  });

  it('should compute mass and moment of inertia from radius and density', () => {
    const collider = new CircleCollider(2, 3);

    expect(collider.mass).toBeCloseTo(3 * Math.PI * 2 * 2);
    expect(collider.momentOfInertia).toBeCloseTo((collider.mass * 2 * 2) / 2);
  });

  it('should compute an AABB centered on position, ignoring rotation', () => {
    const collider = new CircleCollider(1);
    const aabb = collider.computeAabb(createVector2(2, 3));

    expect(aabb.min.x).toBeCloseTo(1);
    expect(aabb.min.y).toBeCloseTo(2);
    expect(aabb.max.x).toBeCloseTo(3);
    expect(aabb.max.y).toBeCloseTo(4);
  });
});
