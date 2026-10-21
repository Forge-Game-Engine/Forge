import type { Texture } from '../texture.js';

/**
 * How far, in UV, a shader samples inside a region of `texture`: half a
 * texel for a texture whose `wrap` is `'clamp'`, so filtering never blends
 * in the texels next to the region (a neighboring frame in a sheet, or a
 * neighboring tile in a tileset), the way it never reaches past a whole
 * clamped texture's edges. A repeating texture isn't inset, so a region
 * that tiles or scrolls it still wraps around. Sprites and tilemap layers
 * share this rule. Not exported from the package.
 * @param texture - The texture the regions are cut from.
 * @returns The inset, in UV, as `(x, y)`. `(0, 0)` while the texture has no
 * size (before its image loads).
 */
export function computeRegionInset(texture: Texture): Float32Array {
  if (
    texture.wrap === 'repeat' ||
    texture.width === 0 ||
    texture.height === 0
  ) {
    return new Float32Array([0, 0]);
  }

  return new Float32Array([0.5 / texture.width, 0.5 / texture.height]);
}
