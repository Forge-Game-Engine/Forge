import { describe, expect, it } from 'vitest';
import { expectVec3Close } from '../test-helpers';
import { Vec3 } from '../vector3';
import { Plane, Planes } from './plane';

const createPlane = (): Plane => ({ normal: Vec3.zero, constant: 0 });

describe('Planes', () => {
  it('should build a plane from a point and a normal', () => {
    const plane = Planes.fromPointAndNormal(
      createPlane(),
      { x: 0, y: 3, z: 0 },
      Vec3.up,
    );

    expect(plane).toEqual({ normal: Vec3.up, constant: -3 });
    expect(Planes.signedDistance(plane, { x: 5, y: 10, z: -2 })).toBe(7);
    expect(Planes.signedDistance(plane, { x: 5, y: 1, z: -2 })).toBe(-2);
  });

  it('should face the side from which the points are counter-clockwise', () => {
    const plane = Planes.fromPoints(
      createPlane(),
      { x: 0, y: 0, z: 2 },
      { x: 1, y: 0, z: 2 },
      { x: 0, y: 1, z: 2 },
    );

    expectVec3Close(plane.normal, Vec3.backward);
    expect(plane.constant).toBeCloseTo(-2, 12);
  });

  it('should throw for points on one line', () => {
    expect(() =>
      Planes.fromPoints(createPlane(), Vec3.zero, Vec3.one, {
        x: 2,
        y: 2,
        z: 2,
      }),
    ).toThrow('Unable to build a plane from three points on one line.');
  });

  it('should normalize the normal and the constant together', () => {
    const plane = Planes.normalize({
      normal: { x: 0, y: 2, z: 0 },
      constant: 4,
    });

    expect(plane).toEqual({ normal: Vec3.up, constant: 2 });
    expect(() => Planes.normalize({ normal: Vec3.zero, constant: 1 })).toThrow(
      'Unable to normalize a Plane with a zero normal.',
    );
  });

  it('should project a point onto the plane', () => {
    const plane: Plane = { normal: Vec3.up, constant: -1 };

    expect(
      Planes.projectPoint(Vec3.zero, plane, { x: 3, y: 7, z: -4 }),
    ).toEqual({ x: 3, y: 1, z: -4 });
  });
});
