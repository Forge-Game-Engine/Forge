/**
 * Ensures that the provided value is returned as an array.
 *
 * If the value is already an array, it is returned as-is. If the value is not an array, it is wrapped in an array.
 * If the value is null or undefined, an empty array is returned.
 *
 * @param value - The value to ensure as an array.
 * @typeParam T - The type of the array elements.
 * @returns The value as an array.
 * @example
 * enforceArray(5); // returns [5]
 * enforceArray([5]); // returns [5]
 * enforceArray('hello'); // returns ['hello']
 * enforceArray(true); // returns [true]
 * enforceArray({ a: 1 }); // returns [{ a: 1 }]
 * enforceArray(null); // returns []
 * enforceArray(undefined); // returns []
 */
export function enforceArray<T>(value: T[] | T | null | undefined): T[] {
  if (value === null || value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}
