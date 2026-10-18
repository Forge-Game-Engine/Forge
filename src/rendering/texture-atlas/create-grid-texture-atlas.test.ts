import { describe, expect, it } from 'vitest';
import type { Texture } from '../texture.js';
import { isTextureRegionTrimmed } from '../texture-region.js';
import { createGridTextureAtlas } from './create-grid-texture-atlas.js';

const textureOfSize = (width: number, height: number): Texture =>
  ({ width, height }) as Texture;

/** The texel rect of a region, recovered from its UVs. */
const texelRect = (
  atlas: ReturnType<typeof createGridTextureAtlas>,
  index: number,
): { x: number; y: number; width: number; height: number } => {
  const region = atlas.getRegionAt(index);

  return {
    x: Math.round(region.uvOffset.x * atlas.texture.width),
    y: Math.round(region.uvOffset.y * atlas.texture.height),
    width: Math.round(region.uvScale.x * atlas.texture.width),
    height: Math.round(region.uvScale.y * atlas.texture.height),
  };
};

describe('createGridTextureAtlas', () => {
  it('cuts the texture into row-major cells named by index', () => {
    const atlas = createGridTextureAtlas(textureOfSize(64, 32), {
      cellWidth: 16,
      cellHeight: 16,
    });

    expect(atlas.regions).toHaveLength(8);
    expect(atlas.regions.map((region) => region.name)).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
    ]);
    expect(texelRect(atlas, 1)).toEqual({ x: 16, y: 0, width: 16, height: 16 });
    expect(texelRect(atlas, 4)).toEqual({ x: 0, y: 16, width: 16, height: 16 });
    expect(atlas.getRegion('5')).toBe(atlas.getRegionAt(5));
  });

  it('gives each cell an untrimmed region pivoted at its center', () => {
    const atlas = createGridTextureAtlas(textureOfSize(64, 32), {
      cellWidth: 16,
      cellHeight: 16,
    });

    for (const region of atlas.regions) {
      expect(isTextureRegionTrimmed(region)).toBe(false);
      expect(region.sourceSize).toEqual({ x: 16, y: 16 });
      expect(region.pivot).toEqual({ x: 0.5, y: 0.5 });
    }
  });

  it('puts the sixth cell of a 32 x 32 grid with 2 texels of spacing at (68, 34)', () => {
    const atlas = createGridTextureAtlas(textureOfSize(100, 100), {
      cellWidth: 32,
      cellHeight: 32,
      spacing: 2,
    });

    expect(atlas.regions).toHaveLength(9);
    expect(texelRect(atlas, 5)).toEqual({
      x: 68,
      y: 34,
      width: 32,
      height: 32,
    });
  });

  it('starts the cells margin texels from the left and top edges', () => {
    const atlas = createGridTextureAtlas(textureOfSize(37, 27), {
      cellWidth: 8,
      cellHeight: 8,
      spacing: 2,
      margin: 3,
    });

    // floor((37 - 3 + 2) / 10) = 3 columns, floor((27 - 3 + 2) / 10) = 2 rows.
    expect(atlas.regions).toHaveLength(6);
    expect(texelRect(atlas, 0)).toEqual({ x: 3, y: 3, width: 8, height: 8 });
    expect(texelRect(atlas, 2)).toEqual({ x: 23, y: 3, width: 8, height: 8 });
    expect(texelRect(atlas, 3)).toEqual({ x: 3, y: 13, width: 8, height: 8 });
  });

  it('counts a cell that needs no trailing margin or spacing', () => {
    // The last column ends on the texture's right edge.
    const atlas = createGridTextureAtlas(textureOfSize(34, 16), {
      cellWidth: 16,
      cellHeight: 16,
      spacing: 2,
    });

    expect(atlas.regions).toHaveLength(2);
    expect(texelRect(atlas, 1)).toEqual({ x: 18, y: 0, width: 16, height: 16 });
  });

  it('leaves out a partial last column and row', () => {
    const atlas = createGridTextureAtlas(textureOfSize(40, 20), {
      cellWidth: 16,
      cellHeight: 16,
    });

    expect(atlas.regions).toHaveLength(2);
  });

  it('cuts only the given columns and rows', () => {
    const atlas = createGridTextureAtlas(textureOfSize(64, 64), {
      cellWidth: 16,
      cellHeight: 16,
      columns: 2,
      rows: 3,
    });

    expect(atlas.regions).toHaveLength(6);
    expect(texelRect(atlas, 2)).toEqual({ x: 0, y: 16, width: 16, height: 16 });
  });

  it('takes the default for an option passed as undefined', () => {
    const atlas = createGridTextureAtlas(textureOfSize(32, 16), {
      cellWidth: 16,
      cellHeight: 16,
      columns: undefined,
      spacing: undefined,
    });

    expect(atlas.regions).toHaveLength(2);
  });

  it.each([
    ['columns', { columns: 5 }, '5 columns'],
    ['rows', { rows: 5 }, '5 rows'],
  ])('throws for more %s than fit', (_, overrides, message) => {
    expect(() =>
      createGridTextureAtlas(textureOfSize(64, 64), {
        cellWidth: 16,
        cellHeight: 16,
        ...overrides,
      }),
    ).toThrow(
      `${message} don't fit in the texture's 64 texels; at most 4 whole cells do.`,
    );
  });

  it('throws when no whole cell fits', () => {
    expect(() =>
      createGridTextureAtlas(textureOfSize(20, 20), {
        cellWidth: 16,
        cellHeight: 16,
        margin: 8,
      }),
    ).toThrow(
      'no whole 16 x 16 texel cell fits in the 20 x 20 texel texture with a margin of 8',
    );
  });

  it.each([
    ['cellWidth', { cellWidth: 0 }, 'a whole number greater than 0'],
    ['cellHeight', { cellHeight: 1.5 }, 'a whole number greater than 0'],
    ['columns', { columns: 0 }, 'a whole number greater than 0'],
    ['rows', { rows: 2.5 }, 'a whole number greater than 0'],
    ['spacing', { spacing: -1 }, 'a whole number of 0 or more'],
    ['margin', { margin: 0.5 }, 'a whole number of 0 or more'],
  ])('throws for an invalid %s', (field, overrides, requirement) => {
    expect(() =>
      createGridTextureAtlas(textureOfSize(64, 64), {
        cellWidth: 16,
        cellHeight: 16,
        ...overrides,
      }),
    ).toThrow(`its ${field}`);
    expect(() =>
      createGridTextureAtlas(textureOfSize(64, 64), {
        cellWidth: 16,
        cellHeight: 16,
        ...overrides,
      }),
    ).toThrow(requirement);
  });
});
