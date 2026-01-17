export function matchesLayerMask(layer: number, mask: number): boolean {
  return (layer & mask) !== 0;
}
