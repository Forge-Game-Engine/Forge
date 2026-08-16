/**
 * The size (world units, and atlas pixels - the scene renders this atlas at
 * exactly 1 atlas pixel per world unit, see `text-effects-overlap.ts`) of
 * the generated square glyph's tile.
 */
export const SYNTHETIC_GLYPH_TILE_SIZE = 128;

/**
 * The half-width/height, in atlas pixels, of the glyph's own filled ink
 * square, centered within the tile.
 */
export const SYNTHETIC_GLYPH_INK_HALF_SIZE = 32;

/** The distance field's encoded range, in atlas pixels (`FontAtlasData.distanceRange`). */
export const SYNTHETIC_GLYPH_DISTANCE_RANGE = 16;

function boxSignedDistance(
  px: number,
  py: number,
  centerX: number,
  centerY: number,
  halfWidth: number,
  halfHeight: number,
): number {
  const dx = Math.abs(px - centerX) - halfWidth;
  const dy = Math.abs(py - centerY) - halfHeight;
  const outsideX = Math.max(dx, 0);
  const outsideY = Math.max(dy, 0);
  const outsideDistance = Math.sqrt(outsideX * outsideX + outsideY * outsideY);
  const insideDistance = Math.min(Math.max(dx, dy), 0);

  // Positive inside the ink square, negative outside, matching the same
  // sign convention `msdf.frag.glsl` assumes (channel > 0.5 = inside).
  return -(outsideDistance + insideDistance);
}

/**
 * Draws a synthetic, single-channel-replicated MSDF tile for one filled
 * square "glyph" onto an offscreen `<canvas>`, and resolves it as a loaded
 * `HTMLImageElement`. This is a real (if simple) distance field, computed
 * analytically from the square's own geometry - not a placeholder texture -
 * so `msdf.frag.glsl` samples genuine, correctly-saturating distance data
 * from it, exactly like a real `msdf-atlas-gen`-produced atlas. No font
 * file or external MSDF generator is needed (keeping `/e2e` dependent only
 * on `/src`), and R/G/B are set identically since a plain box needs no real
 * multi-channel edge coloring to be unambiguous.
 * @returns The loaded image.
 */
export function createSyntheticMsdfGlyphImage(): Promise<HTMLImageElement> {
  const size = SYNTHETIC_GLYPH_TILE_SIZE;
  const canvas = document.createElement('canvas');

  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available');
  }

  const imageData = context.createImageData(size, size);
  const center = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = boxSignedDistance(
        x + 0.5,
        y + 0.5,
        center,
        center,
        SYNTHETIC_GLYPH_INK_HALF_SIZE,
        SYNTHETIC_GLYPH_INK_HALF_SIZE,
      );

      const channel = Math.max(
        0,
        Math.min(
          255,
          Math.round(
            255 * (0.5 + distance / SYNTHETIC_GLYPH_DISTANCE_RANGE),
          ),
        ),
      );

      const pixelOffset = (y * size + x) * 4;

      imageData.data[pixelOffset] = channel;
      imageData.data[pixelOffset + 1] = channel;
      imageData.data[pixelOffset + 2] = channel;
      imageData.data[pixelOffset + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);

  const image = new Image();

  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('Failed to load generated synthetic MSDF glyph image'));
    image.src = canvas.toDataURL();
  });
}
