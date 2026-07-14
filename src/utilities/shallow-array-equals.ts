/** Compares two arrays for shallow equality.
 * @param a - The first array to compare.
 * @param b - The second array to compare.
 * @returns True if the arrays are shallowly equal, false otherwise.
 */
export function shallowArraysEqual<T>(
  a: readonly T[],
  b: readonly T[],
): boolean {
  if (a === b) {
    return true;
  }

  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}
