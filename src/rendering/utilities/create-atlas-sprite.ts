import type { SpriteEcsComponent } from '../components/sprite-component.js';
import type { NineSliceOptions } from '../nine-slice-options.js';
import type { TextureAtlas } from '../texture-atlas/texture-atlas.js';
import { isTextureRegionTrimmed } from '../texture-region.js';
import { buildSpriteOptions } from './build-sprite-options.js';
import { importTexture } from './import-texture.js';

/**
 * Options for {@link createAtlasSprite}.
 */
export interface CreateAtlasSpriteOptions {
  /**
   * How many pixels of the art span one world unit, counted at the art's
   * own size: in an atlas whose `scale` is `2`, two texels make up one art
   * pixel, so the same `pixelsPerUnit` gives the same world size at every
   * export scale. Defaults to `100`, as for `createImageSprite`.
   */
  pixelsPerUnit?: number;

  /**
   * Nine-slice configuration, for a sprite whose corners should stay a
   * fixed size while its edges/center stretch or tile. The insets are in
   * world units at `pixelsPerUnit`, measured against the region's art, and
   * any omitted `nativeWidth`/`nativeHeight` defaults to the region's world
   * size. Only an untrimmed region can be nine-sliced.
   */
  slices?: NineSliceOptions;
}

/**
 * Computes the options of a sprite that draws one region of a texture
 * atlas. The sprite is sized to the region's untrimmed frame
 * (`sourceSize / atlas.scale / pixelsPerUnit`), so a trimmed region draws its share of
 * it, and takes the region's pivot. Does no GL work.
 *
 * The result's `region` is the atlas's region object itself, and its
 * `texture` is the atlas's texture, so sprites from any regions of one
 * atlas draw in one batch when they're consecutive in draw order. The
 * result has every other field at its default, like `createImageSprite`'s;
 * spread it into `addSpriteComponent`, `createPanel` or `createButton` with
 * any overrides.
 * @param atlas - The atlas the region belongs to.
 * @param region - The region's name, or its index in `atlas.regions`.
 * @param options - Optional parameters for creating the sprite.
 * @returns The sprite's options.
 * @throws An error if the atlas has no such region, or `slices` is set and
 * the region is trimmed: nine-slice insets are measured against the
 * untrimmed art.
 */
export function createAtlasSprite(
  atlas: TextureAtlas,
  region: string | number,
  options: CreateAtlasSpriteOptions = {},
): SpriteEcsComponent {
  const { pixelsPerUnit, slices } = options;
  const atlasRegion =
    typeof region === 'number'
      ? atlas.getRegionAt(region)
      : atlas.getRegion(region);

  if (slices && isTextureRegionTrimmed(atlasRegion)) {
    throw new Error(
      `Unable to create a nine-sliced sprite from atlas region "${atlasRegion.name}": the region is trimmed, and nine-slice insets are measured against the untrimmed art. Pack the region untrimmed.`,
    );
  }

  const { worldWidth, worldHeight } = importTexture(atlas.texture, {
    pixelsPerUnit,
    width: atlasRegion.sourceSize.x / atlas.scale,
    height: atlasRegion.sourceSize.y / atlas.scale,
  });

  return buildSpriteOptions(
    atlas.texture,
    atlasRegion,
    worldWidth,
    worldHeight,
    atlasRegion.pivot,
    slices,
  );
}
