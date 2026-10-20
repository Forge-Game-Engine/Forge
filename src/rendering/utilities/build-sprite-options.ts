import type { Vector2 } from '../../math/index.js';
import { Color } from '../color.js';
import type { SpriteEcsComponent } from '../components/sprite-component.js';
import {
  type NineSliceOptions,
  resolveNineSliceNativeSize,
} from '../nine-slice-options.js';
import type { Texture } from '../texture.js';
import type { TextureRegion } from '../texture-region.js';

/**
 * Builds the sprite options `createImageSprite` and `createAtlasSprite`
 * return, so their defaults can't drift apart: every field they don't set
 * at its default, a fresh copy of `pivot`, and `slices` with its native
 * size resolved against the sprite's world size.
 * @param texture - The texture the sprite draws.
 * @param region - The part of `texture` the sprite draws.
 * @param worldWidth - The untrimmed frame's width, in world units.
 * @param worldHeight - The untrimmed frame's height, in world units.
 * @param pivot - The sprite's pivot, copied.
 * @param slices - The sprite's nine-slice insets, if any.
 * @returns The sprite's options.
 */
export function buildSpriteOptions(
  texture: Texture,
  region: TextureRegion,
  worldWidth: number,
  worldHeight: number,
  pivot: Readonly<Vector2>,
  slices: NineSliceOptions | undefined,
): SpriteEcsComponent {
  return {
    texture,
    width: worldWidth,
    height: worldHeight,
    pivot: { x: pivot.x, y: pivot.y },
    tintColor: Color.white,
    region,
    emissive: null,
    material: null,
    category: 1,
    layer: 0,
    slices:
      slices && resolveNineSliceNativeSize(slices, worldWidth, worldHeight),
  };
}
