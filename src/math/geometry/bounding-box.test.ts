import { describe, expect, it } from 'vitest';
import { Mat4 } from '../matrices/matrix4';
import {
  expectVec3Close,
  forEachSeededCase,
  randomBox,
  randomTransform,
} from '../test-helpers';
import { Vec3, Vector3 } from '../vector3';
import { BoundingBox, BoundingBoxes } from './bounding-box';

const cornersOf = (box: BoundingBox): Vector3[] =>
  [0, 1, 2, 3, 4, 5, 6, 7].map((index) => ({
    x: index & 1 ? box.max.x : box.min.x,
    y: index & 2 ? box.max.y : box.min.y,
    z: index & 4 ? box.max.z : box.min.z,
  }));

describe('BoundingBoxes', () => {
  it('should create an empty box that the first point sets', () => {
    const box = BoundingBoxes.empty();

    expect(BoundingBoxes.isEmpty(box)).toBe(true);
    expect(BoundingBoxes.containsPoint(box, Vec3.zero)).toBe(false);

    BoundingBoxes.expandByPoint(box, { x: 1, y: 2, z: 3 });

    expect(box).toEqual({
      min: { x: 1, y: 2, z: 3 },
      max: { x: 1, y: 2, z: 3 },
    });
    expect(BoundingBoxes.isEmpty(box)).toBe(false);
    expect(BoundingBoxes.isEmpty(BoundingBoxes.makeEmpty(box))).toBe(true);
  });

  it('should build a box from strided positions', () => {
    // Positions interleaved with a 2-element attribute, after one padding element.
    const positions = new Float32Array([
      99, 1, -2, 3, 0, 0, -4, 5, 6, 0, 0, 2, 0, -1, 0, 0,
    ]);
    const box = BoundingBoxes.fromPositions(
      BoundingBoxes.empty(),
      positions,
      5,
      1,
    );

    expect(box).toEqual({
      min: { x: -4, y: -2, z: -1 },
      max: { x: 2, y: 5, z: 6 },
    });
    expect(
      BoundingBoxes.isEmpty(
        BoundingBoxes.fromPositions(
          BoundingBoxes.empty(),
          new Float32Array(),
          3,
          0,
        ),
      ),
    ).toBe(true);
  });

  it('should grow to contain another box, ignoring an empty one', () => {
    const box = { min: Vec3.zero, max: Vec3.one };

    BoundingBoxes.union(box, BoundingBoxes.empty());

    expect(box).toEqual({ min: Vec3.zero, max: Vec3.one });

    BoundingBoxes.union(box, {
      min: { x: -1, y: 0.5, z: 0.5 },
      max: { x: 0.5, y: 0.5, z: 3 },
    });

    expect(box).toEqual({
      min: { x: -1, y: 0, z: 0 },
      max: { x: 1, y: 1, z: 3 },
    });
  });

  it('should return the center and half extents', () => {
    const box = { min: { x: -2, y: 0, z: 4 }, max: { x: 2, y: 6, z: 5 } };

    expect(BoundingBoxes.center(Vec3.zero, box)).toEqual({
      x: 0,
      y: 3,
      z: 4.5,
    });
    expect(BoundingBoxes.halfExtents(Vec3.zero, box)).toEqual({
      x: 2,
      y: 3,
      z: 0.5,
    });
  });

  it('should transform to the tight box of the transformed corners', () => {
    forEachSeededCase(
      'BoundingBoxes.transform matches its corners',
      (random) => {
        const box = randomBox(random);
        const { matrix } = randomTransform(random, true);
        const expected = BoundingBoxes.empty();

        for (const corner of cornersOf(box)) {
          BoundingBoxes.expandByPoint(
            expected,
            Vec3.transformPoint(corner, matrix),
          );
        }

        BoundingBoxes.transform(box, box, matrix);

        expectVec3Close(box.min, expected.min, 1e-9);
        expectVec3Close(box.max, expected.max, 1e-9);
      },
    );
  });

  it('should keep an empty box empty when transforming', () => {
    const out = { min: Vec3.zero, max: Vec3.one };

    BoundingBoxes.transform(
      out,
      BoundingBoxes.empty(),
      Mat4.fromTranslation(Mat4.create(), Vec3.one),
    );

    expect(BoundingBoxes.isEmpty(out)).toBe(true);
  });

  it('should test overlap and containment including faces', () => {
    const box = { min: Vec3.zero, max: Vec3.one };

    expect(
      BoundingBoxes.intersects(box, {
        min: { x: 1, y: 0, z: 0 },
        max: { x: 2, y: 1, z: 1 },
      }),
    ).toBe(true);
    expect(
      BoundingBoxes.intersects(box, {
        min: { x: 1.1, y: 0, z: 0 },
        max: { x: 2, y: 1, z: 1 },
      }),
    ).toBe(false);
    expect(BoundingBoxes.containsPoint(box, { x: 1, y: 0.5, z: 0 })).toBe(true);
    expect(BoundingBoxes.containsPoint(box, { x: 1, y: 0.5, z: -0.1 })).toBe(
      false,
    );
  });
});
