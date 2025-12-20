import { describe, expect, it } from 'vitest';
import { createProjectionMatrix } from './create-projection-matrix';
import { Matrix3x3, Vector2 } from '../../../math';

describe('createProjectionMatrix', () => {
  it('should create a correct projection matrix for given width and height', () => {
    const width = 800;
    const height = 600;
    const cameraPosition = new Vector2(0, 0);
    const zoom = 1;

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

    const result = createProjectionMatrix(width, height, cameraPosition, zoom);

    expect(result).toEqual(expectedMatrix);
  });

  it('should create a correct projection matrix for a square area', () => {
    const size = 500;
    const cameraPosition = new Vector2(0, 0);
    const zoom = 1;
    const expectedMatrix = new Matrix3x3([
      2 / size,
      0,
      0,
      -0,
      -2 / size,
      0,
      0,
      0,
      1,
    ]);

    const result = createProjectionMatrix(size, size, cameraPosition, zoom);

    expect(result).toEqual(expectedMatrix);
  });

  it('should create a correct projection matrix for a very small area', () => {
    const width = 1;
    const height = 1;
    const cameraPosition = new Vector2(0, 0);
    const zoom = 1;
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

    const result = createProjectionMatrix(width, height, cameraPosition, zoom);

    expect(result).toEqual(expectedMatrix);
  });

  it('should create a correct projection matrix for a very large area', () => {
    const width = 10000;
    const height = 10000;
    const cameraPosition = new Vector2(0, 0);
    const zoom = 1;
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

    const result = createProjectionMatrix(width, height, cameraPosition, zoom);

    expect(result).toEqual(expectedMatrix);
  });

  it('should apply zoom correctly', () => {
    const width = 800;
    const height = 600;
    const cameraPosition = new Vector2(0, 0);
    const zoom = 2;

    const expectedMatrix = new Matrix3x3([
      (2 / width) * zoom,
      0,
      0,
      -0,
      (-2 / height) * zoom,
      0,
      0,
      0,
      1,
    ]);

    const result = createProjectionMatrix(width, height, cameraPosition, zoom);

    expect(result).toEqual(expectedMatrix);
  });

  it('should translate the camera position correctly', () => {
    const width = 800;
    const height = 600;
    const cameraPosition = new Vector2(100, 50);
    const zoom = 1;

    // The matrix should include translation by -cameraPosition.x and -cameraPosition.y
    const scaleX = 2 / width;
    const scaleY = -2 / height;
    const tx = -cameraPosition.x * scaleX;
    const ty = -cameraPosition.y * scaleY;

    const expectedMatrix = new Matrix3x3([
      scaleX,
      0,
      0,
      -0,
      scaleY,
      0,
      tx,
      ty,
      1,
    ]);

    const result = createProjectionMatrix(width, height, cameraPosition, zoom);

    expect(result).toEqual(expectedMatrix);
  });

  it('should apply both zoom and camera translation', () => {
    const width = 400;
    const height = 200;
    const cameraPosition = new Vector2(10, -20);
    const zoom = 0.5;

    const scaleX = (2 / width) * zoom;
    const scaleY = (-2 / height) * zoom;
    const tx = -cameraPosition.x * scaleX;
    const ty = -cameraPosition.y * scaleY;

    const result = createProjectionMatrix(width, height, cameraPosition, zoom);

    // Use toBeCloseTo for floating-point comparisons to handle Float32Array precision
    // values used in the test are of type `number` which is a double-precision floats
    // but the matrix is stored as `Float32Array` which are single-precision floats
    // we use single-precision floats in the implementation for performance reasons
    // and because we send these matrices to the GPU which typically uses single-precision floats
    expect(result.matrix[0]).toBeCloseTo(scaleX);
    expect(result.matrix[1]).toBeCloseTo(0);
    expect(result.matrix[2]).toBeCloseTo(0);
    expect(result.matrix[3]).toBeCloseTo(0);
    expect(result.matrix[4]).toBeCloseTo(scaleY);
    expect(result.matrix[5]).toBeCloseTo(0);
    expect(result.matrix[6]).toBeCloseTo(tx);
    expect(result.matrix[7]).toBeCloseTo(ty);
    expect(result.matrix[8]).toBeCloseTo(1);
  });

  it('should handle negative zoom (flipping)', () => {
    const width = 100;
    const height = 100;
    const cameraPosition = new Vector2(0, 0);
    const zoom = -1;

    const expectedMatrix = new Matrix3x3([
      (2 / width) * zoom,
      -0,
      0,
      0,
      (-2 / height) * zoom,
      0,
      0,
      0,
      1,
    ]);

    const result = createProjectionMatrix(width, height, cameraPosition, zoom);

    expect(result).toEqual(expectedMatrix);
  });
});
