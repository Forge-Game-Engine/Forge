import { describe, expect, it } from 'vitest';
import { createImageSprite } from './create-image-sprite';
import { Color } from '../color.js';
import type { Texture } from '../texture.js';

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
      uvOffset: { x: 0, y: 0 },
      uvScale: { x: 1, y: 1 },
      emissive: null,
      material: null,
      category: 1,
      layer: 0,
      slices: undefined,
    });
  });

  it("sets uvScale to one frame's share of the texture when frameDimensions is given", () => {
    const sprite = createImageSprite({ width: 64, height: 32 } as Texture, {
      frameDimensions: { x: 16, y: 16 },
    });

    expect(sprite.uvScale).toEqual({ x: 0.25, y: 0.5 });
  });

  it('returns fresh vectors on every call', () => {
    expect(createImageSprite(texture).uvScale).not.toBe(
      createImageSprite(texture).uvScale,
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

  it('applies pixelsPerUnit to frameDimensions instead of the full texture size', () => {
    const sprite = createImageSprite(texture, {
      frameDimensions: { x: 16, y: 8 },
      pixelsPerUnit: 4,
    });

    expect(sprite.width).toBe(4);
    expect(sprite.height).toBe(2);
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

  it('applies pixelsPerUnit and frameDimensions to the default nine-slice native size', () => {
    const sprite = createImageSprite(texture, {
      frameDimensions: { x: 16, y: 8 },
      pixelsPerUnit: 4,
      slices: { left: 1, right: 1, top: 1, bottom: 1 },
    });

    expect(sprite.slices).toMatchObject({ nativeWidth: 4, nativeHeight: 2 });
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
