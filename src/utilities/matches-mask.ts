/** * Checks if a given identifier matches a specified mask.
 * @param identifier - The identifier or category to check.
 * @param mask - The mask to compare against.
 * @returns True if the identifier matches the mask, false otherwise.
 */
export function matchesMask(identifier: number, mask: number): boolean {
  return (identifier & mask) !== 0;
}
