import { withDefaults } from '../utilities/with-defaults.js';
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
   * The width, in the same world units as the insets, that the sprite's
   * texture rect was authored at. Anchors the border insets to the correct
   * texture UV fractions regardless of the sprite's current `width` (the
   * left border samples `left / nativeWidth` of the texture rect), and works
   * out how many times an edge/center region repeats when its mode is
   * `'tile'`.
   *
   * When omitted, it's captured once from the sprite's size at the moment
   * it's created by `createImageSprite` (the imported texture's world width)
   * or attached by `addSpriteComponent` - never from its later, possibly
   * resized `width`. A sprite resized by a layout system (every
   * `@forge-game-engine/forge/ui` element) or by game code therefore keeps
   * sampling the same border art no matter how large it's drawn. Set it
   * explicitly only when that captured size isn't the size the insets were
   * authored against, for example a sprite that was already resized before
   * being sliced.
   */
  nativeWidth?: number;

  /**
   * The height, in the same world units as the insets, that the sprite's
   * texture rect was authored at. The vertical counterpart of
   * `nativeWidth`, captured the same way when omitted.
   */
  nativeHeight?: number;
}

/**
 * Returns a copy of `slices` with `nativeWidth`/`nativeHeight` filled in
 * from `width`/`height` wherever they're omitted. Called with a sprite's
 * size at the moment it's created or attached, so the native size is pinned
 * to the size the insets were authored against rather than to whatever
 * size the sprite is later resized to.
 * @param slices - The nine-slice configuration to resolve.
 * @param width - The width to use when `slices.nativeWidth` is omitted.
 * @param height - The height to use when `slices.nativeHeight` is omitted.
 * @returns A new `NineSliceOptions` with both native dimensions set.
 */
export function resolveNineSliceNativeSize(
  slices: NineSliceOptions,
  width: number,
  height: number,
): NineSliceOptions {
  const defaultNativeSize = { nativeWidth: width, nativeHeight: height };

  return withDefaults(defaultNativeSize, slices);
}
