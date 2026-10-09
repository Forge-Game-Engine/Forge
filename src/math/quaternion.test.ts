import { describe, expect, it } from 'vitest';
import { Mat3 } from './matrices/matrix3';
import { Mat4 } from './matrices/matrix4';
import { Quat, Quaternion, YawPitchRoll } from './quaternion';
import {
  expectQuatClose,
  expectVec3Close,
  forEachSeededCase,
  randomScale,
  randomUnitQuat,
  randomUnitVec3,
} from './test-helpers';
import { Vec3 } from './vector3';

const axisAngle = (
  axis: { x: number; y: number; z: number },
  radians: number,
): Quaternion => Quat.fromAxisAngle(Quat.identity, axis, radians);

const obliqueDirection = Vec3.normalize({ x: 0.3, y: -0.4, z: 0.86 });

describe('Quat', () => {
  describe('identity', () => {
    it('should be (0, 0, 0, 1) and fresh on every access', () => {
      expect(Quat.identity).toEqual({ x: 0, y: 0, z: 0, w: 1 });
      expect(Quat.identity).not.toBe(Quat.identity);
    });
  });

  describe('set and setComponents', () => {
    it('should write into the target', () => {
      const target = Quat.identity;

      expect(Quat.setComponents(target, 1, 2, 3, 4)).toBe(target);
      expect(target).toEqual({ x: 1, y: 2, z: 3, w: 4 });
      expect(Quat.set(target, Quat.identity)).toEqual(Quat.identity);
    });
  });

  describe('fromAxisAngle', () => {
    it('should turn counter-clockwise looking down the axis', () => {
      const rotation = axisAngle(Vec3.up, Math.PI / 2);

      // About +Y, +Z turns towards +X.
      expectVec3Close(Vec3.rotate(Vec3.backward, rotation), Vec3.right);
    });
  });

  describe('multiply and premultiply', () => {
    it('should apply the right operand first', () => {
      const yaw = axisAngle(Vec3.up, Math.PI / 2);
      const roll = axisAngle(Vec3.backward, Math.PI / 2);
      const combined = Quat.multiply(Quat.clone(yaw), roll);

      // Roll turns +X to +Y; yaw leaves +Y alone.
      expectVec3Close(Vec3.rotate(Vec3.right, combined), Vec3.up);
      expectQuatClose(Quat.premultiply(Quat.clone(roll), yaw), combined);
    });

    it('should match matrix composition', () => {
      forEachSeededCase('Quat.multiply matches Mat3.multiply', (random) => {
        const a = randomUnitQuat(random);
        const b = randomUnitQuat(random);
        const expected = Mat3.multiply(
          Mat3.fromQuat(Mat3.create(), a),
          Mat3.fromQuat(Mat3.create(), b),
        );
        const actual = Mat3.fromQuat(Mat3.create(), Quat.multiply(a, b));

        actual.forEach((value, index) => {
          expect(Math.abs(value - expected[index])).toBeLessThan(1e-12);
        });
      });
    });
  });

  describe('invert and conjugate', () => {
    it('should undo the rotation', () => {
      forEachSeededCase('q * q⁻¹ is the identity', (random) => {
        const rotation = randomUnitQuat(random);
        const inverse = Quat.invert(Quat.clone(rotation));

        expectQuatClose(Quat.multiply(rotation, inverse), Quat.identity);
      });
    });

    it('should invert a quaternion that is not unit length', () => {
      const scaled = { x: 0, y: 0, z: 2, w: 2 };
      const inverse = Quat.invert(Quat.clone(scaled));

      expectQuatClose(Quat.multiply(scaled, inverse), Quat.identity);
    });

    it('should negate the vector part when conjugating', () => {
      expect(Quat.conjugate({ x: 1, y: 2, z: 3, w: 4 })).toEqual({
        x: -1,
        y: -2,
        z: -3,
        w: 4,
      });
    });

    it('should throw when inverting a zero quaternion', () => {
      expect(() => Quat.invert({ x: 0, y: 0, z: 0, w: 0 })).toThrow(
        'Unable to invert a zero Quaternion.',
      );
    });
  });

  describe('normalize', () => {
    it('should scale to unit length', () => {
      expect(Quat.normalize({ x: 0, y: 0, z: 3, w: 4 })).toEqual({
        x: 0,
        y: 0,
        z: 0.6,
        w: 0.8,
      });
    });

    it('should throw for a zero quaternion', () => {
      expect(() => Quat.normalize({ x: 0, y: 0, z: 0, w: 0 })).toThrow(
        'Unable to normalize a zero Quaternion.',
      );
    });
  });

  describe('yaw, pitch and roll', () => {
    it('should yaw about Y, then pitch about X, then roll about Z', () => {
      const expected = Quat.multiply(
        Quat.multiply(axisAngle(Vec3.up, 0.3), axisAngle(Vec3.right, -0.7)),
        axisAngle(Vec3.backward, 1.1),
      );

      expectQuatClose(
        Quat.fromYawPitchRoll(Quat.identity, 0.3, -0.7, 1.1),
        expected,
      );
    });

    it('should turn a camera left with positive yaw and up with positive pitch', () => {
      const yawLeft = Quat.fromYawPitchRoll(Quat.identity, Math.PI / 2, 0, 0);
      const pitchUp = Quat.fromYawPitchRoll(Quat.identity, 0, Math.PI / 2, 0);

      expectVec3Close(Vec3.rotate(Vec3.forward, yawLeft), Vec3.left);
      expectVec3Close(Vec3.rotate(Vec3.forward, pitchUp), Vec3.up);
    });

    it('should invert fromYawPitchRoll away from the poles', () => {
      forEachSeededCase('toYawPitchRoll inverts fromYawPitchRoll', (random) => {
        const yaw = random.randomFloat(-Math.PI, Math.PI);
        const pitch = random.randomFloat(-1.5, 1.5);
        const roll = random.randomFloat(-Math.PI, Math.PI);
        const angles: YawPitchRoll = { yaw: 0, pitch: 0, roll: 0 };

        Quat.toYawPitchRoll(
          angles,
          Quat.fromYawPitchRoll(Quat.identity, yaw, pitch, roll),
        );

        expect(angles.yaw).toBeCloseTo(yaw, 9);
        expect(angles.pitch).toBeCloseTo(pitch, 9);
        expect(angles.roll).toBeCloseTo(roll, 9);
      });
    });

    it('should put the whole turn in yaw at a pitch of ±π/2', () => {
      for (const pitch of [Math.PI / 2, -Math.PI / 2]) {
        const rotation = Quat.fromYawPitchRoll(Quat.identity, 0.4, pitch, 0.3);
        const angles = Quat.toYawPitchRoll(
          { yaw: 0, pitch: 0, roll: 0 },
          rotation,
        );

        expect(angles.roll).toBe(0);
        expect(angles.pitch).toBeCloseTo(pitch, 6);
        expectQuatClose(
          Quat.fromYawPitchRoll(
            Quat.identity,
            angles.yaw,
            angles.pitch,
            angles.roll,
          ),
          rotation,
          1e-6,
        );
      }
    });
  });

  describe('2D angles', () => {
    it('should round-trip a 2D angle', () => {
      for (const angle of [0, 0.5, -2, Math.PI, 3]) {
        expect(Quat.angleZ(Quat.fromAngleZ(Quat.identity, angle))).toBeCloseTo(
          angle,
          12,
        );
      }
    });

    it('should wrap the angle to -π to π', () => {
      expect(
        Quat.angleZ(Quat.fromAngleZ(Quat.identity, 1.5 * Math.PI)),
      ).toBeCloseTo(-0.5 * Math.PI, 12);
      expect(
        Quat.angleZ(Quat.fromAngleZ(Quat.identity, -1.5 * Math.PI)),
      ).toBeCloseTo(0.5 * Math.PI, 12);
      expect(Quat.angleZ({ x: 0, y: 0, z: -1, w: 0 })).toBeCloseTo(Math.PI, 12);
    });

    it('should read the twist about Z of a rotation that also swings', () => {
      forEachSeededCase('angleZ is the twist about Z', (random) => {
        const angle = random.randomFloat(-3, 3);
        const swingAxis = Vec3.normalize({
          x: random.randomFloat(-1, 1),
          y: random.randomFloat(-1, 1),
          z: 0,
        });
        const rotation = Quat.multiply(
          axisAngle(swingAxis, random.randomFloat(-3, 3)),
          Quat.fromAngleZ(Quat.identity, angle),
        );

        expect(Quat.angleZ(rotation)).toBeCloseTo(angle, 9);
      });
    });

    it('should return 0 for a half turn with no twist', () => {
      expect(Quat.angleZ({ x: 1, y: 0, z: 0, w: 0 })).toBe(0);
    });
  });

  describe('fromUnitVectors', () => {
    it('should turn one direction into another', () => {
      forEachSeededCase('fromUnitVectors turns from into to', (random) => {
        const from = randomUnitVec3(random);
        const to = randomUnitVec3(random);
        const rotation = Quat.fromUnitVectors(Quat.identity, from, to);

        expectVec3Close(Vec3.rotate(Vec3.clone(from), rotation), to);
      });
    });

    it('should turn half way about a perpendicular axis for opposite directions', () => {
      for (const from of [
        Vec3.right,
        Vec3.up,
        Vec3.backward,
        obliqueDirection,
      ]) {
        const to = Vec3.negate(Vec3.clone(from));
        const rotation = Quat.fromUnitVectors(Quat.identity, from, to);

        expect(rotation.w).toBe(0);
        expect(Vec3.dot(rotation, from)).toBeCloseTo(0, 12);
        expectVec3Close(Vec3.rotate(Vec3.clone(from), rotation), to);
      }
    });

    it('should return the identity for equal directions', () => {
      expectQuatClose(
        Quat.fromUnitVectors(Quat.identity, Vec3.up, Vec3.up),
        Quat.identity,
      );
    });
  });

  describe('look rotations', () => {
    it('should turn -Z to forward with +Y towards up', () => {
      forEachSeededCase('lookRotation aims -Z', (random) => {
        const forward = randomUnitVec3(random);
        const up = randomUnitVec3(random);
        const rotation = Quat.lookRotation(
          Quat.identity,
          Vec3.multiply(Vec3.clone(forward), 3),
          up,
        );
        const rotatedUp = Vec3.rotate(Vec3.up, rotation);

        expectVec3Close(Vec3.rotate(Vec3.forward, rotation), forward);
        // +Y stays in the plane of forward and up, on up's side.
        expect(
          Vec3.dot(rotatedUp, Vec3.cross(Vec3.clone(forward), up)),
        ).toBeCloseTo(0, 9);
        expect(Vec3.dot(rotatedUp, up)).toBeGreaterThanOrEqual(0);
        expect(
          Math.hypot(rotation.x, rotation.y, rotation.z, rotation.w),
        ).toBeCloseTo(1, 12);
      });
    });

    it('should be the identity when looking along -Z with +Y up', () => {
      expectQuatClose(
        Quat.lookRotation(Quat.identity, Vec3.forward, Vec3.up),
        Quat.identity,
      );
    });

    it('should turn +Z to front for a model look rotation', () => {
      forEachSeededCase('modelLookRotation aims +Z', (random) => {
        const front = randomUnitVec3(random);
        const rotation = Quat.modelLookRotation(Quat.identity, front, Vec3.up);

        expectVec3Close(Vec3.rotate(Vec3.modelFront, rotation), front);
      });
    });

    it('should fall back to another up when forward is parallel to up', () => {
      const down = Quat.lookRotation(Quat.identity, Vec3.down, Vec3.up);
      const along = Quat.lookRotation(
        Quat.identity,
        Vec3.backward,
        Vec3.backward,
      );

      expectVec3Close(Vec3.rotate(Vec3.forward, down), Vec3.down);
      // Looking down, the top of the view faces the world's forward.
      expectVec3Close(Vec3.rotate(Vec3.up, down), Vec3.forward);
      expectVec3Close(Vec3.rotate(Vec3.forward, along), Vec3.backward);
      expectVec3Close(Vec3.rotate(Vec3.up, along), Vec3.up);
    });

    it('should throw for a zero forward', () => {
      expect(() =>
        Quat.lookRotation(Quat.identity, Vec3.zero, Vec3.up),
      ).toThrow(
        'Unable to build a look rotation from a zero-length direction.',
      );
    });
  });

  describe('fromMatrix3 and fromMatrix4', () => {
    it('should read the rotation of a rotation matrix', () => {
      forEachSeededCase('fromMatrix3 inverts Mat3.fromQuat', (random) => {
        const rotation = randomUnitQuat(random);
        const matrix = Mat3.fromQuat(Mat3.create(), rotation);

        expectQuatClose(Quat.fromMatrix3(Quat.identity, matrix), rotation);
      });
    });

    it('should read the rotation of a matrix that scales', () => {
      forEachSeededCase('fromMatrix4 ignores positive scale', (random) => {
        const rotation = randomUnitQuat(random);
        const matrix = Mat4.fromTransform(
          Mat4.create(),
          Vec3.zero,
          rotation,
          randomScale(random, false),
        );

        expectQuatClose(Quat.fromMatrix4(Quat.identity, matrix), rotation);
      });
    });

    it('should flip the X axis of a matrix that mirrors', () => {
      const rotation = axisAngle(Vec3.up, 0.8);
      const matrix = Mat4.fromTransform(Mat4.create(), Vec3.zero, rotation, {
        x: -2,
        y: 3,
        z: 1,
      });

      expectQuatClose(Quat.fromMatrix4(Quat.identity, matrix), rotation);
    });
  });

  describe('slerp', () => {
    it('should return the endpoints at t = 0 and t = 1', () => {
      forEachSeededCase('slerp endpoints', (random) => {
        const a = randomUnitQuat(random);
        const b = randomUnitQuat(random);

        expectQuatClose(Quat.slerp(Quat.clone(a), b, 0), a);
        expectQuatClose(Quat.slerp(Quat.clone(a), b, 1), b);
      });
    });

    it('should turn at a constant angular speed along the shortest path', () => {
      forEachSeededCase('slerp constant angular speed', (random) => {
        const a = randomUnitQuat(random);
        const b = randomUnitQuat(random);
        const t = random.randomFloat(0, 1);
        const total = Quat.angleBetween(a, b);
        const partial = Quat.slerp(Quat.clone(a), b, t);

        expect(total).toBeLessThanOrEqual(Math.PI);
        expect(Quat.angleBetween(a, partial)).toBeCloseTo(t * total, 9);
        expect(Quat.angleBetween(partial, b)).toBeCloseTo((1 - t) * total, 9);
      });
    });

    it('should treat q and -q as the same rotation', () => {
      const a = axisAngle(Vec3.up, 0.2);
      const b = axisAngle(Vec3.up, 1.2);
      const negatedB = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };

      expectQuatClose(
        Quat.slerp(Quat.clone(a), negatedB, 0.5),
        axisAngle(Vec3.up, 0.7),
      );
    });

    it('should interpolate nearly equal rotations without dividing by zero', () => {
      const a = axisAngle(Vec3.up, 0.5);
      const b = axisAngle(Vec3.up, 0.5 + 1e-9);

      expectQuatClose(Quat.slerp(Quat.clone(a), b, 0.5), a, 1e-8);
    });
  });

  describe('nlerp', () => {
    it('should return unit quaternions with the endpoints at 0 and 1', () => {
      forEachSeededCase('nlerp endpoints', (random) => {
        const a = randomUnitQuat(random);
        const b = randomUnitQuat(random);
        const middle = Quat.nlerp(Quat.clone(a), b, 0.5);

        expectQuatClose(Quat.nlerp(Quat.clone(a), b, 0), a);
        expectQuatClose(Quat.nlerp(Quat.clone(a), b, 1), b);
        expect(Math.sqrt(Quat.dot(middle, middle))).toBeCloseTo(1, 12);
      });
    });
  });

  describe('rotateTowards', () => {
    it('should turn by at most the maximum angle', () => {
      const from = Quat.identity;
      const to = axisAngle(Vec3.up, 1);

      Quat.rotateTowards(from, to, 0.25);

      expectQuatClose(from, axisAngle(Vec3.up, 0.25));
    });

    it('should reach the target when it is within the maximum angle', () => {
      const from = axisAngle(Vec3.up, 0.9);
      const to = axisAngle(Vec3.up, 1);

      expect(Quat.rotateTowards(from, to, 0.5)).toEqual(to);
    });
  });

  describe('angleBetween', () => {
    it('should return the angle of the rotation between two rotations', () => {
      expect(
        Quat.angleBetween(axisAngle(Vec3.up, 0.2), axisAngle(Vec3.up, 1.5)),
      ).toBeCloseTo(1.3, 12);
      expect(
        Quat.angleBetween(Quat.identity, axisAngle(Vec3.right, 1e-10)),
      ).toBeCloseTo(1e-10, 20);
    });

    it('should be at most π', () => {
      expect(
        Quat.angleBetween(Quat.identity, axisAngle(Vec3.up, 1.5 * Math.PI)),
      ).toBeCloseTo(0.5 * Math.PI, 12);
    });
  });

  describe('equals and exactlyEquals', () => {
    it('should treat q and -q as equal rotations', () => {
      const rotation = axisAngle(Vec3.up, 1);
      const negated = {
        x: -rotation.x,
        y: -rotation.y,
        z: -rotation.z,
        w: -rotation.w,
      };

      expect(Quat.equals(rotation, negated)).toBe(true);
      expect(Quat.exactlyEquals(rotation, negated)).toBe(false);
      expect(Quat.exactlyEquals(rotation, Quat.clone(rotation))).toBe(true);
    });

    it('should compare within the tolerance', () => {
      const a = { x: 0, y: 0, z: 0, w: 1 };
      const b = { x: 1e-4, y: 0, z: 0, w: 1 };

      expect(Quat.equals(a, b)).toBe(false);
      expect(Quat.equals(a, b, 1e-3)).toBe(true);
    });
  });
});
