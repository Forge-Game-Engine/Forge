import { describe, expect, it } from 'vitest';
import { Mat4 } from '../matrices/matrix4';
import { Quat } from '../quaternion';
import { Random } from '../random';
import {
  expectVec3Close,
  forEachSeededCase,
  randomBox,
  randomRay,
  randomVec3,
} from '../test-helpers';
import { Vec3, Vector3 } from '../vector3';
import { BoundingBox, BoundingBoxes } from './bounding-box';
import { BoundingSphere } from './bounding-sphere';
import { Plane, Planes } from './plane';
import { Ray, Rays } from './ray';

const sampleStep = 0.01;
const sampleLength = 40;

/**
 * The distance of the first point along the ray, sampled every
 * `sampleStep`, for which `isInside` holds, or `null` if there's none.
 */
const firstSampleInside = (
  ray: Ray,
  isInside: (point: Vector3) => boolean,
): number | null => {
  const point = Vec3.zero;

  for (let distance = 0; distance <= sampleLength; distance += sampleStep) {
    if (isInside(Rays.at(point, ray, distance))) {
      return distance;
    }
  }

  return null;
};

/**
 * Checks an intersection test against sampling points along the ray, for a
 * ray that starts outside the shape: a sampled point inside the shape means
 * there's a hit no further than it, and a hit is on the shape's surface
 * with no sampled point inside before it.
 */
const expectAgreesWithSampling = (
  ray: Ray,
  hit: number | null,
  isInside: (point: Vector3) => boolean,
  distanceToSurface: (point: Vector3) => number,
): void => {
  const firstInside = firstSampleInside(ray, isInside);

  if (firstInside !== null) {
    expect(hit).not.toBeNull();
    expect(hit ?? Infinity).toBeLessThanOrEqual(firstInside + 1e-9);
  }

  if (hit !== null) {
    expect(distanceToSurface(Rays.at(Vec3.zero, ray, hit))).toBeLessThan(1e-6);
    expect(firstInside ?? Infinity).toBeGreaterThanOrEqual(
      hit - sampleStep - 1e-9,
    );
  }
};

/** Points a ray at a random point near `target`, so about half the rays hit. */
const aimNear = (random: Random, ray: Ray, target: Vector3): Ray => {
  const aim = Vec3.add(Vec3.clone(target), randomVec3(random, -5, 5));

  Vec3.normalize(Vec3.subtract(Vec3.set(ray.direction, aim), ray.origin));

  return ray;
};

const randomSphere = (random: Random): BoundingSphere => ({
  center: randomVec3(random, -5, 5),
  radius: random.randomFloat(0.5, 5),
});

const isInsideSphere =
  (sphere: BoundingSphere) =>
  (point: Vector3): boolean =>
    Vec3.distance(point, sphere.center) <= sphere.radius;

const distanceToBoxSurface =
  (box: BoundingBox) =>
  (point: Vector3): number =>
    Math.min(
      ...(['x', 'y', 'z'] as const).flatMap((axis) => [
        Math.abs(point[axis] - box.min[axis]),
        Math.abs(point[axis] - box.max[axis]),
      ]),
    );

/** A reference triangle test: the plane hit, then same-side tests. */
const referenceTriangleHit = (
  ray: Ray,
  a: Vector3,
  b: Vector3,
  c: Vector3,
): number | null => {
  const plane: Plane = { normal: Vec3.zero, constant: 0 };

  Planes.fromPoints(plane, a, b, c);

  const distance = Rays.intersectPlane(ray, plane);

  if (distance === null) {
    return null;
  }

  const point = Rays.at(Vec3.zero, ray, distance);
  const corners = [a, b, c];
  const isInside = corners.every((corner, index) => {
    const next = corners[(index + 1) % 3];
    const edge = Vec3.subtract(Vec3.clone(next), corner);
    const toPoint = Vec3.subtract(Vec3.clone(point), corner);

    return Vec3.dot(Vec3.cross(edge, toPoint), plane.normal) >= 0;
  });

  return isInside ? distance : null;
};

