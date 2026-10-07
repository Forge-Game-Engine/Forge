import type { Vector2 } from '../../math/index.js';
import { Color } from '../color.js';
import type { SpriteEcsComponent } from '../components/sprite-component.js';
import {
  NineSliceOptions,
  resolveNineSliceNativeSize,
} from '../nine-slice-options.js';
import type { Texture } from '../texture.js';
import { importTexture } from './import-texture.js';

/**
 * Options for {@link createImageSprite}.
 */
export interface CreateImageSpriteOptions {
  /**
   * The size of a single frame in the texture, in texels, for sprite
   * sheets. The sprite is sized to one frame and its `uvScale` selects one
   * frame's share of the texture. Defaults to the whole texture (a
   * single-frame sprite).
   */
  frameDimensions?: Vector2;

  /**
   * Nine-slice configuration, for a sprite whose corners should stay a
   * fixed size while its edges/center stretch or tile. Omit for a normal,
   * single-quad sprite. Any omitted `nativeWidth`/`nativeHeight` defaults
   * to the texture's world size (its size in texels divided by
   * `pixelsPerUnit`), so the insets should be given in those same units -
   * e.g. with `pixelsPerUnit: 1` (the usual choice for UI sprites, whose
   * insets are in reference pixels), an inset of `8` covers 8 pixels of
   * border art.
   */
  slices?: NineSliceOptions;

  /**
   * How many texels of the texture span one world unit. Defaults to `100`.
   */
  pixelsPerUnit?: number;
}

/**
 * Computes a sprite's options from a texture: its world size from
 * `pixelsPerUnit` (and `frameDimensions`, for a sprite sheet), the share of
 * the texture one frame covers, and nine-slice native sizes. Does no GL
 * work, so any number of sprites can be created from one texture.
 *
 * The result has every other field at its default (no emissive map, the
 * render context's sprite material, category `1`); spread it into
 * `addSpriteComponent` with any overrides. `addSpriteComponent` copies its
 * vectors, so one result can be shared by many sprites.
 * @param texture - The texture the sprite draws.
 * @param options - Optional parameters for creating the sprite.
 * @returns The sprite's options.
 */
export function createImageSprite(
  texture: Texture,
  options: CreateImageSpriteOptions = {},
): SpriteEcsComponent {
  const { frameDimensions, slices, pixelsPerUnit } = options;
  const { worldWidth, worldHeight } = importTexture(texture, {
    pixelsPerUnit,
    width: frameDimensions?.x,
    height: frameDimensions?.y,
  });

  return {
    texture,
    width: worldWidth,
    height: worldHeight,
    pivot: { x: 0.5, y: 0.5 },
    tintColor: Color.white,
    uvOffset: { x: 0, y: 0 },
    uvScale: frameDimensions
      ? {
          x: frameDimensions.x / texture.width,
          y: frameDimensions.y / texture.height,
        }
      : { x: 1, y: 1 },
    emissive: null,
    material: null,
    category: 1,
    layer: 0,
    slices:
      slices && resolveNineSliceNativeSize(slices, worldWidth, worldHeight),
  };
}
