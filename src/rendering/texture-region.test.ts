import { describe, expect, it } from 'vitest';
import {
  createTextureRegion,
  fullTextureRegion,
  isTextureRegionTrimmed,
} from './texture-region.js';

describe('createTextureRegion', () => {
  it('builds an untrimmed region when no trim is given', () => {
    const region = createTextureRegion(
      { x: 0.25, y: 0.5 },
      { x: 0.25, y: 0.5 },
    );

    expect(region).toEqual({
      uvOffset: { x: 0.25, y: 0.5 },
      uvScale: { x: 0.25, y: 0.5 },
      trimOffset: { x: 0, y: 0 },
      trimScale: { x: 1, y: 1 },
    });
  });

  it('keeps the trim it is given', () => {
    const region = createTextureRegion(
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { offset: { x: 0.1, y: 0.2 }, scale: { x: 0.6, y: 0.7 } },
    );

    expect(region.trimOffset).toEqual({ x: 0.1, y: 0.2 });
    expect(region.trimScale).toEqual({ x: 0.6, y: 0.7 });
  });

  it('freezes the region and copies its vectors', () => {
    const uvOffset = { x: 0.25, y: 0 };
    const region = createTextureRegion(uvOffset, { x: 0.25, y: 1 });

    uvOffset.x = 0.75;

    expect(region.uvOffset.x).toBe(0.25);
    expect(Object.isFrozen(region)).toBe(true);
    expect(Object.isFrozen(region.uvOffset)).toBe(true);
    expect(Object.isFrozen(region.uvScale)).toBe(true);
    expect(Object.isFrozen(region.trimOffset)).toBe(true);
    expect(Object.isFrozen(region.trimScale)).toBe(true);
  });

  it('allows a UV rect outside 0 to 1, for repeating textures', () => {
    expect(() =>
      createTextureRegion({ x: 0.7, y: -0.3 }, { x: 2, y: 3 }),
    ).not.toThrow();
  });

  it('allows a rounding error past the edge of the frame', () => {
    expect(() =>
      createTextureRegion(
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { offset: { x: 2 / 3, y: 0 }, scale: { x: 1 / 3 + 1e-9, y: 1 } },
      ),
    ).not.toThrow();
  });

  it.each([
    { name: 'a non-finite UV offset', uvOffset: { x: NaN, y: 0 } },
    { name: 'an infinite UV scale', uvScale: { x: Infinity, y: 1 } },
    { name: 'a zero UV scale', uvScale: { x: 0, y: 1 } },
    { name: 'a negative UV scale', uvScale: { x: 1, y: -1 } },
    {
      name: 'a non-finite trim offset',
      trim: { offset: { x: 0, y: NaN }, scale: { x: 1, y: 1 } },
    },
    {
      name: 'a zero trim scale',
      trim: { offset: { x: 0, y: 0 }, scale: { x: 0, y: 1 } },
    },
    {
      name: 'a trim rect starting before the frame',
      trim: { offset: { x: -0.1, y: 0 }, scale: { x: 0.5, y: 1 } },
    },
    {
      name: 'a trim rect ending past the frame',
      trim: { offset: { x: 0, y: 0.6 }, scale: { x: 1, y: 0.5 } },
    },
  ])(
    'throws for $name',
    ({ uvOffset = { x: 0, y: 0 }, uvScale = { x: 1, y: 1 }, trim }) => {
      expect(() => createTextureRegion(uvOffset, uvScale, trim)).toThrow(
        /Unable to create a texture region/,
      );
    },
  );
});

describe('fullTextureRegion', () => {
  it('is the whole texture, untrimmed and frozen', () => {
    expect(fullTextureRegion).toEqual({
      uvOffset: { x: 0, y: 0 },
      uvScale: { x: 1, y: 1 },
      trimOffset: { x: 0, y: 0 },
      trimScale: { x: 1, y: 1 },
    });
    expect(Object.isFrozen(fullTextureRegion)).toBe(true);
  });
});

describe('isTextureRegionTrimmed', () => {
  it('is false for an untrimmed region', () => {
    expect(isTextureRegionTrimmed(fullTextureRegion)).toBe(false);
  });

  it('is true for a trimmed region', () => {
    const region = createTextureRegion(
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { offset: { x: 0, y: 0 }, scale: { x: 1, y: 0.5 } },
    );

    expect(isTextureRegionTrimmed(region)).toBe(true);
  });

  it('is false for a trim scale within rounding error of 1', () => {
    const region = createTextureRegion(
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { offset: { x: 0, y: 0 }, scale: { x: 1 + 1e-9, y: 1 - 1e-9 } },
    );

    expect(isTextureRegionTrimmed(region)).toBe(false);
  });
});
