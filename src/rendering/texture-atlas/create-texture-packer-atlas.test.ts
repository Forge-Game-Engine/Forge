/* eslint-disable @typescript-eslint/naming-convention */
import { describe, expect, it } from 'vitest';
import type { Texture } from '../texture.js';
import { createAtlasSprite } from '../utilities/create-atlas-sprite.js';
import { createTexturePackerAtlas } from './create-texture-packer-atlas.js';
import {
  parseTexturePackerAtlas,
  type TexturePackerAtlasData,
} from './parse-texture-packer-atlas.js';

const json = (scale: string, size: number): unknown => ({
  frames: {
    hero_idle_0: {
      frame: { x: 2 * size, y: 2 * size, w: 20 * size, h: 30 * size },
      rotated: false,
      trimmed: true,
      spriteSourceSize: {
        x: 6 * size,
        y: 2 * size,
        w: 20 * size,
        h: 30 * size,
      },
      sourceSize: { w: 32 * size, h: 32 * size },
      pivot: { x: 0.5, y: 1 },
    },
  },
  meta: { image: 'hero.png', size: { w: 64 * size, h: 32 * size }, scale },
});

const data: TexturePackerAtlasData = parseTexturePackerAtlas(json('1', 1));

describe('createTexturePackerAtlas', () => {
  it("builds an atlas whose sprite draws the trimmed frame in its untrimmed size, with the file's pivot", () => {
    const texture = { width: 64, height: 32 } as Texture;
    const atlas = createTexturePackerAtlas(texture, data);
    const region = atlas.getRegion('hero_idle_0');
    const sprite = createAtlasSprite(atlas, 'hero_idle_0', {
      pixelsPerUnit: 16,
    });

    expect(atlas.texture).toBe(texture);
    expect(atlas.scale).toBe(1);
    expect(region.uvOffset).toEqual({ x: 2 / 64, y: 2 / 32 });
    expect(region.trimOffset).toEqual({ x: 6 / 32, y: 2 / 32 });
    expect(region.trimScale).toEqual({ x: 20 / 32, y: 30 / 32 });
    expect(sprite.width).toBe(2);
    expect(sprite.height).toBe(2);
    expect(sprite.pivot).toEqual({ x: 0.5, y: 1 });
  });

  it('gives an @2x export the same sprite size as its 1x twin', () => {
    const atlas = createTexturePackerAtlas(
      { width: 128, height: 64 } as Texture,
      parseTexturePackerAtlas(json('2', 2)),
    );
    const sprite = createAtlasSprite(atlas, 'hero_idle_0', {
      pixelsPerUnit: 16,
    });

    expect(atlas.scale).toBe(2);
    expect(atlas.getRegion('hero_idle_0').sourceSize).toEqual({ x: 64, y: 64 });
    expect(sprite.width).toBe(2);
    expect(sprite.height).toBe(2);
  });

  it("throws when the texture isn't the size the file declares, naming both and the image", () => {
    expect(() =>
      createTexturePackerAtlas({ width: 32, height: 32 } as Texture, data),
    ).toThrow(
      'Unable to create a texture atlas from TexturePacker data: its texture is 32x32 texels, but the data\'s image "hero.png" is 64x32 (meta.size). Check that the image and the JSON come from the same export.',
    );
  });

  it('leaves the image name out of the size error when the file has none', () => {
    expect(() =>
      createTexturePackerAtlas({ width: 32, height: 32 } as Texture, {
        ...data,
        imageName: null,
      }),
    ).toThrow("but the data's image is 64x32 (meta.size)");
  });
});
