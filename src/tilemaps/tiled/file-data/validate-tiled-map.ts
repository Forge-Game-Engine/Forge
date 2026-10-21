// Validates a Tiled map (`.tmj`) and object template (`.tj`). Not exported
// from the package.

import {
  FailFile,
  joinJsonPath,
  JsonObject,
  readBooleanField,
  readEnumField,
  readIntegerField,
  readJsonObject,
  readNumberField,
  readObjectArrayField,
  readOptionalObjectArrayField,
  readOptionalObjectField,
  readOptionalStringField,
  readStringField,
} from './json-reader.js';
import { readTiledObject } from './read-tiled-object.js';
import {
  readOptionalColorField,
  readTiledProperties,
} from './read-tiled-properties.js';
import type {
  TiledLayerFile,
  TiledLayerFileFields,
  TiledMapFile,
  TiledTemplateFile,
  TiledTileBlockFile,
  TiledTileLayerFile,
  TiledTileSetReferenceFile,
} from './tiled-file-data.js';
import { readTiledTileSet } from './validate-tiled-tile-set.js';

/** The most cells a layer or chunk may hold: 64 MiB of packed tiles. */
export const maxTiledBlockCells = 2 ** 24;

/** The most tilesets a map may have: a tile set's source limit. */
const maxTileSets = 256;

/** The largest firstgid, since a gid's top four bits are flags. */
const maxFirstGid = 0x0fff_ffff;

/** The most layers a map or group may have. */
const maxLayers = 65_536;

/** The most objects an object layer may have. */
const maxObjects = 1_000_000;

/** The most chunks an infinite layer may have. */
const maxChunks = 65_536;

/** The deepest group layers may nest. */
const maxGroupDepth = 64;

/** The cell coordinates a tilemap layer stores. */
const minCell = -(2 ** 30);
const maxCell = 2 ** 30 - 1;

const fieldPath = (object: JsonObject, key: string): string =>
  joinJsonPath(object.path, key);

/** What a layer is read with. */
interface LayerContext {
  readonly infinite: boolean;
  readonly depth: number;
}

const readBase64Data = (block: JsonObject): string => {
  const { data } = block.fields;

  if (typeof data !== 'string') {
    return block.fail(
      `${fieldPath(block, 'data')} must be a base64 string, since the layer's encoding is "base64".`,
    );
  }

  return data;
};

const readCsvData = (block: JsonObject): readonly unknown[] => {
  const { data } = block.fields;

  if (!Array.isArray(data)) {
    return block.fail(
      `${fieldPath(block, 'data')} must be an array of gids, since the layer's encoding is "csv".`,
    );
  }

  // Each entry is checked once the layer is decoded, so the array isn't
  // walked twice.
  const gids: readonly unknown[] = data;

  return gids;
};

const readBlockData = (
  block: JsonObject,
  encoding: TiledTileLayerFile['encoding'],
): TiledTileBlockFile['data'] =>
  encoding === 'base64' ? readBase64Data(block) : readCsvData(block);

const assertBlockSize = (block: JsonObject, cells: number): void => {
  if (cells > maxTiledBlockCells) {
    block.fail(
      `${block.path} has ${cells} cells, and a layer or chunk can have at most ${maxTiledBlockCells}.`,
    );
  }
};

const readChunk = (
  chunk: JsonObject,
  encoding: TiledTileLayerFile['encoding'],
): TiledTileBlockFile => {
  const x = readIntegerField(chunk, 'x', {
    minimum: minCell,
    maximum: maxCell,
  });
  const y = readIntegerField(chunk, 'y', {
    minimum: minCell,
    maximum: maxCell,
  });
  const width = readIntegerField(chunk, 'width', {
    minimum: 1,
    maximum: maxCell - x + 1,
  });
  const height = readIntegerField(chunk, 'height', {
    minimum: 1,
    maximum: maxCell - y + 1,
  });

  assertBlockSize(chunk, width * height);

  return {
    x,
    y,
    width,
    height,
    data: readBlockData(chunk, encoding),
    path: chunk.path,
  };
};

