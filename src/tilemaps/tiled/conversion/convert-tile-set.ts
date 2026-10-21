// Converts Tiled tilesets to tile set sources. Not exported from the
// package.

import type { GridLayout, Vector2 } from '../../../math/index.js';
import {
  createGridTextureAtlas,
  type TextureAtlas,
} from '../../../rendering/texture-atlas/index.js';
import type { Texture } from '../../../rendering/texture.js';
import type {
  TileDataOptions,
  TileSetSourceOptions,
} from '../../tile-set/tile-set.js';
import type { TiledTileSetFile } from '../file-data/tiled-file-data.js';
import type { TiledTileSetInfo } from '../tiled-map.js';
import {
  toTiledProperties,
  toTilePropertyValues,
} from './convert-properties.js';
import { toTileCollisionShape } from './convert-tile-collision.js';
import { worldUnitsPerTiledPixel } from './units.js';

/** A tileset with its image loaded. */
export interface LoadedTiledTileSet {
  /** The tileset. */
  readonly file: TiledTileSetFile;

  /** The tileset's image, cut into one region per tile. */
  readonly atlas: TextureAtlas;

  /** The URL of the file the tileset is in: its `.tsj`, or the map. */
  readonly baseUrl: string;

  /** The `.tsj` file's URL, or `null` for a tileset embedded in the map. */
  readonly url: string | null;
}

/** What a map's tilesets are converted with. */
export interface TileSetConversionContext {
  /** The map's layout. */
  readonly layout: GridLayout;

  /** The map's orientation. */
  readonly orientation: 'orthogonal' | 'isometric';

  /** The map's tile width, in Tiled pixels. */
  readonly tileWidth: number;

  /** The map's tile height, in Tiled pixels. */
  readonly tileHeight: number;
}

/**
 * Cuts a tileset's image into its tiles: region `i` is the tile whose id
 * is `i`.
 * @param texture - The tileset's image.
 * @param tileSet - The tileset.
 * @returns The atlas.
 * @throws An error naming the tileset if the image isn't the size the
 * tileset says, or its tiles don't fit in it.
 */
export const createTiledTileSetAtlas = (
  texture: Texture,
  tileSet: TiledTileSetFile,
): TextureAtlas => {
  const { imageWidth, imageHeight, describe } = tileSet;

  if (texture.width !== imageWidth || texture.height !== imageHeight) {
    throw new Error(
      `${describe}'s image "${tileSet.image}" is ${texture.width} x ${texture.height} pixels, but the tileset says it's ${imageWidth} x ${imageHeight}. Open the tileset in Tiled and save it again.`,
    );
  }

  try {
    return createGridTextureAtlas(texture, {
      cellWidth: tileSet.tileWidth,
      cellHeight: tileSet.tileHeight,
      columns: tileSet.columns,
      rows: Math.ceil(tileSet.tileCount / tileSet.columns),
      spacing: tileSet.spacing,
      margin: tileSet.margin,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`${describe}'s tiles don't fit its image: ${message}`, {
      cause: error,
    });
  }
};

const isZero = (vector: Readonly<Vector2>): boolean =>
  vector.x === 0 && vector.y === 0;

/**
 * Converts a tileset to one source of the map's tile set.
 * @param tileSet - The tileset, with its image loaded.
 * @param context - The map's layout and tile size.
 * @returns The source's options.
 * @throws An error naming the tile if one of its collision shapes can't be
 * converted.
 */
export const toTileSetSourceOptions = (
  tileSet: LoadedTiledTileSet,
  context: TileSetConversionContext,
): TileSetSourceOptions => {
  const { file, atlas, baseUrl } = tileSet;
  const drawnSize: Vector2 =
    file.tileRenderSize === 'grid'
      ? {
          x: context.tileWidth * worldUnitsPerTiledPixel,
          y: context.tileHeight * worldUnitsPerTiledPixel,
        }
      : {
          x: file.tileWidth * worldUnitsPerTiledPixel,
          y: file.tileHeight * worldUnitsPerTiledPixel,
        };
  const textureOrigin: Vector2 = {
    x: file.tileOffset.x * worldUnitsPerTiledPixel,
    y: file.tileOffset.y * worldUnitsPerTiledPixel,
  };
  const tiles = new Map<number, TileDataOptions>();

  // A tileset's offset moves every tile, and a source has no offset of its
  // own, so every tile gets data.
  if (!isZero(textureOrigin)) {
    for (let id = 0; id < atlas.regions.length; id++) {
      tiles.set(id, { textureOrigin });
    }
  }

  for (const tile of file.tiles) {
    const describeTile = `tile ${tile.id} of ${file.describe}`;

    tiles.set(tile.id, {
      properties: toTilePropertyValues(tile.properties, baseUrl),
      textureOrigin,
      collision: toTileCollisionShape(tile.objects, {
        layout: context.layout,
        mapOrientation: context.orientation,
        mapTileWidth: context.tileWidth,
        mapTileHeight: context.tileHeight,
        tileSet: file,
        drawnSize,
        textureOrigin,
        describeTile,
      }),
      animation:
        tile.animation?.map((frame) => ({
          tile: frame.tileId,
          durationMilliseconds: frame.duration,
        })) ?? null,
    });
  }

  return { atlas, tileWidth: drawnSize.x, tileHeight: drawnSize.y, tiles };
};

/**
 * Describes a tileset for the game.
 * @param tileSet - The tileset, with its image loaded.
 * @param firstGid - The tileset's first gid in the map.
 * @returns What the map says about the tileset, frozen.
 */
export const toTiledTileSetInfo = (
  tileSet: LoadedTiledTileSet,
  firstGid: number,
): TiledTileSetInfo =>
  Object.freeze({
    name: tileSet.file.name,
    firstGid,
    tileCount: tileSet.file.tileCount,
    url: tileSet.url,
    properties: toTiledProperties(tileSet.file.properties, tileSet.baseUrl),
  });
