import { createOrthogonalGridLayout, GridLayout } from '../../math/index.js';
import { createGridTextureAtlas } from '../../rendering/texture-atlas/index.js';
import type { Texture } from '../../rendering/texture.js';
import {
  createTileSet,
  TileSet,
  TileSetSourceOptions,
} from '../tile-set/tile-set.js';

/**
 * A stand-in for a loaded texture: atlases only read its size.
 * @param width - The width, in texels.
 * @param height - The height, in texels.
 * @returns An object with the texture's size.
 */
export const textureOfSize = (width: number, height: number): Texture =>
  ({ width, height }) as Texture;

/**
 * Builds a source over a grid atlas of 16 x 16 texel cells.
 * @param columns - The atlas's columns.
 * @param rows - The atlas's rows.
 * @param options - Anything else to set on the source.
 * @returns The source's options.
 */
export const createTestSource = (
  columns: number,
  rows: number,
  options: Partial<TileSetSourceOptions> = {},
): TileSetSourceOptions => ({
  atlas: createGridTextureAtlas(textureOfSize(columns * 16, rows * 16), {
    cellWidth: 16,
    cellHeight: 16,
  }),
  ...options,
});

/**
 * Builds a tile set with two sources: source 0 has 4 tiles and source 1
 * has 2.
 * @param layout - The layout. Defaults to an orthogonal 16 x 16 layout.
 * @returns The tile set.
 */
export const createTestTileSet = (
  layout: GridLayout = createOrthogonalGridLayout({
    cellWidth: 16,
    cellHeight: 16,
  }),
): TileSet =>
  createTileSet({
    layout,
    sources: [createTestSource(2, 2), createTestSource(2, 1)],
  });
