import { GridLayout, Vector2 } from '../../math/index.js';
import { TextureAtlas } from '../../rendering/texture-atlas/index.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import {
  getTileIndex,
  getTileSourceIndex,
  sourceMask,
  tileMask,
} from '../tiles/packed-tile-bits.js';
import { describeTileProblem } from './describe-tile-problem.js';

/** A value of a tile's custom property. */
export type TilePropertyValue = string | number | boolean;

/**
 * What a tile set knows about one tile, beyond its image. Shared by every
 * cell that holds the tile, and frozen. Read it with {@link getTileData}.
 */
export interface TileData {
  /**
   * Custom data, like Tiled's tile properties and Godot's custom data
   * layers: whether a tile is water, how much it slows a walker, which
   * sound a footstep makes.
   */
  readonly properties: Readonly<Record<string, TilePropertyValue>>;

  /**
   * Moves the tile's image from where it would sit, in layer-local units,
   * Y-down: `+Y` moves it down. The image's bottom-left corner sits on the
   * bottom-left corner of the cell footprint's bounds, then moves by this
   * (see `getTileImageRect`).
   *
   * Cells draw back to front when each image starts at the footprint's
   * left edge (`x` is `0`) and doesn't reach below the footprint (`y` is
   * `0` or less). A tile outside those limits, such as a prop that
   * overhangs its cell, may draw in the wrong order against its neighbors
   * in a layer that isn't y-sorted.
   */
  readonly textureOrigin: Readonly<Vector2>;

  /**
   * Where a y-sorted layer sorts the tile against other things: an offset
   * from the center of the cell's footprint, in layer-local units, Y-down.
   */
  readonly ySortOrigin: number;
}

/**
 * The parts of a {@link TileData} to set for one tile. Anything left out
 * takes its default.
 */
export interface TileDataOptions {
  /** The tile's custom data. Copied. Defaults to none. */
  properties?: Readonly<Record<string, TilePropertyValue>>;

  /** See {@link TileData.textureOrigin}. Copied. Defaults to `(0, 0)`. */
  textureOrigin?: Readonly<Vector2>;

  /** See {@link TileData.ySortOrigin}. Defaults to `0`. */
  ySortOrigin?: number;
}

/**
 * One texture atlas of a tile set, whose regions are its tiles. Every tile
 * of a source shares its texture, so a layer's tiles from one source draw
 * in one batch.
 */
export interface TileSetSource {
  /**
   * The atlas the tiles come from. A tile's index is the index of its
   * region in `atlas.regions` (row-major for `createGridTextureAtlas`).
   */
  readonly atlas: TextureAtlas;

  /**
   * The width every tile of this source draws at, in layer-local units,
   * whatever its region's size in texels. A trimmed region draws only its
   * share of it. An image wider than the layout's `cellWidth` may draw in
   * the wrong order against its neighbors in a layer that isn't y-sorted.
   */
  readonly tileWidth: number;

  /**
   * The height every tile of this source draws at, in layer-local units.
   * It can be taller than the cell: the image reaches up from the bottom of
   * the cell's footprint.
   */
  readonly tileHeight: number;

  /**
   * The data of every tile, by tile index: one entry per atlas region.
   * Tiles without data of their own share one default.
   */
  readonly tiles: readonly TileData[];
}

/**
 * Options for one source of {@link createTileSet}.
 */
export interface TileSetSourceOptions {
  /** The atlas whose regions are the source's tiles. */
  atlas: TextureAtlas;

  /**
   * The width every tile draws at, in layer-local units. Defaults to the
   * layout's `cellWidth`.
   */
  tileWidth?: number;

  /**
   * The height every tile draws at, in layer-local units. Defaults to the
   * layout's `cellHeight`.
   */
  tileHeight?: number;

  /**
   * Data for the tiles that have any, keyed by tile index. Defaults to
   * none: every tile gets the default data.
   */
  tiles?: ReadonlyMap<number, TileDataOptions>;
}

/**
 * Options for {@link createTileSet}.
 */
export interface TileSetOptions {
  /**
   * How cells are laid out, from `createOrthogonalGridLayout` or
   * `createIsometricGridLayout`. Every cell conversion of a layer using the
   * tile set goes through it.
   */
  layout: GridLayout;

  /** The tile set's sources, `1` to `256` of them. A tile names its source by index. */
  sources: readonly TileSetSourceOptions[];
}

/**
 * What a tilemap layer's tiles look like and how its cells are laid out,
 * like Godot's `TileSet`. Any number of layers share one. A tile set is
 * frozen: to change it, build another and give it to a layer with
 * `setTileSet`. Create one with {@link createTileSet}.
 */
export interface TileSet {
  /** How cells are laid out. */
  readonly layout: GridLayout;

  /** The sources, by index. */
  readonly sources: readonly TileSetSource[];
}

/** The most sources a tile set can have, since a packed tile holds 8 bits of source. */
const maxSources = sourceMask + 1;

/** The most tiles a source can have, since a packed tile holds 20 bits of tile. */
const maxTilesPerSource = tileMask + 1;

const defaultTileDataOptions = {
  properties: {},
  textureOrigin: { x: 0, y: 0 },
  ySortOrigin: 0,
};

