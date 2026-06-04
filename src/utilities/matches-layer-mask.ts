/** * Checks if a given layer matches a specified layer mask.
 * @param layer - The layer to check.
 * @param mask - The layer mask to compare against.
 * @returns True if the layer matches the mask, false otherwise.
 */
export function matchesLayerMask(layer: number, mask: number): boolean {
  return (layer & mask) !== 0;
}
