import { describe, expect, it } from 'vitest';
import { Mat4 } from '../matrices/matrix4';
import { Quat } from '../quaternion';
import { Random } from '../random';
import { Vec3 } from '../vector3';
import { expectQuatClose } from './math-matchers';
import {
  forEachSeededCase,
  randomTransform,
  randomUnitQuat,
  randomUnitVec3,
} from './seeded-generators';

describe('seeded generators', () => {
  it('should run every case and name the failing seed', () => {
    let cases = 0;

    forEachSeededCase('counting', () => {
      cases++;
    });

    expect(cases).toBe(1000);
    expect(() =>
      forEachSeededCase(
        'failing',
        (random) => {
          expect(random.randomFloat(0, 1)).toBeLessThan(0);
        },
        3,
      ),
    ).toThrow('Property failed for seed "failing#0"');
  });

  it('should produce the same values for the same seed', () => {
    expect(randomUnitQuat(new Random('a'))).toEqual(
      randomUnitQuat(new Random('a')),
    );
  });

  it('should produce unit vectors and quaternions, and matching transforms', () => {
    forEachSeededCase(
      'generators are well-formed',
      (random) => {
        const quaternion = randomUnitQuat(random);
        const { position, rotation, scale, matrix } = randomTransform(
          random,
          true,
        );

        expect(Vec3.magnitude(randomUnitVec3(random))).toBeCloseTo(1, 12);
        expect(Math.sqrt(Quat.dot(quaternion, quaternion))).toBeCloseTo(1, 12);
        expect(matrix).toEqual(
          Mat4.fromTransform(Mat4.create(), position, rotation, scale),
        );
      },
      50,
    );
  });

  it('should treat q and -q as the same rotation when matching', () => {
    expect(() =>
      expectQuatClose({ x: 0, y: 0, z: 0, w: 1 }, { x: 0, y: 0, z: 0, w: -1 }),
    ).not.toThrow();
    expect(() =>
      expectQuatClose({ x: 0, y: 0, z: 1, w: 0 }, { x: 0, y: 0, z: 0, w: 1 }),
    ).toThrow();
  });
});