const createTileData = (
  options: TileDataOptions,
  describeTile: string,
): TileData => {
  const { properties, textureOrigin, ySortOrigin } = withDefaults(
    defaultTileDataOptions,
    options,
  );

  if (!Number.isFinite(textureOrigin.x) || !Number.isFinite(textureOrigin.y)) {
    throw new Error(
      `Unable to create a tile set: ${describeTile} has a textureOrigin of (${textureOrigin.x}, ${textureOrigin.y}), which must be finite.`,
    );
  }

  if (!Number.isFinite(ySortOrigin)) {
    throw new Error(
      `Unable to create a tile set: ${describeTile} has a ySortOrigin of ${ySortOrigin}, which must be finite.`,
    );
  }

  return Object.freeze({
    properties: Object.freeze({ ...properties }),
    textureOrigin: Object.freeze({ x: textureOrigin.x, y: textureOrigin.y }),
    ySortOrigin,
  });
};

const assertTileSize = (
  name: 'tileWidth' | 'tileHeight',
  value: number,
  sourceIndex: number,
): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `Unable to create a tile set: source ${sourceIndex} has a ${name} of ${value}, which must be a positive finite number.`,
    );
  }
};

const createSource = (
  options: TileSetSourceOptions,
  sourceIndex: number,
  layout: GridLayout,
  defaultTileData: TileData,
): TileSetSource => {
  // The tile size defaults to the layout's cell size, so the defaults are
  // built per tile set.
  const defaultSourceOptions = {
    tileWidth: layout.cellWidth,
    tileHeight: layout.cellHeight,
    tiles: new Map<number, TileDataOptions>(),
  };
  const { atlas, tileWidth, tileHeight, tiles } = withDefaults(
    defaultSourceOptions,
    options,
  );

  assertTileSize('tileWidth', tileWidth, sourceIndex);
  assertTileSize('tileHeight', tileHeight, sourceIndex);

  const tileCount = atlas.regions.length;

  if (tileCount > maxTilesPerSource) {
    throw new Error(
      `Unable to create a tile set: source ${sourceIndex}'s atlas has ${tileCount} regions, and a source can have at most ${maxTilesPerSource} tiles.`,
    );
  }

  const tileData = new Array<TileData>(tileCount).fill(defaultTileData);

  for (const [tileIndex, dataOptions] of tiles) {
    if (
      !Number.isInteger(tileIndex) ||
      tileIndex < 0 ||
      tileIndex >= tileCount
    ) {
      throw new Error(
        `Unable to create a tile set: source ${sourceIndex} has data for tile ${tileIndex}, but its atlas has ${tileCount} regions, so its tile indices are whole numbers from 0 to ${tileCount - 1}.`,
      );
    }

    tileData[tileIndex] = createTileData(
      dataOptions,
      `tile ${tileIndex} of source ${sourceIndex}`,
    );
  }

  return Object.freeze({
    atlas,
    tileWidth,
    tileHeight,
    tiles: Object.freeze(tileData),
  });
};

/**
 * Creates a {@link TileSet}. Every region of each source's atlas is a tile,
 * with the default {@link TileData} (no properties, a `(0, 0)`
 * `textureOrigin` and a `0` `ySortOrigin`) unless the source's `tiles` give
 * it data of its own.
 * @param options - The layout and the sources.
 * @returns The tile set, frozen along with its sources and tile data.
 * @throws An error if there are no sources or more than `256`, a source's
 * `tileWidth` or `tileHeight` isn't a positive finite number, its atlas has
 * more than `1,048,576` regions, its `tiles` has a key that isn't one of
 * its tile indices, or a tile's `textureOrigin` or `ySortOrigin` isn't
 * finite.
 */
export function createTileSet(options: TileSetOptions): TileSet {
  const { layout, sources } = options;

  if (sources.length === 0) {
    throw new Error(
      'Unable to create a tile set: it must have at least one source.',
    );
  }

  if (sources.length > maxSources) {
    throw new Error(
      `Unable to create a tile set: it has ${sources.length} sources, and a tile set can have at most ${maxSources}.`,
    );
  }

  const defaultTileData = createTileData({}, 'the default tile');

  return Object.freeze({
    layout,
    sources: Object.freeze(
      sources.map((source, index) =>
        createSource(source, index, layout, defaultTileData),
      ),
    ),
  });
}

/**
 * Looks up the {@link TileData} of a tile. Read a cell's data with
 * `getTileData(layer.tileSet, getTile(layer, column, row))`, after checking
 * the cell isn't `emptyTile`.
 * @param tileSet - The tile set the tile belongs to.
 * @param tile - The packed tile.
 * @returns The tile's data.
 * @throws An error if `tile` is `emptyTile` or malformed, or names a source
 * or tile index the tile set doesn't have.
 */
export function getTileData(tileSet: TileSet, tile: number): TileData {
  if (tile === 0) {
    throw new Error(
      'Unable to get the data of a tile: it is the empty tile (0), which has no data. Check for emptyTile first.',
    );
  }

  const problem = describeTileProblem(tileSet, tile);

  if (problem) {
    throw new Error(`Unable to get the data of a tile: ${problem}`);
  }

  return tileSet.sources[getTileSourceIndex(tile)].tiles[getTileIndex(tile)];
}
