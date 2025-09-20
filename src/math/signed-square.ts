/**
 * Computes the signed square of a number.
 *
 * The result is the input number multiplied by its absolute value,
 * preserving the sign of the original number.
 *
 * @param x - The input number to be squared with sign preserved.
 * @returns The signed square of the input number.
 *
 * @example
 * ```typescript
 * signedSquare(3);   // 9
 * signedSquare(-3);  // -9
 * signedSquare(0);   // 0
 * ```
 */
export function signedSquare(x: number) {
  return x * Math.abs(x);
}
