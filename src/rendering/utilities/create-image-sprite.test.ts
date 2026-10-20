import { describe, expect, it } from 'vitest';
import { createImageSprite } from './create-image-sprite';
import { Color } from '../color.js';
import type { Texture } from '../texture.js';
import { fullTextureRegion } from '../texture-region.js';

const texture = { width: 32, height: 32 } as Texture;

describe('createImageSprite', () => {
  it('draws the texture, with every other option at its default', () => {
    const sprite = createImageSprite(texture);

    expect(sprite).toEqual({
      texture,
      width: 0.32,
      height: 0.32,
      pivot: { x: 0.5, y: 0.5 },
      tintColor: Color.white,
      region: fullTextureRegion,
      emissive: null,
      material: null,
      category: 1,
      layer: 0,
      slices: undefined,
    });
  });

  it('returns a fresh pivot on every call', () => {
    expect(createImageSprite(texture).pivot).not.toBe(
      createImageSprite(texture).pivot,
    );
  });

  it('defaults pixelsPerUnit to 100 when omitted', () => {
    const sprite = createImageSprite(texture);

    expect(sprite.width).toBeCloseTo(0.32);
    expect(sprite.height).toBeCloseTo(0.32);
  });

  it('sizes the sprite in world units using pixelsPerUnit when given', () => {
    const sprite = createImageSprite(texture, {
      pixelsPerUnit: 16,
    });

    expect(sprite.width).toBe(2);
    expect(sprite.height).toBe(2);
  });

  it('sizes the sprite directly from its pixel dimensions when pixelsPerUnit is 1', () => {
    const sprite = createImageSprite(texture, {
      pixelsPerUnit: 1,
    });

    expect(sprite.width).toBe(32);
    expect(sprite.height).toBe(32);
  });

  it('defaults an omitted nine-slice native size to the imported world size', () => {
    const sprite = createImageSprite(texture, {
      pixelsPerUnit: 1,
      slices: { left: 8, right: 8, top: 8, bottom: 8 },
    });

    expect(sprite.slices).toEqual({
      left: 8,
      right: 8,
      top: 8,
      bottom: 8,
      nativeWidth: 32,
      nativeHeight: 32,
    });
  });

  it('applies pixelsPerUnit to the default nine-slice native size', () => {
    const sprite = createImageSprite(texture, {
      pixelsPerUnit: 4,
      slices: { left: 1, right: 1, top: 1, bottom: 1 },
    });

    expect(sprite.slices).toMatchObject({ nativeWidth: 8, nativeHeight: 8 });
  });

  it('keeps an explicit nine-slice native size', () => {
    const sprite = createImageSprite(texture, {
      pixelsPerUnit: 1,
      slices: {
        left: 8,
        right: 8,
        top: 8,
        bottom: 8,
        nativeWidth: 96,
        nativeHeight: 64,
      },
    });

    expect(sprite.slices).toMatchObject({ nativeWidth: 96, nativeHeight: 64 });
  });

  it('leaves slices undefined when none are given', () => {
    const sprite = createImageSprite(texture);

    expect(sprite.slices).toBeUndefined();
  });
});
