// Converts a map's layers: tile layers' gids to packed tiles, and object
// layers' objects to map space. Not exported from the package.

import type { Vector2 } from '../../../math/index.js';
import { Color } from '../../../rendering/color.js';
import { getTileData, type TileSet } from '../../tile-set/tile-set.js';
import { emptyTile } from '../../tiles/packed-tile.js';
import { withoutTransformBits } from '../../tiles/packed-tile-bits.js';
import type { JsonObject } from '../file-data/json-reader.js';
import { readTiledObject } from '../file-data/read-tiled-object.js';
import { readTiledProperties } from '../file-data/read-tiled-properties.js';
import type {
  TiledLayerFile,
  TiledObjectLayerFile,
  TiledTemplateFile,
  TiledTileLayerFile,
} from '../file-data/tiled-file-data.js';
import type {
  TiledLayer,
  TiledLayerFields,
  TiledObject,
  TiledTileBlock,
} from '../tiled-map.js';
import { gidIdMask, type TiledGidConverter } from './convert-gid.js';
import {
  type ObjectConversionContext,
  toTiledObject,
} from './convert-object.js';
import { parseTiledColor, toTiledProperties } from './convert-properties.js';
import { decodeTiledBlockData } from './decode-layer-data.js';
import { worldUnitsPerTiledPixel } from './units.js';

/** A template, loaded. */
export interface LoadedTiledTemplate {
  /** The template's URL. */
  readonly url: string;

  /** The template. */
  readonly file: TiledTemplateFile;
}

/** What a map's layers are converted with. */
export interface LayerConversionContext {
  /** The map's URL. */
  readonly mapUrl: string;

  /** The map's tile set. */
  readonly tileSet: TileSet;

  /** Converts the map's gids. */
  readonly convertGid: TiledGidConverter;

  /** What objects are converted with. */
  readonly objects: ObjectConversionContext;

  /** The map's tilesets' `.tsj` URLs (`null` for embedded ones) and first gids, by source index. */
  readonly tileSetSources: readonly {
    readonly url: string | null;
    readonly firstGid: number;
  }[];

  /** The templates the map's objects use, by resolved URL. */
  readonly templates: ReadonlyMap<string, LoadedTiledTemplate>;
}

/** The flag bits of a gid, above its tile id. */
const gidFlagMask = ~gidIdMask >>> 0;

/**
 * Finds the URLs of every template a map's objects use.
 * @param layers - The map's layers.
 * @param mapUrl - The map's URL.
 * @returns The templates' resolved URLs, each once.
 */
export const findTemplateUrls = (
  layers: readonly TiledLayerFile[],
  mapUrl: string,
): Set<string> => {
  const urls = new Set<string>();

  const visit = (layer: TiledLayerFile): void => {
    if (layer.kind === 'group') {
      layer.layers.forEach(visit);

      return;
    }

    if (layer.kind !== 'objects') {
      return;
    }

    for (const object of layer.objects) {
      const { template } = object.fields;

      if (typeof template === 'string') {
        urls.add(new URL(template, mapUrl).href);
      }
    }
  };

  layers.forEach(visit);

  return urls;
};

/**
 * Finds the map gid of a template's tile, through the map tileset with the
 * same `.tsj` file as the template's tileset.
 */
const toMapGid = (
  template: LoadedTiledTemplate,
  templateGid: number,
  context: LayerConversionContext,
  describe: string,
): number => {
  const { tileSet } = template.file;

  if (tileSet === null) {
    throw new Error(
      `${describe} uses the template "${template.url}", whose tile object has no tileset.`,
    );
  }

  const tileSetUrl = new URL(tileSet.source, template.url).href;
  const mapTileSet = context.tileSetSources.find(
    ({ url }) => url === tileSetUrl,
  );

  if (!mapTileSet) {
    throw new Error(
      `${describe} uses the template "${template.url}", whose tile is from the tileset "${tileSetUrl}", which the map doesn't use. Add the tileset to the map in Tiled.`,
    );
  }

  const tileId = (templateGid & gidIdMask) - tileSet.firstGid;

  return ((templateGid & gidFlagMask) | (mapTileSet.firstGid + tileId)) >>> 0;
};

