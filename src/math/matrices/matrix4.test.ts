import { describe, expect, expectTypeOf, it } from 'vitest';
import { Quat } from '../quaternion';
import {
  expectMat4Close,
  expectQuatClose,
  expectVec3Close,
  forEachSeededCase,
  randomTransform,
  randomVec3,
} from '../test-helpers';
import { Vec3, Vector3 } from '../vector3';
import { Mat3, Matrix3 } from './matrix3';
import { DepthRange, Mat4, Matrix4 } from './matrix4';

const identity: Matrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

const clipDepthAtNear: Record<DepthRange, number> = {
  negativeOneToOne: -1,
  zeroToOne: 0,
};

const depthRanges: DepthRange[] = ['negativeOneToOne', 'zeroToOne'];

const project = (matrix: Matrix4, point: Vector3): Vector3 =>
  Vec3.transformPointProjective(Vec3.clone(point), matrix);

describe('Mat4', () => {
  describe('creation', () => {
    it('should create a new identity matrix on every call', () => {
      expect(Mat4.create()).toEqual(identity);
      expect(Mat4.create()).not.toBe(Mat4.create());
    });

    it('should reset a matrix to the identity', () => {
      const matrix = Mat4.fromScale(Mat4.create(), { x: 2, y: 3, z: 4 });

      expect(Mat4.identity(matrix)).toEqual(identity);
    });

    it('should copy and clone without sharing storage', () => {
      const matrix = Mat4.fromTranslation(Mat4.create(), { x: 1, y: 2, z: 3 });
      const copy = Mat4.copy(Mat4.create(), matrix);
      const clone = Mat4.clone(matrix);

      expect(copy).toEqual(matrix);
      expect(clone).toEqual(matrix);
      expect(clone).not.toBe(matrix);
    });

    it('should store translation in elements 12 to 14', () => {
      const matrix = Mat4.fromTranslation(Mat4.create(), { x: 1, y: 2, z: 3 });

      expect(matrix.slice(12)).toEqual([1, 2, 3, 1]);
      expect(Mat4.getTranslation(Vec3.zero, matrix)).toEqual({
        x: 1,
        y: 2,
        z: 3,
      });
    });

    it('should not accept a Matrix3 where a Matrix4 is expected', () => {
      expectTypeOf<Matrix3>().not.toExtend<Matrix4>();
      expectTypeOf<number[]>().toExtend<Matrix4>();
    });
  });

  describe('multiply', () => {
    it('should apply the right operand first', () => {
      const translate = Mat4.fromTranslation(Mat4.create(), {
        x: 10,
        y: 0,
        z: 0,
      });
      const scale = Mat4.fromScale(Mat4.create(), { x: 2, y: 2, z: 2 });
      const combined = Mat4.multiply(Mat4.clone(translate), scale);

      expect(Vec3.transformPoint({ x: 1, y: 1, z: 1 }, combined)).toEqual({
        x: 12,
        y: 2,
        z: 2,
      });
      expect(Mat4.premultiply(Mat4.clone(scale), translate)).toEqual(combined);
    });

    it('should allow the target to be the operand', () => {
      const matrix = Mat4.fromScale(Mat4.create(), { x: 2, y: 3, z: 4 });

      Mat4.multiply(matrix, matrix);

      expect(matrix).toEqual(
        Mat4.fromScale(Mat4.create(), { x: 4, y: 9, z: 16 }),
      );
    });

    it('should give the same result for affine matrices with the affine path', () => {
      forEachSeededCase('multiplyAffine matches multiply', (random) => {
        const a = randomTransform(random, true).matrix;
        const b = randomTransform(random, true).matrix;

        expectMat4Close(
          Mat4.multiplyAffine(Mat4.clone(a), b),
          Mat4.multiply(Mat4.clone(a), b),
        );
        expectMat4Close(
          Mat4.premultiplyAffine(Mat4.clone(a), b),
          Mat4.premultiply(Mat4.clone(a), b),
        );
      });
    });
  });

  describe('builders', () => {
    it('should build translation * rotation * scale', () => {
      forEachSeededCase('fromTransform is T * R * S', (random) => {
        const { position, rotation, scale, matrix } = randomTransform(
          random,
          true,
        );
        const expected = Mat4.fromTranslation(Mat4.create(), position);

        Mat4.multiply(expected, Mat4.fromQuat(Mat4.create(), rotation));
        Mat4.multiply(expected, Mat4.fromScale(Mat4.create(), scale));

        expectMat4Close(matrix, expected);
      });
    });

    it('should embed a 3x3 matrix', () => {
      const matrix3 = Mat3.fromScale(Mat3.create(), { x: 2, y: 3, z: 4 });

      expect(Mat4.fromMatrix3(Mat4.create(), matrix3)).toEqual(
        Mat4.fromScale(Mat4.create(), { x: 2, y: 3, z: 4 }),
      );
    });
  });

  describe('inversion', () => {
    it('should invert a general matrix', () => {
      forEachSeededCase('invert(m) * m is the identity', (random) => {
        const matrix = randomTransform(random, true).matrix;

        // Give it a projective bottom row.
        matrix[3] = random.randomFloat(-1, 1);
        matrix[7] = random.randomFloat(-1, 1);

        const inverse = Mat4.invert(Mat4.create(), matrix);

        expect(inverse).not.toBeNull();
        expectMat4Close(
          Mat4.multiply(inverse ?? Mat4.create(), matrix),
          identity,
          1e-8,
        );
      });
    });

    it('should invert an affine matrix like the general inverse', () => {
      forEachSeededCase('invertAffine matches invert', (random) => {
        const matrix = randomTransform(random, true).matrix;
        const expected = Mat4.invert(Mat4.create(), matrix);

        expect(expected).not.toBeNull();
        expectMat4Close(
          Mat4.invertAffine(Mat4.create(), matrix) ?? Mat4.create(),
          expected ?? Mat4.create(),
        );
      });
    });

    it('should return null and leave out unchanged for a singular matrix', () => {
      const singular = Mat4.fromScale(Mat4.create(), { x: 1, y: 0, z: 1 });
      const out = Mat4.fromTranslation(Mat4.create(), { x: 1, y: 2, z: 3 });
      const before = Mat4.clone(out);

      expect(Mat4.invert(out, singular)).toBeNull();
      expect(Mat4.invertAffine(out, singular)).toBeNull();
      expect(out).toEqual(before);
    });

    it('should allow inverting in place', () => {
      const matrix = Mat4.fromScale(Mat4.create(), { x: 2, y: 4, z: 8 });

      Mat4.invert(matrix, matrix);

      expect(matrix).toEqual(
        Mat4.fromScale(Mat4.create(), { x: 0.5, y: 0.25, z: 0.125 }),
      );
    });
  });

  describe('transpose and determinant', () => {
    it('should swap rows and columns', () => {
      const matrix: Matrix4 = Array.from({ length: 16 }, (_, index) => index);

      expect(Mat4.transpose(matrix)).toEqual([
        0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15,
      ]);
    });

    it('should be the product of the scales, negative when mirroring', () => {
      expect(
        Mat4.determinant(Mat4.fromScale(Mat4.create(), { x: 2, y: 3, z: 4 })),
      ).toBe(24);
      expect(
        Mat4.determinant(Mat4.fromScale(Mat4.create(), { x: -2, y: 3, z: 4 })),
      ).toBe(-24);
    });
  });

  describe('decompose', () => {
    it('should return the parts fromTransform was given', () => {
      forEachSeededCase('decompose inverts fromTransform', (random) => {
        const { position, rotation, scale, matrix } = randomTransform(random);
        const outPosition = Vec3.zero;
        const outRotation = Quat.identity;
        const outScale = Vec3.zero;

        Mat4.decompose(outPosition, outRotation, outScale, matrix);

        expectVec3Close(outPosition, position);
        expectQuatClose(outRotation, rotation);
        expectVec3Close(outScale, scale);
      });
    });

    it('should rebuild the same matrix with negative and non-uniform scale', () => {
      forEachSeededCase('fromTransform(decompose(m)) is m', (random) => {
        const { matrix } = randomTransform(random, true);
        const position = Vec3.zero;
        const rotation = Quat.identity;
        const scale = Vec3.zero;

        Mat4.decompose(position, rotation, scale, matrix);

        expect(Math.sign(scale.x)).toBe(Math.sign(Mat4.determinant(matrix)));
        expectMat4Close(
          Mat4.fromTransform(Mat4.create(), position, rotation, scale),
          matrix,
        );
      });
    });

    it('should return the identity rotation for a zero scale', () => {
      const rotation = { x: 1, y: 0, z: 0, w: 0 };
      const scale = Vec3.zero;

      Mat4.decompose(
        Vec3.zero,
        rotation,
        scale,
        Mat4.fromScale(Mat4.create(), { x: 2, y: 0, z: 1 }),
      );

      expect(rotation).toEqual(Quat.identity);
      expect(scale).toEqual({ x: 2, y: 0, z: 1 });
    });

    it('should return the largest scale', () => {
      const matrix = Mat4.fromTransform(
        Mat4.create(),
        Vec3.zero,
        Quat.fromAxisAngle(Quat.identity, Vec3.up, 1),
        { x: 2, y: -5, z: 3 },
      );

      expect(Mat4.getMaxScale(matrix)).toBeCloseTo(5, 12);
    });
  });

  describe('view matrices', () => {
    it('should move a camera on +Z looking at the origin to the origin', () => {
      const view = Mat4.lookAt(
        Mat4.create(),
        { x: 0, y: 0, z: 5 },
        Vec3.zero,
        Vec3.up,
      );

      expectMat4Close(
        view,
        Mat4.fromTranslation(Mat4.create(), { x: 0, y: 0, z: -5 }),
      );
    });

    it('should put the target on -Z and up on +Y in view space', () => {
      const eye = { x: 5, y: 1, z: 0 };
      const target = { x: 0, y: 1, z: 0 };
      const view = Mat4.lookAt(Mat4.create(), eye, target, Vec3.up);

      expectVec3Close(Vec3.transformPoint(Vec3.clone(target), view), {
        x: 0,
        y: 0,
        z: -5,
      });
      expectVec3Close(Vec3.transformDirection(Vec3.up, view), Vec3.up);
      // Looking along -X, the view's right is the world's -Z.
      expectVec3Close(Vec3.transformDirection(Vec3.forward, view), Vec3.right);
    });

    it('should make targetTo the inverse of lookAt', () => {
      forEachSeededCase('targetTo is the inverse of lookAt', (random) => {
        const eye = randomVec3(random);
        const target = randomVec3(random);
        const up = randomVec3(random, -1, 1);
        const view = Mat4.lookAt(Mat4.create(), eye, target, up);
        const world = Mat4.targetTo(Mat4.create(), eye, target, up);

        expectMat4Close(Mat4.multiply(view, world), identity, 1e-8);
      });
    });

    it('should point the object -Z axis at the target', () => {
      const world = Mat4.targetTo(
        Mat4.create(),
        { x: 1, y: 2, z: 3 },
        { x: 1, y: 2, z: 13 },
        Vec3.up,
      );

      expectVec3Close(
        Vec3.transformDirection(Vec3.forward, world),
        Vec3.backward,
      );
      expectVec3Close(Vec3.transformDirection(Vec3.up, world), Vec3.up);
    });

    it('should fall back to another up when looking along up', () => {
      const view = Mat4.lookAt(
        Mat4.create(),
        { x: 0, y: 10, z: 0 },
        Vec3.zero,
        Vec3.up,
      );

      expectVec3Close(Vec3.transformPoint(Vec3.zero, view), {
        x: 0,
        y: 0,
        z: -10,
      });
      expectVec3Close(Vec3.transformDirection(Vec3.forward, view), Vec3.up);
    });

    it('should throw when the eye is the target', () => {
      expect(() =>
        Mat4.lookAt(Mat4.create(), Vec3.one, Vec3.one, Vec3.up),
      ).toThrow('the eye and target are the same point');
    });
  });

  describe('projections', () => {
    it('should build a perspective projection with known values', () => {
      const fovY = Math.PI / 2;

      expectMat4Close(
        Mat4.perspective(Mat4.create(), fovY, 2, 1, 10, 'negativeOneToOne'),
        [0.5, 0, 0, 0, 0, 1, 0, 0, 0, 0, -11 / 9, -1, 0, 0, -20 / 9, 0],
      );
      expectMat4Close(
        Mat4.perspective(Mat4.create(), fovY, 2, 1, 10, 'zeroToOne'),
        [0.5, 0, 0, 0, 0, 1, 0, 0, 0, 0, -10 / 9, -1, 0, 0, -10 / 9, 0],
      );
    });

    it.each(depthRanges)(
      'should map the perspective frustum corners to the clip-space corners (%s)',
      (depthRange) => {
        const near = 0.5;
        const far = 40;
        const aspect = 16 / 9;
        const fovY = 1.1;
        const matrix = Mat4.perspective(
          Mat4.create(),
          fovY,
          aspect,
          near,
          far,
          depthRange,
        );
        const tangent = Math.tan(fovY / 2);

        for (const [distance, clipZ] of [
          [near, clipDepthAtNear[depthRange]],
          [far, 1],
        ]) {
          for (const sx of [-1, 1]) {
            for (const sy of [-1, 1]) {
              const corner = {
                x: sx * distance * tangent * aspect,
                y: sy * distance * tangent,
                z: -distance,
              };

              expectVec3Close(project(matrix, corner), {
                x: sx,
                y: sy,
                z: clipZ,
              });
            }
          }
        }
      },
    );

    it.each(depthRanges)(
      'should build an infinite perspective as the limit of a far plane (%s)',
      (depthRange) => {
        const infinite = Mat4.perspectiveInfinite(
          Mat4.create(),
          1,
          1.5,
          0.1,
          depthRange,
        );
        const finite = Mat4.perspective(
          Mat4.create(),
          1,
          1.5,
          0.1,
          1e12,
          depthRange,
        );

        expectMat4Close(infinite, finite, 1e-9);
        expect(project(infinite, { x: 0, y: 0, z: -0.1 }).z).toBeCloseTo(
          clipDepthAtNear[depthRange],
          12,
        );
        expect(project(infinite, { x: 0, y: 0, z: -1e9 }).z).toBeCloseTo(1, 9);
      },
    );

    it.each(depthRanges)(
      'should map the orthographic box to the clip-space corners (%s)',
      (depthRange) => {
        const bounds = { min: { x: -4, y: -1 }, max: { x: 6, y: 3 } };
        const matrix = Mat4.orthographic(
          Mat4.create(),
          bounds,
          2,
          20,
          depthRange,
        );

        expectVec3Close(project(matrix, { x: -4, y: -1, z: -2 }), {
          x: -1,
          y: -1,
          z: clipDepthAtNear[depthRange],
        });
        expectVec3Close(project(matrix, { x: 6, y: 3, z: -20 }), {
          x: 1,
          y: 1,
          z: 1,
        });
      },
    );
  });

  describe('toFloat32', () => {
    it('should write the 16 elements at an offset', () => {
      const out = new Float32Array(20);
      const matrix = Mat4.fromTranslation(Mat4.create(), {
        x: 1.5,
        y: 2,
        z: 3,
      });

      expect(Mat4.toFloat32(out, 2, matrix)).toBe(out);
      expect(Array.from(out.subarray(2, 18))).toEqual(matrix);
      expect(out[0]).toBe(0);
      expect(out[18]).toBe(0);
    });
  });
});
