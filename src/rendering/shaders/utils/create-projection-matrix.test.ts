import { describe, expect, it } from 'vitest';
import { createProjectionMatrix } from './create-projection-matrix';
import { Matrix3x3, Rect } from '../../../math';

const centeredRect = (width: number, height: number): Rect => ({
  min: { x: -width / 2, y: -height / 2 },
  max: { x: width / 2, y: height / 2 },
});

const project = (
  matrix: Matrix3x3,
  x: number,
  y: number,
): { x: number; y: number } => {
  const m = matrix.matrix;

  // Sprite instance data negates world y before it reaches the shader.
  return {
    x: m[0] * x + m[3] * -y + m[6],
    y: m[1] * x + m[4] * -y + m[7],
  };
};

describe('createProjectionMatrix', () => {
  it.each([
    { description: 'a wide area', width: 800, height: 600 },
    { description: 'a very small area', width: 1, height: 1 },
    { description: 'a very large area', width: 10000, height: 10000 },
  ])(
    'should scale $description centered on the origin to clip space',
    ({ width, height }) => {
      const expectedMatrix = new Matrix3x3([
        2 / width,
        0,
        0,
        -0,
        -2 / height,
        0,
        0,
        0,
        1,
      ]);

      const result = createProjectionMatrix(centeredRect(width, height));

      expect(result).toEqual(expectedMatrix);
    },
  );

  it('should map the corners of an off-center area to the corners of clip space', () => {
    const bounds: Rect = { min: { x: 10, y: -20 }, max: { x: 50, y: 0 } };

    const result = createProjectionMatrix(bounds);

    const bottomLeft = project(result, bounds.min.x, bounds.min.y);
    const topRight = project(result, bounds.max.x, bounds.max.y);
    const center = project(result, 30, -10);

    expect(bottomLeft.x).toBeCloseTo(-1);
    expect(bottomLeft.y).toBeCloseTo(-1);
    expect(topRight.x).toBeCloseTo(1);
    expect(topRight.y).toBeCloseTo(1);
    expect(center.x).toBeCloseTo(0);
    expect(center.y).toBeCloseTo(0);
  });
});
