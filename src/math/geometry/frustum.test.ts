import { describe, expect, it } from 'vitest';
import { DepthRange, Mat4, Matrix4 } from '../matrices/matrix4';
import {
  expectVec3Close,
  forEachSeededCase,
  randomBox,
  randomVec3,
} from '../test-helpers';
import { Vec3, Vector3 } from '../vector3';
import { BoundingBoxes } from './bounding-box';
import { Frustums } from './frustum';

const depthRanges: DepthRange[] = ['negativeOneToOne', 'zeroToOne'];

const createViewProjection = (depthRange: DepthRange): Matrix4 => {
  const projection = Mat4.perspective(
    Mat4.create(),
    1.2,
    1.5,
    0.5,
    30,
    depthRange,
  );
  const view = Mat4.lookAt(
    Mat4.create(),
    { x: 3, y: 2, z: 10 },
    { x: 0, y: 0, z: 0 },
    Vec3.up,
  );

  return Mat4.multiply(projection, view);
};

/** Whether a point's clip-space coordinates are inside the clip volume. */
const isInsideClipVolume = (
  matrix: Matrix4,
  point: Vector3,
  depthRange: DepthRange,
): boolean => {
  const { x, y, z } = point;
  const clipX = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
  const clipY = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
  const clipZ = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
  const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  const minZ = depthRange === 'zeroToOne' ? 0 : -w;

  return (
    Math.abs(clipX) <= w && Math.abs(clipY) <= w && clipZ >= minZ && clipZ <= w
  );
};

const createCorners = (): Vector3[] =>
  Array.from({ length: 8 }, () => Vec3.zero);

describe('Frustums', () => {
  it.each(depthRanges)(
    'should extract the planes of a 90° perspective (%s)',
    (depthRange) => {
      const frustum = Frustums.fromViewProjection(
        Frustums.create(),
        Mat4.perspective(Mat4.create(), Math.PI / 2, 1, 1, 10, depthRange),
        depthRange,
      );
      const diagonal = Math.SQRT1_2;
      const [left, right, bottom, top, near, far] = frustum.planes;

      expectVec3Close(left.normal, { x: diagonal, y: 0, z: -diagonal });
      expectVec3Close(right.normal, { x: -diagonal, y: 0, z: -diagonal });
      expectVec3Close(bottom.normal, { x: 0, y: diagonal, z: -diagonal });
      expectVec3Close(top.normal, { x: 0, y: -diagonal, z: -diagonal });
      expectVec3Close(near.normal, Vec3.forward);
      expect(near.constant).toBeCloseTo(-1, 12);
      expectVec3Close(far.normal, Vec3.backward);
      expect(far.constant).toBeCloseTo(10, 12);

      for (const plane of [left, right, bottom, top]) {
        expect(plane.constant).toBeCloseTo(0, 12);
      }
    },
  );

  it.each(depthRanges)(
    'should contain the same points as the clip volume (%s)',
    (depthRange) => {
      const matrix = createViewProjection(depthRange);
      const frustum = Frustums.fromViewProjection(
        Frustums.create(),
        matrix,
        depthRange,
      );
      let inside = 0;

      forEachSeededCase(
        `containsPoint matches clip (${depthRange})`,
        (random) => {
          const point = randomVec3(random, -15, 15);
          const expected = isInsideClipVolume(matrix, point, depthRange);

          inside += expected ? 1 : 0;
          expect(Frustums.containsPoint(frustum, point)).toBe(expected);
        },
      );

      expect(inside).toBeGreaterThan(20);
    },
  );

  it('should store a far plane at infinity as one every point passes', () => {
    const frustum = Frustums.fromViewProjection(
      Frustums.create(),
      Mat4.perspectiveInfinite(Mat4.create(), 1, 1, 0.1, 'negativeOneToOne'),
      'negativeOneToOne',
    );
    const far = frustum.planes[5];

    expect(far.normal).toEqual(Vec3.zero);
    expect(far.constant).toBe(Infinity);
    expect(Frustums.containsPoint(frustum, { x: 0, y: 0, z: -1e12 })).toBe(
      true,
    );
  });

  it('should cull spheres entirely behind a plane', () => {
    const frustum = Frustums.fromViewProjection(
      Frustums.create(),
      Mat4.perspective(Mat4.create(), Math.PI / 2, 1, 1, 10, 'zeroToOne'),
      'zeroToOne',
    );

    expect(
      Frustums.intersectsSphere(frustum, {
        center: { x: 0, y: 0, z: -5 },
        radius: 1,
      }),
    ).toBe(true);
    expect(
      Frustums.intersectsSphere(frustum, {
        center: { x: 0, y: 0, z: 2 },
        radius: 3.5,
      }),
    ).toBe(true);
    expect(
      Frustums.intersectsSphere(frustum, {
        center: { x: 0, y: 0, z: 2 },
        radius: 0.5,
      }),
    ).toBe(false);
    expect(
      Frustums.intersectsSphere(frustum, {
        center: { x: 20, y: 0, z: -5 },
        radius: 1,
      }),
    ).toBe(false);
  });

  it('should never cull a box with a corner inside the frustum', () => {
    const depthRange = 'negativeOneToOne';
    const matrix = createViewProjection(depthRange);
    const frustum = Frustums.fromViewProjection(
      Frustums.create(),
      matrix,
      depthRange,
    );

    forEachSeededCase('intersectsBox is conservative', (random) => {
      const box = randomBox(random, 15);
      const center = BoundingBoxes.center(Vec3.zero, box);
      const corners = [box.min, box.max, center];
      const isAnyInside = corners.some((point) =>
        Frustums.containsPoint(frustum, point),
      );
      const isBehindOnePlane = frustum.planes.some((plane) =>
        [0, 1, 2, 3, 4, 5, 6, 7].every((index) => {
          const corner = {
            x: index & 1 ? box.max.x : box.min.x,
            y: index & 2 ? box.max.y : box.min.y,
            z: index & 4 ? box.max.z : box.min.z,
          };

          return Vec3.dot(plane.normal, corner) + plane.constant < 0;
        }),
      );
      const result = Frustums.intersectsBox(frustum, box);

      if (isAnyInside) {
        expect(result).toBe(true);
      }

      expect(result).toBe(!isBehindOnePlane);
    });
  });

  it.each(depthRanges)(
    'should unproject the eight corners (%s)',
    (depthRange) => {
      const fovY = Math.PI / 2;
      const projection = Mat4.perspective(
        Mat4.create(),
        fovY,
        2,
        1,
        10,
        depthRange,
      );
      const inverse = Mat4.invert(Mat4.create(), projection) ?? Mat4.create();
      const corners = Frustums.corners(createCorners(), inverse, depthRange);

      expectVec3Close(corners[0], { x: -2, y: -1, z: -1 });
      expectVec3Close(corners[3], { x: 2, y: 1, z: -1 });
      expectVec3Close(corners[4], { x: -20, y: -10, z: -10 }, 1e-8);
      expectVec3Close(corners[7], { x: 20, y: 10, z: -10 }, 1e-8);
    },
  );

  it('should throw unless given eight points for the corners', () => {
    expect(() =>
      Frustums.corners([Vec3.zero], Mat4.create(), 'zeroToOne'),
    ).toThrow('Frustums.corners writes 8 points, but was given 1.');
  });
});
