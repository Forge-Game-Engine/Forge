import type { SpriteEcsComponent } from '../components/sprite-component.js';
import type { NineSliceOptions } from '../nine-slice-options.js';
import type { Texture } from '../texture.js';
import { fullTextureRegion } from '../texture-region.js';
import { buildSpriteOptions } from './build-sprite-options.js';
import { importTexture } from './import-texture.js';

/**
 * Options for {@link createImageSprite}.
 */
export interface CreateImageSpriteOptions {
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
 * Computes the options of a sprite that draws a whole texture: its world
 * size from `pixelsPerUnit`, and nine-slice native sizes. Does no GL work,
 * so any number of sprites can be created from one texture. To draw one
 * frame of a sprite sheet or one image of a packed atlas, make a
 * `TextureAtlas` and use `createAtlasSprite`.
 *
 * The result has every other field at its default (no emissive map, the
 * render context's sprite material, category `1`); spread it into
 * `addSpriteComponent` with any overrides. `addSpriteComponent` copies its
 * `pivot` and `slices` (and its `region` is immutable), so one result can be
 * shared by many sprites.
 * @param texture - The texture the sprite draws.
 * @param options - Optional parameters for creating the sprite.
 * @returns The sprite's options.
 */
export function createImageSprite(
  texture: Texture,
  options: CreateImageSpriteOptions = {},
): SpriteEcsComponent {
  const { slices, pixelsPerUnit } = options;
  const { worldWidth, worldHeight } = importTexture(texture, {
    pixelsPerUnit,
  });

  return buildSpriteOptions(
    texture,
    fullTextureRegion,
    worldWidth,
    worldHeight,
    { x: 0.5, y: 0.5 },
    slices,
  );
}
