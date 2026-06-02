/**
 * Checks if the provided value is a number.
 *
 * @param value - The value to check.
 * @returns True if the value is a number, false otherwise.
 * @example
 * isNumber(5); // returns true
 * isNumber('5'); // returns false
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}
