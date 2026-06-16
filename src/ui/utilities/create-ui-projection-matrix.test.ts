import { describe, expect, it } from 'vitest';
import { createUiProjectionMatrix } from './create-ui-projection-matrix';

/**
 * Apply `vec * mat` as GLSL would: result[j] = sum_i v[i] * m[i*3 + j]
 * (column-major mat3, row-vector on the left).
 */
function vecMat(
  v: [number, number, number],
  m: Float32Array,
): [number, number] {
  const x = v[0] * m[0] + v[1] * m[3] + v[2] * m[6];
  const y = v[0] * m[1] + v[1] * m[4] + v[2] * m[7];

  return [x, y];
}

describe('createUiProjectionMatrix', () => {
  it('maps top-left (0,0) to clip-space (-1, 1)', () => {
    const proj = createUiProjectionMatrix(800, 600);
    const [clipX, clipY] = vecMat([0, 0, 1], proj.matrix);

    expect(clipX).toBeCloseTo(-1);
    expect(clipY).toBeCloseTo(1);
  });

  it('maps bottom-right (width, height) to clip-space (1, -1)', () => {
    const proj = createUiProjectionMatrix(800, 600);
    const [clipX, clipY] = vecMat([800, 600, 1], proj.matrix);

    expect(clipX).toBeCloseTo(1);
    expect(clipY).toBeCloseTo(-1);
  });

  it('maps center (width/2, height/2) to clip-space (0, 0)', () => {
    const proj = createUiProjectionMatrix(800, 600);
    const [clipX, clipY] = vecMat([400, 300, 1], proj.matrix);

    expect(clipX).toBeCloseTo(0);
    expect(clipY).toBeCloseTo(0);
  });

  it('uses the correct scale factors for the given dimensions', () => {
    const width = 400;
    const height = 200;
    const proj = createUiProjectionMatrix(width, height);
    const m = proj.matrix;

    // Scale along x: m[0] = 2/width
    expect(m[0]).toBeCloseTo(2 / width);
    // Scale along y: m[4] = -2/height
    expect(m[4]).toBeCloseTo(-2 / height);
  });

  it('maps top-right corner correctly', () => {
    const proj = createUiProjectionMatrix(800, 600);
    const [clipX, clipY] = vecMat([800, 0, 1], proj.matrix);

    expect(clipX).toBeCloseTo(1);
    expect(clipY).toBeCloseTo(1);
  });
});