/** Reads an object, merging in the template it's an instance of. */
const readObject = (
  object: JsonObject,
  offset: Readonly<Vector2>,
  context: LayerConversionContext,
): TiledObject => {
  const templatePath = object.fields.template;
  const instanceProperties = toTiledProperties(
    readTiledProperties(object),
    context.mapUrl,
  );

  if (typeof templatePath !== 'string') {
    const file = readTiledObject(object, false);

    return toTiledObject(
      { file, gid: file.gid, properties: instanceProperties },
      offset,
      context.objects,
    );
  }

  const templateUrl = new URL(templatePath, context.mapUrl).href;
  const template = context.templates.get(templateUrl);

  if (!template) {
    throw new Error(`The template "${templateUrl}" wasn't loaded.`);
  }

  // The instance's fields win, except `properties`, which merge by name.
  const fields: Record<string, unknown> = {
    ...template.file.object.fields,
    ...object.fields,
  };

  delete fields.template;
  delete fields.properties;

  const file = readTiledObject({ ...object, fields }, false);
  const templateGid = template.file.object.fields.gid;
  const gid =
    object.fields.gid === undefined && typeof templateGid === 'number'
      ? toMapGid(template, templateGid, context, `The object ${object.path}`)
      : file.gid;

  return toTiledObject(
    {
      file,
      gid,
      properties: Object.freeze({
        ...toTiledProperties(
          readTiledProperties(template.file.object),
          template.url,
        ),
        ...instanceProperties,
      }),
    },
    offset,
    context.objects,
  );
};

const toBlock = async (
  layer: TiledTileLayerFile,
  index: number,
  path: string,
  context: LayerConversionContext,
): Promise<TiledTileBlock> => {
  const block = layer.blocks[index];
  const describe = `layer "${path}" (${block.path})`;
  const gids = await decodeTiledBlockData(block, layer, describe);
  const tiles = new Uint32Array(gids.length);

  for (let cell = 0; cell < gids.length; cell++) {
    tiles[cell] = context.convertGid(
      gids[cell],
      () =>
        `${describe} at cell (${block.x + (cell % block.width)}, ${block.y + Math.floor(cell / block.width)})`,
    );
  }

  return Object.freeze({
    column: block.x,
    row: block.y,
    columns: block.width,
    rows: block.height,
    tiles,
  });
};

const hasCollisionTile = (
  blocks: readonly TiledTileBlock[],
  tileSet: TileSet,
): boolean => {
  const checked = new Set<number>();

  return blocks.some(({ tiles }) =>
    tiles.some((tile) => {
      const key = withoutTransformBits(tile);

      if (tile === emptyTile || checked.has(key)) {
        return false;
      }

      checked.add(key);

      return getTileData(tileSet, tile).collision !== null;
    }),
  );
};

const convertObjectLayer = (
  layer: TiledObjectLayerFile,
  offset: Readonly<Vector2>,
  context: LayerConversionContext,
): readonly TiledObject[] =>
  Object.freeze(
    layer.objects.map((object) => readObject(object, offset, context)),
  );

const convertLayer = async (
  layer: TiledLayerFile,
  parentPath: string,
  parentOffset: Readonly<Vector2>,
  context: LayerConversionContext,
): Promise<TiledLayer> => {
  const path = parentPath === '' ? layer.name : `${parentPath}/${layer.name}`;
  const offset = Object.freeze({
    x: layer.offsetX * worldUnitsPerTiledPixel,
    y: layer.offsetY * worldUnitsPerTiledPixel,
  });
  const mapOffset = {
    x: parentOffset.x + offset.x,
    y: parentOffset.y + offset.y,
  };
  const fields: TiledLayerFields = {
    id: layer.id,
    name: layer.name,
    path,
    offset,
    visible: layer.visible,
    opacity: layer.opacity,
    tintColor: parseTiledColor(layer.tintColor ?? '') ?? Color.white,
    properties: toTiledProperties(layer.properties, context.mapUrl),
  };

  if (layer.kind === 'tiles') {
    const blocks = Object.freeze(
      await Promise.all(
        layer.blocks.map((_, index) => toBlock(layer, index, path, context)),
      ),
    );

    return Object.freeze({
      ...fields,
      kind: 'tiles',
      blocks,
      collides: hasCollisionTile(blocks, context.tileSet),
    });
  }

  if (layer.kind === 'objects') {
    return Object.freeze({
      ...fields,
      kind: 'objects',
      objects: convertObjectLayer(layer, mapOffset, context),
    });
  }

  return Object.freeze({
    ...fields,
    kind: 'group',
    layers: await convertTiledLayers(layer.layers, path, mapOffset, context),
  });
};

/**
 * Converts layers, and the layers of their groups.
 * @param layers - The layers.
 * @param parentPath - The path of their group, or `''` at the top.
 * @param parentOffset - The offsets of their groups, added up, in world
 * units.
 * @param context - The map's tile set, gid converter and templates.
 * @returns The layers, frozen.
 * @throws An error naming the layer and cell or object if a layer's data,
 * a gid or an object can't be converted.
 */
export const convertTiledLayers = async (
  layers: readonly TiledLayerFile[],
  parentPath: string,
  parentOffset: Readonly<Vector2>,
  context: LayerConversionContext,
): Promise<readonly TiledLayer[]> =>
  Object.freeze(
    await Promise.all(
      layers.map((layer) =>
        convertLayer(layer, parentPath, parentOffset, context),
      ),
    ),
  );
