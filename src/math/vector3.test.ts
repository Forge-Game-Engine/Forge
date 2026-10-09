import { beforeEach, describe, expect, it } from 'vitest';
import { Mat3 } from './matrices/matrix3';
import { Mat4 } from './matrices/matrix4';
import { Quat } from './quaternion';
import {
  expectVec3Close,
  forEachSeededCase,
  randomUnitQuat,
  randomVec3,
} from './test-helpers';
import { Vec3, Vector3 } from './vector3';

describe('Vector3', () => {
  describe('constants', () => {
    it('should return correct zero vector', () => {
      expect(Vec3.equals(Vec3.zero, { x: 0, y: 0, z: 0 })).toBe(true);
    });

    it('should return correct one vector', () => {
      expect(Vec3.equals(Vec3.one, { x: 1, y: 1, z: 1 })).toBe(true);
    });

    it('should return correct up vector', () => {
      expect(Vec3.equals(Vec3.up, { x: 0, y: 1, z: 0 })).toBe(true);
    });

    it('should return correct down vector', () => {
      expect(Vec3.equals(Vec3.down, { x: 0, y: -1, z: 0 })).toBe(true);
    });

    it('should return correct left vector', () => {
      expect(Vec3.equals(Vec3.left, { x: -1, y: 0, z: 0 })).toBe(true);
    });

    it('should return correct right vector', () => {
      expect(Vec3.equals(Vec3.right, { x: 1, y: 0, z: 0 })).toBe(true);
    });

    it('should point forward along -Z', () => {
      expect(Vec3.equals(Vec3.forward, { x: 0, y: 0, z: -1 })).toBe(true);
    });

    it('should point backward along +Z', () => {
      expect(Vec3.equals(Vec3.backward, { x: 0, y: 0, z: 1 })).toBe(true);
    });

    it('should point a model front along +Z', () => {
      expect(Vec3.equals(Vec3.modelFront, { x: 0, y: 0, z: 1 })).toBe(true);
    });

    it('should return a new object on every call', () => {
      expect(Vec3.zero).not.toBe(Vec3.zero);
    });
  });

  describe('vector operations', () => {
    let v1: Vector3;
    let v2: Vector3;

    beforeEach(() => {
      v1 = { x: 2, y: 3, z: 4 };
      v2 = { x: 5, y: 6, z: 7 };
    });

    it('should set vector components', () => {
      const vector = { x: 0, y: 0, z: 0 };
      const result = Vec3.set(vector, v1);
      expect(vector).toEqual(v1);
      expect(result).toBe(vector);
    });

    it('should add vectors in place', () => {
      const result = Vec3.add(v1, v2);
      expect(Vec3.equals(result, { x: 7, y: 9, z: 11 })).toBe(true);
      expect(result).toBe(v1);
    });

    it('should subtract vectors in place', () => {
      const result = Vec3.subtract(v1, v2);
      expect(Vec3.equals(result, { x: -3, y: -3, z: -3 })).toBe(true);
      expect(result).toBe(v1);
    });

    it('should multiply by scalar in place', () => {
      const result = Vec3.multiply(v1, 2);
      expect(Vec3.equals(result, { x: 4, y: 6, z: 8 })).toBe(true);
      expect(result).toBe(v1);
    });

    it('should multiply components in place', () => {
      const result = Vec3.multiplyComponents(v1, v2);
      expect(Vec3.equals(result, { x: 10, y: 18, z: 28 })).toBe(true);
      expect(result).toBe(v1);
    });

    it('should divide by scalar in place', () => {
      const result = Vec3.divide(v1, 2);
      expect(Vec3.equals(result, { x: 1, y: 1.5, z: 2 })).toBe(true);
      expect(result).toBe(v1);
    });
  });

  describe('vector properties', () => {
    it('should calculate magnitude', () => {
      const vector = { x: 1, y: 2, z: 2 };
      expect(Vec3.magnitude(vector)).toBe(3);
    });

    it('should calculate magnitude squared', () => {
      const vector = { x: 1, y: 2, z: 2 };
      expect(Vec3.magnitudeSquared(vector)).toBe(9);
    });

    it('should normalize vector in place', () => {
      const vector = { x: 1, y: 2, z: 2 };
      const normalized = Vec3.normalize(vector);
      expect(normalized.x).toBeCloseTo(1 / 3);
      expect(normalized.y).toBeCloseTo(2 / 3);
      expect(normalized.z).toBeCloseTo(2 / 3);
      expect(normalized).toBe(vector);
    });

    it('should throw when normalizing a zero-length vector', () => {
      const vector = { x: 0, y: 0, z: 0 };
      expect(() => Vec3.normalize(vector)).toThrow();
    });
  });

  describe('utility methods', () => {
    it('should floor components in place', () => {
      const vector = { x: 3.7, y: 4.2, z: 5.9 };
      const floored = Vec3.floorComponents(vector);
      expect(Vec3.equals(floored, { x: 3, y: 4, z: 5 })).toBe(true);
      expect(floored).toBe(vector);
    });

    it('should clone vector without mutating the original', () => {
      const original = { x: 2, y: 3, z: 4 };
      const clone = Vec3.clone(original);
      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
    });

    it('should convert to string', () => {
      const vector = { x: 2.123, y: 3.456, z: 4.789 };
      expect(Vec3.toString(vector)).toBe('(2.1, 3.5, 4.8)');
    });

    it('should convert vector to Float32Array', () => {
      const vector = { x: 2, y: 3, z: 4 };
      const floatArray = Vec3.toFloat32Array(vector);

      expect(floatArray).toBeInstanceOf(Float32Array);
      expect(floatArray).toEqual(new Float32Array([2, 3, 4]));
    });
  });
});

