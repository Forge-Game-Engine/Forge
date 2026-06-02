/**
 * Clamps a number to be within a specified range.
 *
 * @param value - The number to clamp.
 * @param min - The minimum value to clamp to.
 * @param max - The maximum value to clamp to.
 * @returns The clamped value, which will be within the range [min, max].
 */
export const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
};