describe('Rays', () => {
  it('should return the point at a distance along the ray', () => {
    const ray = { origin: { x: 1, y: 2, z: 3 }, direction: Vec3.forward };

    expect(Rays.at(Vec3.zero, ray, 4)).toEqual({ x: 1, y: 2, z: -1 });
  });

  it('should transform a ray and keep its direction unit length', () => {
    const matrix = Mat4.fromTransform(
      Mat4.create(),
      { x: 10, y: 0, z: 0 },
      Quat.fromAngleZ(Quat.identity, Math.PI / 2),
      { x: 3, y: 3, z: 3 },
    );
    const ray = { origin: { x: 1, y: 0, z: 0 }, direction: Vec3.right };

    Rays.transform(ray, ray, matrix);

    expectVec3Close(ray.origin, { x: 10, y: 3, z: 0 });
    expectVec3Close(ray.direction, Vec3.up);
  });

  describe('intersectPlane', () => {
    const ground: Plane = { normal: Vec3.up, constant: 0 };

    it('should return the distance to the plane from either side', () => {
      expect(
        Rays.intersectPlane(
          { origin: { x: 0, y: 5, z: 0 }, direction: Vec3.down },
          ground,
        ),
      ).toBe(5);
      expect(
        Rays.intersectPlane(
          { origin: { x: 0, y: -2, z: 0 }, direction: Vec3.up },
          ground,
        ),
      ).toBe(2);
    });

    it('should return null for a parallel ray or a plane behind the origin', () => {
      expect(
        Rays.intersectPlane(
          { origin: { x: 0, y: 5, z: 0 }, direction: Vec3.right },
          ground,
        ),
      ).toBeNull();
      expect(
        Rays.intersectPlane(
          { origin: { x: 0, y: 5, z: 0 }, direction: Vec3.up },
          ground,
        ),
      ).toBeNull();
    });
  });

  describe('intersectSphere', () => {
    it('should agree with sampling points along the ray', () => {
      let hits = 0;

      forEachSeededCase('intersectSphere matches sampling', (random) => {
        const sphere = randomSphere(random);
        const ray = aimNear(random, randomRay(random, 12), sphere.center);

        if (isInsideSphere(sphere)(ray.origin)) {
          return;
        }

        const hit = Rays.intersectSphere(ray, sphere);

        hits += hit === null ? 0 : 1;
        expectAgreesWithSampling(ray, hit, isInsideSphere(sphere), (point) =>
          Math.abs(Vec3.distance(point, sphere.center) - sphere.radius),
        );
      });

      expect(hits).toBeGreaterThan(100);
    });

    it('should return where the ray leaves from inside the sphere', () => {
      expect(
        Rays.intersectSphere(
          { origin: Vec3.zero, direction: Vec3.up },
          { center: Vec3.zero, radius: 2 },
        ),
      ).toBe(2);
    });

    it('should return null for a sphere behind the origin', () => {
      expect(
        Rays.intersectSphere(
          { origin: Vec3.zero, direction: Vec3.up },
          { center: { x: 0, y: -5, z: 0 }, radius: 1 },
        ),
      ).toBeNull();
    });
  });

  describe('intersectBox', () => {
    it('should agree with sampling points along the ray', () => {
      let hits = 0;

      forEachSeededCase('intersectBox matches sampling', (random) => {
        const box = randomBox(random, 5);
        const ray = aimNear(
          random,
          randomRay(random, 12),
          BoundingBoxes.center(Vec3.zero, box),
        );

        if (BoundingBoxes.containsPoint(box, ray.origin)) {
          return;
        }

        const hit = Rays.intersectBox(ray, box);

        hits += hit === null ? 0 : 1;
        expectAgreesWithSampling(
          ray,
          hit,
          (point) => BoundingBoxes.containsPoint(box, point),
          distanceToBoxSurface(box),
        );
      });

      expect(hits).toBeGreaterThan(100);
    });

    it('should handle a ray parallel to a pair of faces', () => {
      const box = { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } };

      expect(
        Rays.intersectBox(
          { origin: { x: -5, y: 1, z: 0 }, direction: Vec3.right },
          box,
        ),
      ).toBe(4);
      expect(
        Rays.intersectBox(
          { origin: { x: -5, y: 2, z: 0 }, direction: Vec3.right },
          box,
        ),
      ).toBeNull();
    });

    it('should return where the ray leaves from inside, and null for an empty box', () => {
      const box = { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } };

      expect(
        Rays.intersectBox({ origin: Vec3.zero, direction: Vec3.up }, box),
      ).toBe(1);
      expect(
        Rays.intersectBox(
          { origin: Vec3.zero, direction: Vec3.up },
          BoundingBoxes.empty(),
        ),
      ).toBeNull();
    });

    it('should return null for a box behind the origin', () => {
      expect(
        Rays.intersectBox(
          { origin: { x: 0, y: 5, z: 0 }, direction: Vec3.up },
          { min: Vec3.zero, max: Vec3.one },
        ),
      ).toBeNull();
    });
  });

  describe('intersectTriangle', () => {
    it('should agree with a plane and same-side reference test', () => {
      forEachSeededCase('intersectTriangle matches reference', (random) => {
        const a = randomVec3(random, -5, 5);
        const b = randomVec3(random, -5, 5);
        const c = randomVec3(random, -5, 5);
        const ray = randomRay(random, 8);
        aimNear(
          random,
          ray,
          Vec3.multiply(Vec3.add(Vec3.add(Vec3.clone(a), b), c), 1 / 3),
        );

        const expected = referenceTriangleHit(ray, a, b, c);
        const actual = Rays.intersectTriangle(ray, a, b, c, false);

        if (expected === null) {
          expect(actual).toBeNull();

          return;
        }

        expect(actual ?? NaN).toBeCloseTo(expected, 6);
      });
    });

    it('should cull a back face only when asked', () => {
      const a = { x: -1, y: -1, z: 0 };
      const b = { x: 1, y: -1, z: 0 };
      const c = { x: 0, y: 1, z: 0 };
      // The triangle is counter-clockwise seen from +Z, so its front faces +Z.
      const fromFront = {
        origin: { x: 0, y: 0, z: 5 },
        direction: Vec3.forward,
      };
      const fromBack = {
        origin: { x: 0, y: 0, z: -5 },
        direction: Vec3.backward,
      };

      expect(Rays.intersectTriangle(fromFront, a, b, c, true)).toBe(5);
      expect(Rays.intersectTriangle(fromBack, a, b, c, true)).toBeNull();
      expect(Rays.intersectTriangle(fromBack, a, b, c, false)).toBe(5);
    });

    it('should return null for a parallel ray or a triangle behind the origin', () => {
      const a = { x: -1, y: -1, z: 0 };
      const b = { x: 1, y: -1, z: 0 };
      const c = { x: 0, y: 1, z: 0 };

      expect(
        Rays.intersectTriangle(
          { origin: { x: -5, y: 0, z: 0 }, direction: Vec3.right },
          a,
          b,
          c,
          false,
        ),
      ).toBeNull();
      expect(
        Rays.intersectTriangle(
          { origin: { x: 0, y: 0, z: 5 }, direction: Vec3.backward },
          a,
          b,
          c,
          false,
        ),
      ).toBeNull();
    });
  });
});