const readTileLayerBlocks = (
  layer: JsonObject,
  encoding: TiledTileLayerFile['encoding'],
  infinite: boolean,
): TiledTileBlockFile[] => {
  if (infinite) {
    if (layer.fields.data !== undefined) {
      layer.fail(
        `${fieldPath(layer, 'data')} is set, but the map is infinite, so its layers keep their tiles in chunks.`,
      );
    }

    return readObjectArrayField(layer, 'chunks', maxChunks).map((chunk) =>
      readChunk(chunk, encoding),
    );
  }

  if (layer.fields.chunks !== undefined) {
    layer.fail(
      `${fieldPath(layer, 'chunks')} is set, but the map isn't infinite, so its layers keep their tiles in data.`,
    );
  }

  const width = readIntegerField(layer, 'width', {
    minimum: 0,
    maximum: maxCell + 1,
  });
  const height = readIntegerField(layer, 'height', {
    minimum: 0,
    maximum: maxCell + 1,
  });

  assertBlockSize(layer, width * height);

  return [
    {
      x: 0,
      y: 0,
      width,
      height,
      data: readBlockData(layer, encoding),
      path: layer.path,
    },
  ];
};

const readCompression = (
  layer: JsonObject,
): TiledTileLayerFile['compression'] => {
  if (layer.fields.compression === 'zstd') {
    layer.fail(
      `${fieldPath(layer, 'compression')} is "zstd", which browsers can't decompress. Save the map with zlib or gzip compression instead.`,
    );
  }

  return readEnumField(layer, 'compression', ['', 'zlib', 'gzip'], '');
};

const readTileLayer = (
  layer: JsonObject,
  fields: TiledLayerFileFields,
  infinite: boolean,
): TiledTileLayerFile => {
  const encoding = readEnumField(layer, 'encoding', ['csv', 'base64'], 'csv');
  const compression = readCompression(layer);

  if (encoding === 'csv' && compression !== '') {
    layer.fail(
      `${fieldPath(layer, 'compression')} is "${compression}", but only base64 data can be compressed.`,
    );
  }

  return {
    ...fields,
    kind: 'tiles',
    encoding,
    compression,
    blocks: readTileLayerBlocks(layer, encoding, infinite),
  };
};

const readLayerFields = (layer: JsonObject): TiledLayerFileFields => {
  const opacity = readNumberField(layer, 'opacity', 1);

  if (opacity < 0 || opacity > 1) {
    layer.fail(
      `${fieldPath(layer, 'opacity')} must be from 0 to 1, got ${opacity}.`,
    );
  }

  return {
    id: readIntegerField(layer, 'id', { minimum: 0 }),
    name: readStringField(layer, 'name', ''),
    offsetX: readNumberField(layer, 'offsetx', 0),
    offsetY: readNumberField(layer, 'offsety', 0),
    visible: readBooleanField(layer, 'visible', true),
    opacity,
    tintColor: readOptionalColorField(layer, 'tintcolor'),
    properties: readTiledProperties(layer),
    path: layer.path,
  };
};

const readLayer = (
  layer: JsonObject,
  context: LayerContext,
): TiledLayerFile | null => {
  const type = readEnumField(layer, 'type', [
    'tilelayer',
    'objectgroup',
    'imagelayer',
    'group',
  ]);

  // Image layers aren't supported, and leaving one out leaves the rest of
  // the map as it is.
  if (type === 'imagelayer') {
    return null;
  }

  const fields = readLayerFields(layer);

  if (type === 'tilelayer') {
    return readTileLayer(layer, fields, context.infinite);
  }

  if (type === 'objectgroup') {
    return {
      ...fields,
      kind: 'objects',
      objects: readOptionalObjectArrayField(layer, 'objects', maxObjects) ?? [],
    };
  }

  if (context.depth >= maxGroupDepth) {
    layer.fail(
      `${layer.path} is nested ${context.depth} groups deep, and at most ${maxGroupDepth} are supported.`,
    );
  }

  return {
    ...fields,
    kind: 'group',
    layers: readLayers(layer, { ...context, depth: context.depth + 1 }),
  };
};

const readLayers = (
  parent: JsonObject,
  context: LayerContext,
): TiledLayerFile[] =>
  readObjectArrayField(parent, 'layers', maxLayers)
    .map((layer) => readLayer(layer, context))
    .filter((layer) => layer !== null);

