import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  expectMat3Close,
  expectVec3Close,
  forEachSeededCase,
  randomTransform,
  randomUnitQuat,
  randomVec3,
} from '../test-helpers';
import { Vec3 } from '../vector3';
import { Mat3, Matrix3 } from './matrix3';
import { Mat4, Matrix4 } from './matrix4';

const identity: Matrix3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

describe('Mat3', () => {
  it('should create, reset, copy and clone identity matrices', () => {
    const matrix = Mat3.fromScale(Mat3.create(), { x: 2, y: 3, z: 4 });
    const clone = Mat3.clone(matrix);

    expect(Mat3.create()).toEqual(identity);
    expect(clone).toEqual(matrix);
    expect(clone).not.toBe(matrix);
    expect(Mat3.copy(Mat3.create(), matrix)).toEqual(matrix);
    expect(Mat3.identity(matrix)).toEqual(identity);
  });

  it('should not accept a Matrix4 where a Matrix3 is expected', () => {
    expectTypeOf<Matrix4>().not.toExtend<Matrix3>();
  });

  it('should apply the right operand first when multiplying', () => {
    const scale = Mat3.fromScale(Mat3.create(), { x: 2, y: 1, z: 1 });
    const swap: Matrix3 = [0, 1, 0, 1, 0, 0, 0, 0, 1];
    const combined = Mat3.multiply(Mat3.clone(swap), scale);

    expect(Vec3.transformByMatrix3({ x: 1, y: 0, z: 0 }, combined)).toEqual({
      x: 0,
      y: 2,
      z: 0,
    });
    expect(Mat3.premultiply(Mat3.clone(scale), swap)).toEqual(combined);
  });

  it('should transpose in place', () => {
    const matrix: Matrix3 = [0, 1, 2, 3, 4, 5, 6, 7, 8];

    expect(Mat3.transpose(matrix)).toEqual([0, 3, 6, 1, 4, 7, 2, 5, 8]);
  });

  it('should invert, and give null for a singular matrix', () => {
    forEachSeededCase('Mat3.invert(m) * m is the identity', (random) => {
      const matrix = Mat3.fromMatrix4(
        Mat3.create(),
        randomTransform(random, true).matrix,
      );
      const inverse = Mat3.invert(Mat3.create(), matrix) ?? Mat3.create();

      expectMat3Close(Mat3.multiply(inverse, matrix), identity);
    });

    const out = Mat3.create();

    expect(
      Mat3.invert(out, Mat3.fromScale(Mat3.create(), { x: 1, y: 1, z: 0 })),
    ).toBeNull();
    expect(out).toEqual(identity);
  });

  it('should invert a symmetric matrix like the general inverse', () => {
    forEachSeededCase('invertSymmetric matches invert', (random) => {
      // R D Rᵀ is symmetric, like an inertia tensor in world space.
      const rotation = Mat3.fromQuat(Mat3.create(), randomUnitQuat(random));
      const diagonal = Mat3.fromScale(
        Mat3.create(),
        randomVec3(random, 0.5, 5),
      );
      const tensor = Mat3.multiply(Mat3.clone(rotation), diagonal);

      Mat3.multiply(tensor, Mat3.transpose(rotation));

      expectMat3Close(
        Mat3.invertSymmetric(Mat3.create(), tensor) ?? Mat3.create(),
        Mat3.invert(Mat3.create(), tensor) ?? Mat3.create(),
      );
    });

    expect(
      Mat3.invertSymmetric(Mat3.create(), [0, 0, 0, 0, 1, 0, 0, 0, 1]),
    ).toBeNull();
  });

  it('should calculate the determinant', () => {
    expect(
      Mat3.determinant(Mat3.fromScale(Mat3.create(), { x: 2, y: -3, z: 4 })),
    ).toBe(-24);
  });

  it('should build the upper-left 3x3 of a 4x4 matrix', () => {
    const matrix4 = Mat4.fromTranslation(Mat4.create(), { x: 7, y: 8, z: 9 });

    Mat4.multiply(matrix4, Mat4.fromScale(Mat4.create(), { x: 2, y: 3, z: 4 }));

    expect(Mat3.fromMatrix4(Mat3.create(), matrix4)).toEqual(
      Mat3.fromScale(Mat3.create(), { x: 2, y: 3, z: 4 }),
    );
  });

  it('should keep normals perpendicular under non-uniform scale', () => {
    forEachSeededCase(
      'normalFromMatrix4 keeps normals perpendicular',
      (random) => {
        const { matrix } = randomTransform(random, true);
        const normalMatrix =
          Mat3.normalFromMatrix4(Mat3.create(), matrix) ?? Mat3.create();
        // A surface's normal and a tangent in it, perpendicular.
        const normal = Vec3.normalize(randomVec3(random));
        const tangent = Vec3.projectOnPlane(randomVec3(random), normal);

        Vec3.transformByMatrix3(normal, normalMatrix);
        Vec3.transformDirection(tangent, matrix);

        expect(Vec3.dot(normal, tangent)).toBeCloseTo(0, 6);
      },
    );

    expect(
      Mat3.normalFromMatrix4(
        Mat3.create(),
        Mat4.fromScale(Mat4.create(), { x: 0, y: 1, z: 1 }),
      ),
    ).toBeNull();
  });

  it('should build the cross-product matrix', () => {
    forEachSeededCase('skew(a) * b is a × b', (random) => {
      const a = randomVec3(random);
      const b = randomVec3(random);

      expectVec3Close(
        Vec3.transformByMatrix3(Vec3.clone(b), Mat3.skew(Mat3.create(), a)),
        Vec3.cross(Vec3.clone(a), b),
        1e-9,
      );
    });
  });

  it('should build the outer product', () => {
    expect(
      Mat3.outerProduct(
        Mat3.create(),
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5, z: 6 },
      ),
    ).toEqual([4, 8, 12, 5, 10, 15, 6, 12, 18]);
  });

  it('should add and scale element by element', () => {
    const matrix = Mat3.create();

    Mat3.add(matrix, Mat3.create());
    Mat3.scale(matrix, 1.5);

    expect(matrix).toEqual([3, 0, 0, 0, 3, 0, 0, 0, 3]);
  });

  it('should write the 9 elements at an offset', () => {
    const out = new Float32Array(10);

    Mat3.toFloat32(out, 1, Mat3.fromScale(Mat3.create(), { x: 2, y: 3, z: 4 }));

    expect(Array.from(out)).toEqual([0, 2, 0, 0, 0, 3, 0, 0, 0, 4]);
  });
});
