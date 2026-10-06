import { describe, expect, it } from 'vitest';
import { CircleCollider } from './circle-collider.js';

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

  it('should compute an AABB centered on position for a centered circle', () => {
    const collider = new CircleCollider(1);
    const aabb = collider.computeAabb({ x: 2, y: 3 }, 1);

    expect(aabb.min.x).toBeCloseTo(1);
    expect(aabb.min.y).toBeCloseTo(2);
    expect(aabb.max.x).toBeCloseTo(3);
    expect(aabb.max.y).toBeCloseTo(4);
  });

  it('should default its center, and center of mass, to the origin', () => {
    const collider = new CircleCollider(1);

    expect(collider.center).toEqual({ x: 0, y: 0 });
    expect(collider.localCenterOfMass).toEqual({ x: 0, y: 0 });
  });

  it('should use its center as its local center of mass', () => {
    const collider = new CircleCollider(1, 1, { x: 2, y: -1 });

    expect(collider.localCenterOfMass).toEqual({ x: 2, y: -1 });
  });

  it('should not keep a reference to the center it was given', () => {
    const center = { x: 2, y: 0 };
    const collider = new CircleCollider(1, 1, center);

    center.x = 5;

    expect(collider.center).toEqual({ x: 2, y: 0 });
  });

  it.each([0, Math.PI / 2, Math.PI, -Math.PI / 4])(
    'should rotate its center with the entity (rotation %f)',
    (rotation) => {
      const collider = new CircleCollider(1, 1, { x: 2, y: 0 });
      const center = collider.getWorldCenter({ x: 10, y: 5 }, rotation);

      expect(center.x).toBeCloseTo(10 + 2 * Math.cos(rotation));
      expect(center.y).toBeCloseTo(5 + 2 * Math.sin(rotation));

      const aabb = collider.computeAabb({ x: 10, y: 5 }, rotation);

      expect(aabb.min.x).toBeCloseTo(center.x - 1);
      expect(aabb.max.y).toBeCloseTo(center.y + 1);
    },
  );
});
