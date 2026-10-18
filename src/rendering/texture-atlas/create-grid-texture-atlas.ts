import { withDefaults } from '../../utilities/with-defaults.js';
import type { Texture } from '../texture.js';
import type { AtlasRegionRect } from './atlas-region.js';
import { createTextureAtlas, type TextureAtlas } from './texture-atlas.js';

/**
 * Options for {@link createGridTextureAtlas}. Every value is in texels.
 */
export interface GridTextureAtlasOptions {
  /**
   * The width of one cell, in texels.
   */
  cellWidth: number;

  /**
   * The height of one cell, in texels.
   */
  cellHeight: number;

  /**
   * How many columns of cells to cut. Defaults to as many whole cells as fit
   * across the texture.
   */
  columns?: number;

  /**
   * How many rows of cells to cut. Defaults to as many whole cells as fit
   * down the texture.
   */
  rows?: number;

  /**
   * The gap between neighboring cells, in texels, on both axes. Defaults to
   * `0`.
   */
  spacing?: number;

  /**
   * The gap before the first column and row, from the texture's left and
   * top edges, in texels. Defaults to `0`. A sheet with the same border on
   * its right and bottom edges gives the same cells.
   */
  margin?: number;
}

const defaultGridTextureAtlasOptions = { spacing: 0, margin: 0 };

const describeGrid = 'Unable to create a grid texture atlas';

const validateIntegerOptions = (
  values: Record<string, number | undefined>,
  minimum: number,
): void => {
  for (const [field, value] of Object.entries(values)) {
    if (value !== undefined && (!Number.isInteger(value) || value < minimum)) {
      const requirement =
        minimum > 0
          ? 'a whole number greater than 0'
          : 'a whole number of 0 or more';

      throw new Error(
        `${describeGrid}: its ${field} (${value}) must be ${requirement}.`,
      );
    }
  }
};

const countFittingCells = (
  textureSize: number,
  cellSize: number,
  spacing: number,
  margin: number,
): number =>
  Math.max(
    0,
    Math.floor((textureSize - margin + spacing) / (cellSize + spacing)),
  );

const validateCountFits = (
  field: string,
  count: number,
  fittingCount: number,
  textureSize: number,
): void => {
  if (count > fittingCount) {
    throw new Error(
      `${describeGrid}: ${count} ${field} don't fit in the texture's ${textureSize} texels; at most ${fittingCount} whole cells do.`,
    );
  }
};

/**
 * Creates a {@link TextureAtlas} that cuts a texture into a uniform grid of
 * cells, such as a sprite sheet or a tileset. Cells are laid out from the
 * top-left corner, `margin` texels in from the left and top edges and
 * `spacing` texels apart, the way Tiled, Godot (`margins`, `separation`) and
 * Bevy (`offset`, `padding`) describe a grid.
 *
 * The regions are in row-major order (left to right, then the next row
 * down), named by index (`'0'`, `'1'`, ...), untrimmed and pivoted at their
 * center, so `getRegionAt(5)` and `getRegion('5')` both return the sixth
 * cell. A partial column or row at the right or bottom edge is left out.
 * @param texture - The texture to cut. Its size is read now.
 * @param options - The cell size, and optionally the number of columns and
 * rows, the spacing and the margin.
 * @returns The atlas.
 * @throws An error if `cellWidth` or `cellHeight` isn't a whole number
 * greater than `0`, `spacing` or `margin` isn't a whole number of `0` or
 * more, a given `columns` or `rows` isn't a whole number greater than `0`
 * or more than fit in the texture, or no whole cell fits.
 */
export function createGridTextureAtlas(
  texture: Texture,
  options: GridTextureAtlasOptions,
): TextureAtlas {
  const { cellWidth, cellHeight, spacing, margin } = withDefaults(
    defaultGridTextureAtlasOptions,
    options,
  );

  validateIntegerOptions(
    { cellWidth, cellHeight, columns: options.columns, rows: options.rows },
    1,
  );
  validateIntegerOptions({ spacing, margin }, 0);

  const fittingColumns = countFittingCells(
    texture.width,
    cellWidth,
    spacing,
    margin,
  );
  const fittingRows = countFittingCells(
    texture.height,
    cellHeight,
    spacing,
    margin,
  );

  if (fittingColumns === 0 || fittingRows === 0) {
    throw new Error(
      `${describeGrid}: no whole ${cellWidth} x ${cellHeight} texel cell fits in the ${texture.width} x ${texture.height} texel texture with a margin of ${margin}.`,
    );
  }

  // The counts default to what fits, so their defaults depend on the texture.
  const defaultGridCounts = { columns: fittingColumns, rows: fittingRows };
  const { columns, rows } = withDefaults(defaultGridCounts, options);

  validateCountFits('columns', columns, fittingColumns, texture.width);
  validateCountFits('rows', rows, fittingRows, texture.height);

  const rects: AtlasRegionRect[] = [];

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      rects.push({
        name: String(rects.length),
        x: margin + column * (cellWidth + spacing),
        y: margin + row * (cellHeight + spacing),
        width: cellWidth,
        height: cellHeight,
      });
    }
  }

  return createTextureAtlas(texture, rects);
}
