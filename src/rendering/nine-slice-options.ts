/**
 * How a nine-slice region behaves when the sprite is resized: `'stretch'`
 * scales the region's texture to fill the available space, while `'tile'`
 * repeats the region's texture at its native size, rounding the repeat
 * count so tiles fill the available space evenly (no cropped partial
 * tile at the end).
 */
export type SliceScaleMode = 'stretch' | 'tile';

/**
 * Configures nine-slice ("9-patch") scaling for a sprite: the sprite's
 * texture is cut into a 3x3 grid by an inset from each edge, and the four
 * corner regions are drawn at a fixed size while the four edge regions and
 * the center region stretch or tile to fill the sprite's current
 * `width`/`height`. This keeps corner artwork (e.g. a rounded panel border)
 * from distorting when the sprite is resized.
 */
export interface NineSliceOptions {
  /**
   * The width, in the same world units as the sprite's `width`, of the left
   * border inset.
   */
  left: number;

  /**
   * The width, in the same world units as the sprite's `width`, of the
   * right border inset.
   */
  right: number;

  /**
   * The height, in the same world units as the sprite's `height`, of the
   * top border inset.
   */
  top: number;

  /**
   * The height, in the same world units as the sprite's `height`, of the
   * bottom border inset.
   */
  bottom: number;

  /**
   * How the four edge regions (top, bottom, left, right) scale to fill
   * their stretch axis. Defaults to `'stretch'`.
   */
  edgeMode?: SliceScaleMode;

  /**
   * How the center region scales to fill the sprite. Defaults to
   * `'stretch'`.
   */
  centerMode?: SliceScaleMode;

  /**
   * The sprite's original (not-yet-resized) width. Anchors the border
   * insets to the correct texture UV fractions regardless of the sprite's
   * current `width`, and works out how many times an edge/center region
   * repeats when its mode is `'tile'`. Defaults to the sprite's current
   * `width`, so a sprite that's never resized after being sliced tiles as a
   * single, unrepeated region.
   */
  nativeWidth?: number;

  /**
   * The sprite's original (not-yet-resized) height. Anchors the border
   * insets to the correct texture UV fractions regardless of the sprite's
   * current `height`, and works out how many times an edge/center region
   * repeats when its mode is `'tile'`. Defaults to the sprite's current
   * `height`, so a sprite that's never resized after being sliced tiles as a
   * single, unrepeated region.
   */
  nativeHeight?: number;
}