describe('Vec3 3D operations', () => {
  it('should set components in place', () => {
    const vector = Vec3.zero;

    expect(Vec3.setComponents(vector, 1, 2, 3)).toBe(vector);
    expect(vector).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('should build a vector from a Vector2 and a z', () => {
    const out = Vec3.zero;

    expect(Vec3.fromVector2(out, { x: 4, y: 5 }, 6)).toBe(out);
    expect(out).toEqual({ x: 4, y: 5, z: 6 });
  });

  it('should calculate the dot product', () => {
    expect(Vec3.dot({ x: 1, y: 2, z: 3 }, { x: 4, y: -5, z: 6 })).toBe(12);
  });

  it('should follow the right-hand rule for the cross product', () => {
    const target = Vec3.right;

    expect(Vec3.cross(target, Vec3.up)).toBe(target);
    expect(target).toEqual({ x: 0, y: 0, z: 1 });
    expect(Vec3.cross(Vec3.up, Vec3.backward)).toEqual({ x: 1, y: 0, z: 0 });
  });

  it('should negate, take minimum, maximum and absolute value in place', () => {
    expect(Vec3.negate({ x: 1, y: -2, z: 3 })).toEqual({ x: -1, y: 2, z: -3 });
    expect(Vec3.min({ x: 1, y: 5, z: -3 }, { x: 2, y: 4, z: -4 })).toEqual({
      x: 1,
      y: 4,
      z: -4,
    });
    expect(Vec3.max({ x: 1, y: 5, z: -3 }, { x: 2, y: 4, z: -4 })).toEqual({
      x: 2,
      y: 5,
      z: -3,
    });
    expect(Vec3.abs({ x: -1, y: 2, z: -3 })).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('should scale and add', () => {
    expect(
      Vec3.scaleAndAdd({ x: 1, y: 1, z: 1 }, { x: 1, y: 2, z: 3 }, 2),
    ).toEqual({ x: 3, y: 5, z: 7 });
  });

  it('should interpolate linearly', () => {
    const target = { x: 0, y: 10, z: -4 };

    expect(Vec3.lerp(target, { x: 10, y: 20, z: 4 }, 0.25)).toEqual({
      x: 2.5,
      y: 12.5,
      z: -2,
    });
  });

  it('should calculate distances', () => {
    const a = { x: 1, y: 2, z: 3 };
    const b = { x: 4, y: 6, z: 3 };

    expect(Vec3.distance(a, b)).toBe(5);
    expect(Vec3.distanceSquared(a, b)).toBe(25);
  });

  it('should transform a point and a direction by a matrix', () => {
    const matrix = Mat4.fromTransform(
      Mat4.create(),
      { x: 10, y: 20, z: 30 },
      Quat.fromAxisAngle(Quat.identity, Vec3.backward, Math.PI / 2),
      { x: 2, y: 2, z: 2 },
    );

    expectVec3Close(Vec3.transformPoint({ x: 1, y: 0, z: 0 }, matrix), {
      x: 10,
      y: 22,
      z: 30,
    });
    expectVec3Close(Vec3.transformDirection({ x: 1, y: 0, z: 0 }, matrix), {
      x: 0,
      y: 2,
      z: 0,
    });
  });

  it('should divide by w when transforming a point projectively', () => {
    const projection = Mat4.perspective(
      Mat4.create(),
      Math.PI / 2,
      1,
      1,
      10,
      'negativeOneToOne',
    );

    expectVec3Close(
      Vec3.transformPointProjective({ x: 1, y: 1, z: -1 }, projection),
      { x: 1, y: 1, z: -1 },
    );
    expectVec3Close(
      Vec3.transformPointProjective({ x: -10, y: 10, z: -10 }, projection),
      { x: -1, y: 1, z: 1 },
    );
  });

  it('should transform by a 3x3 matrix', () => {
    const matrix = Mat3.fromScale(Mat3.create(), { x: 2, y: 3, z: 4 });

    expect(Vec3.transformByMatrix3({ x: 1, y: 1, z: 1 }, matrix)).toEqual({
      x: 2,
      y: 3,
      z: 4,
    });
  });

  it('should rotate counter-clockwise about +Z, turning +X towards +Y', () => {
    const rotation = Quat.fromAngleZ(Quat.identity, Math.PI / 2);

    expectVec3Close(Vec3.rotate(Vec3.right, rotation), Vec3.up);
  });

  it('should rotate the same as the rotation matrix of the quaternion', () => {
    forEachSeededCase('Vec3.rotate agrees with Mat3.fromQuat', (random) => {
      const rotation = randomUnitQuat(random);
      const vector = randomVec3(random);
      const expected = Vec3.transformByMatrix3(
        Vec3.clone(vector),
        Mat3.fromQuat(Mat3.create(), rotation),
      );

      expectVec3Close(Vec3.rotate(vector, rotation), expected);
    });
  });

  it('should project onto a plane and reflect off it', () => {
    expect(Vec3.projectOnPlane({ x: 1, y: 2, z: 3 }, Vec3.up)).toEqual({
      x: 1,
      y: 0,
      z: 3,
    });
    expect(Vec3.reflect({ x: 1, y: -2, z: 3 }, Vec3.up)).toEqual({
      x: 1,
      y: 2,
      z: 3,
    });
  });

  it('should calculate the angle between two vectors', () => {
    expect(Vec3.angleBetween(Vec3.right, Vec3.up)).toBeCloseTo(Math.PI / 2);
    expect(Vec3.angleBetween(Vec3.right, Vec3.left)).toBeCloseTo(Math.PI);
    expect(Vec3.angleBetween(Vec3.right, { x: 5, y: 0, z: 0 })).toBe(0);
    expect(Vec3.angleBetween(Vec3.right, { x: 1, y: 1e-12, z: 0 })).toBeCloseTo(
      1e-12,
      20,
    );
    expect(Vec3.angleBetween(Vec3.zero, Vec3.up)).toBe(0);
  });

  it('should throw when normalizing a zero vector', () => {
    expect(() => Vec3.normalize(Vec3.zero)).toThrow(
      'Unable to normalize a zero-length Vector3.',
    );
  });
});