const readTileSetReference = (
  tileSet: JsonObject,
  url: string,
): TiledTileSetReferenceFile => {
  const firstGid = readIntegerField(tileSet, 'firstgid', {
    minimum: 1,
    maximum: maxFirstGid,
  });
  const source = readOptionalStringField(tileSet, 'source');

  if (source !== null) {
    return { firstGid, source, tileSet: null };
  }

  return {
    firstGid,
    source,
    tileSet: readTiledTileSet(
      tileSet,
      `tileset ${tileSet.path} embedded in "${url}"`,
    ),
  };
};

const readTileSetReferences = (
  map: JsonObject,
  url: string,
): TiledTileSetReferenceFile[] => {
  const tileSets = readObjectArrayField(map, 'tilesets', maxTileSets);

  if (tileSets.length === 0) {
    map.fail(
      'tilesets is empty. A map needs at least one tileset, even if no layer uses it.',
    );
  }

  const references = tileSets.map((tileSet) =>
    readTileSetReference(tileSet, url),
  );
  const firstGids = new Set<number>();

  references.forEach(({ firstGid }, index) => {
    if (firstGids.has(firstGid)) {
      map.fail(
        `tilesets[${index}].firstgid is ${firstGid}, which another tileset of the map also starts at.`,
      );
    }

    firstGids.add(firstGid);
  });

  return references;
};

const readOrientation = (map: JsonObject): TiledMapFile['orientation'] => {
  const orientation = readStringField(map, 'orientation');

  if (orientation !== 'orthogonal' && orientation !== 'isometric') {
    return map.fail(
      `orientation is "${orientation}", and only "orthogonal" and "isometric" maps can be loaded.`,
    );
  }

  return orientation;
};

/**
 * Validates a `.tmj` map file. Object layers' objects are left as JSON, to
 * be read once their templates have loaded.
 * @param json - The parsed JSON.
 * @param url - The map's URL, for error messages.
 * @returns The map.
 * @throws An error naming the file and field if the map is malformed or
 * uses a feature that isn't supported.
 */
export const validateTiledMapFile = (
  json: unknown,
  url: string,
): TiledMapFile => {
  const fail: FailFile = (reason) => {
    throw new Error(`Invalid Tiled map JSON at "${url}": ${reason}`);
  };

  const map = readJsonObject(json, '', fail);
  const orientation = readOrientation(map);
  const infinite = readBooleanField(map, 'infinite', false);

  return {
    orientation,
    width: readIntegerField(map, 'width', { minimum: 0 }),
    height: readIntegerField(map, 'height', { minimum: 0 }),
    tileWidth: readIntegerField(map, 'tilewidth', { minimum: 1 }),
    tileHeight: readIntegerField(map, 'tileheight', { minimum: 1 }),
    infinite,
    backgroundColor: readOptionalColorField(map, 'backgroundcolor'),
    properties: readTiledProperties(map),
    tileSets: readTileSetReferences(map, url),
    layers: readLayers(map, { infinite, depth: 0 }),
  };
};

/**
 * Validates a `.tj` object template file.
 * @param json - The parsed JSON.
 * @param url - The template's URL, for error messages.
 * @returns The template, its object checked but kept as JSON to merge into
 * its instances.
 * @throws An error naming the file and field if the template is malformed.
 */
export const validateTiledTemplateFile = (
  json: unknown,
  url: string,
): TiledTemplateFile => {
  const fail: FailFile = (reason) => {
    throw new Error(`Invalid Tiled template JSON at "${url}": ${reason}`);
  };

  const template = readJsonObject(json, '', fail);
  const object = readOptionalObjectField(template, 'object');
  const tileSet = readOptionalObjectField(template, 'tileset');

  if (object === null) {
    return fail('object is missing; a template must have an object.');
  }

  if (object.fields.template !== undefined) {
    fail(
      "object.template is set, and a template's object can't use another template.",
    );
  }

  readTiledObject(object, true);

  return {
    tileSet:
      tileSet === null
        ? null
        : {
            firstGid: readIntegerField(tileSet, 'firstgid', {
              minimum: 1,
              maximum: maxFirstGid,
            }),
            source: readStringField(tileSet, 'source'),
          },
    object,
  };
};
