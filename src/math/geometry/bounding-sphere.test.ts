import { describe, expect, it } from 'vitest';
import {
  expectVec3Close,
  forEachSeededCase,
  randomTransform,
  randomUnitVec3,
  randomVec3,
} from '../test-helpers';
import { Vec3 } from '../vector3';
import { BoundingSphere, BoundingSpheres } from './bounding-sphere';

const createSphere = (): BoundingSphere => ({ center: Vec3.zero, radius: 0 });

describe('BoundingSpheres', () => {
  it('should build the sphere around a box', () => {
    const sphere = BoundingSpheres.fromBox(createSphere(), {
      min: { x: -1, y: 0, z: 2 },
      max: { x: 1, y: 2, z: 4 },
    });

    expect(sphere.center).toEqual({ x: 0, y: 1, z: 3 });
    expect(sphere.radius).toBeCloseTo(Math.sqrt(3), 12);
  });

  it('should contain the transformed sphere', () => {
    forEachSeededCase(
      'BoundingSpheres.transform contains the sphere',
      (random) => {
        const sphere = {
          center: randomVec3(random, -5, 5),
          radius: random.randomFloat(0.1, 3),
        };
        const { matrix } = randomTransform(random, true);
        const surfacePoint = Vec3.scaleAndAdd(
          Vec3.clone(sphere.center),
          randomUnitVec3(random),
          sphere.radius,
        );
        const transformed = BoundingSpheres.transform(
          createSphere(),
          sphere,
          matrix,
        );

        Vec3.transformPoint(surfacePoint, matrix);

        expect(
          Vec3.distance(surfacePoint, transformed.center),
        ).toBeLessThanOrEqual(transformed.radius + 1e-9);
      },
    );
  });

  it('should test overlap including touching', () => {
    const a = { center: Vec3.zero, radius: 1 };

    expect(
      BoundingSpheres.intersects(a, {
        center: { x: 3, y: 0, z: 0 },
        radius: 2,
      }),
    ).toBe(true);
    expect(
      BoundingSpheres.intersects(a, {
        center: { x: 3.1, y: 0, z: 0 },
        radius: 2,
      }),
    ).toBe(false);
  });

  it('should merge into the smallest sphere containing both', () => {
    forEachSeededCase('BoundingSpheres.merge contains both', (random) => {
      const a = {
        center: randomVec3(random, -5, 5),
        radius: random.randomFloat(0, 4),
      };
      const b = {
        center: randomVec3(random, -5, 5),
        radius: random.randomFloat(0, 4),
      };
      const merged = BoundingSpheres.merge(
        { center: Vec3.clone(a.center), radius: a.radius },
        b,
      );
      const distance = Vec3.distance(a.center, b.center);

      for (const sphere of [a, b]) {
        expect(
          Vec3.distance(merged.center, sphere.center) + sphere.radius,
        ).toBeLessThanOrEqual(merged.radius + 1e-9);
      }

      expect(merged.radius).toBeCloseTo(
        Math.max(a.radius, b.radius, (distance + a.radius + b.radius) / 2),
        9,
      );
    });
  });

  it('should keep a sphere that already contains the other', () => {
    const outer = { center: Vec3.zero, radius: 5 };

    BoundingSpheres.merge(outer, { center: Vec3.one, radius: 1 });

    expect(outer).toEqual({ center: Vec3.zero, radius: 5 });

    const inner = { center: Vec3.one, radius: 1 };

    BoundingSpheres.merge(inner, { center: Vec3.zero, radius: 5 });

    expectVec3Close(inner.center, Vec3.zero);
    expect(inner.radius).toBe(5);
  });
});
