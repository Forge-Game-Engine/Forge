import { expect } from 'vitest';
import type { Matrix3 } from '../matrices/matrix3.js';
import type { Matrix4 } from '../matrices/matrix4.js';
import type { Quaternion } from '../quaternion.js';
import type { Vector3 } from '../vector3.js';

/** The default absolute tolerance, sized for 64-bit arithmetic. */
export const defaultMathTolerance = 1e-9;

const formatValues = (values: readonly number[]): string =>
  `[${values.join(', ')}]`;

const expectValuesClose = (
  kind: string,
  actual: readonly number[],
  expected: readonly number[],
  tolerance: number,
): void => {
  const differences = actual.map((value, index) =>
    Math.abs(value - expected[index]),
  );
  const isClose =
    actual.length === expected.length &&
    differences.every((difference) => difference <= tolerance);

  expect(
    isClose,
    `Expected ${kind} ${formatValues(actual)} to be within ${tolerance} of ${formatValues(expected)}`,
  ).toBe(true);
};

/**
 * Asserts that two vectors are equal component by component, within an
 * absolute tolerance.
 * @param actual - The vector under test.
 * @param expected - The expected vector.
 * @param tolerance - The largest difference allowed in each component.
 */
export const expectVec3Close = (
  actual: Vector3,
  expected: Vector3,
  tolerance: number = defaultMathTolerance,
): void => {
  expectValuesClose(
    'vector',
    [actual.x, actual.y, actual.z],
    [expected.x, expected.y, expected.z],
    tolerance,
  );
};

/**
 * Asserts that two quaternions are the same rotation within an absolute
 * tolerance. `q` and `-q` are the same rotation, so either sign matches.
 * @param actual - The quaternion under test.
 * @param expected - The expected rotation.
 * @param tolerance - The largest difference allowed in each component.
 */
export const expectQuatClose = (
  actual: Quaternion,
  expected: Quaternion,
  tolerance: number = defaultMathTolerance,
): void => {
  const sign =
    actual.x * expected.x +
      actual.y * expected.y +
      actual.z * expected.z +
      actual.w * expected.w <
    0
      ? -1
      : 1;

  expectValuesClose(
    'quaternion',
    [actual.x, actual.y, actual.z, actual.w],
    [
      expected.x * sign,
      expected.y * sign,
      expected.z * sign,
      expected.w * sign,
    ],
    tolerance,
  );
};

/**
 * Asserts that two 4x4 matrices are equal element by element, within an
 * absolute tolerance.
 * @param actual - The matrix under test.
 * @param expected - The expected matrix.
 * @param tolerance - The largest difference allowed in each element.
 */
export const expectMat4Close = (
  actual: Matrix4,
  expected: Matrix4,
  tolerance: number = defaultMathTolerance,
): void => {
  expectValuesClose('matrix', actual, expected, tolerance);
};

/**
 * Asserts that two 3x3 matrices are equal element by element, within an
 * absolute tolerance.
 * @param actual - The matrix under test.
 * @param expected - The expected matrix.
 * @param tolerance - The largest difference allowed in each element.
 */
export const expectMat3Close = (
  actual: Matrix3,
  expected: Matrix3,
  tolerance: number = defaultMathTolerance,
): void => {
  expectValuesClose('matrix', actual, expected, tolerance);
};
