// Validates a Tiled tileset, embedded in a map or saved as `.tsj`. Not
// exported from the package.

import {
  FailFile,
  joinJsonPath,
  JsonObject,
  readEnumField,
  readIntegerField,
  readJsonObject,
  readNumberField,
  readOptionalObjectArrayField,
  readOptionalObjectField,
  readStringField,
} from './json-reader.js';
import { readTiledObject } from './read-tiled-object.js';
import { readTiledProperties } from './read-tiled-properties.js';
import type {
  TiledFrameFile,
  TiledObjectAlignment,
  TiledTileFile,
  TiledTileSetFile,
} from './tiled-file-data.js';

/** The most tiles a tileset may have: a tile set source's limit. */
const maxTileCount = 2 ** 20;

/** The most frames a tile's animation may have. */
const maxFrames = 65_536;

/** The most objects a tile's collision group may have. */
const maxCollisionObjects = 1024;

const objectAlignments: readonly TiledObjectAlignment[] = [
  'unspecified',
  'topleft',
  'top',
  'topright',
  'left',
  'center',
  'right',
  'bottomleft',
  'bottom',
  'bottomright',
];

const describeField = (object: JsonObject, key: string): string =>
  joinJsonPath(object.path, key);

const readAnimation = (
  tile: JsonObject,
  tileCount: number,
): TiledFrameFile[] | null => {
  const frames = readOptionalObjectArrayField(tile, 'animation', maxFrames);

  if (frames === null || frames.length === 0) {
    return null;
  }

  return frames.map((frame) => ({
    tileId: readIntegerField(frame, 'tileid', {
      minimum: 0,
      maximum: tileCount - 1,
    }),
    duration: readIntegerField(frame, 'duration', { minimum: 1 }),
  }));
};

const readCollisionObjects = (tile: JsonObject): TiledTileFile['objects'] => {
  const group = readOptionalObjectField(tile, 'objectgroup');

  if (group === null) {
    return null;
  }

  const objects =
    readOptionalObjectArrayField(group, 'objects', maxCollisionObjects) ?? [];

  return objects.map((object) => {
    if (object.fields.template !== undefined) {
      object.fail(
        `${describeField(object, 'template')}: a tile's collision objects can't be template instances. Detach the template in Tiled.`,
      );
    }

    return readTiledObject(object, false);
  });
};

const readTile = (tile: JsonObject, tileCount: number): TiledTileFile => {
  if (tile.fields.image !== undefined) {
    tile.fail(
      `${describeField(tile, 'image')}: a tile with an image of its own belongs to an image collection tileset, which isn't supported. Combine the images into one tileset image.`,
    );
  }

  return {
    id: readIntegerField(tile, 'id', { minimum: 0, maximum: tileCount - 1 }),
    properties: readTiledProperties(tile),
    animation: readAnimation(tile, tileCount),
    objects: readCollisionObjects(tile),
    path: tile.path,
  };
};

const readTiles = (tileSet: JsonObject, tileCount: number): TiledTileFile[] => {
  const ids = new Set<number>();

  return (
    readOptionalObjectArrayField(tileSet, 'tiles', maxTileCount) ?? []
  ).map((entry) => {
    const tile = readTile(entry, tileCount);

    if (ids.has(tile.id)) {
      entry.fail(`${entry.path} repeats tile id ${tile.id}.`);
    }

    ids.add(tile.id);

    return tile;
  });
};

const readGrid = (tileSet: JsonObject): TiledTileSetFile['grid'] => {
  const grid = readOptionalObjectField(tileSet, 'grid');

  if (grid === null) {
    return null;
  }

  return {
    orientation: readEnumField(
      grid,
      'orientation',
      ['orthogonal', 'isometric'],
      'orthogonal',
    ),
    width: readIntegerField(grid, 'width', { minimum: 1 }),
    height: readIntegerField(grid, 'height', { minimum: 1 }),
  };
};

const rejectUnsupportedTileSetFields = (tileSet: JsonObject): void => {
  const where = tileSet.path === '' ? 'the tileset' : tileSet.path;

  if (tileSet.fields.image === undefined) {
    tileSet.fail(
      `${where} has no image, so it's an image collection (one image per tile), which isn't supported. Combine its images into one tileset image.`,
    );
  }

  if (tileSet.fields.transparentcolor !== undefined) {
    tileSet.fail(
      `${describeField(tileSet, 'transparentcolor')} is set, and color-keyed tileset images aren't supported. Give the image an alpha channel instead.`,
    );
  }

  if (tileSet.fields.fillmode === 'preserve-aspect-fit') {
    tileSet.fail(
      `${describeField(tileSet, 'fillmode')} is "preserve-aspect-fit", which isn't supported. Use "stretch".`,
    );
  }
};

/**
 * Reads a tileset's JSON.
 * @param tileSet - The tileset's JSON object: a `.tsj` file's root, or an
 * entry of a map's `tilesets`.
 * @param describe - Where the tileset is, for error messages.
 * @returns The tileset.
 * @throws An error naming the file and field if the tileset is malformed or
 * uses a feature that isn't supported.
 */
export const readTiledTileSet = (
  tileSet: JsonObject,
  describe: string,
): TiledTileSetFile => {
  rejectUnsupportedTileSetFields(tileSet);

  const tileCount = readIntegerField(tileSet, 'tilecount', {
    minimum: 1,
    maximum: maxTileCount,
  });
  const offset = readOptionalObjectField(tileSet, 'tileoffset');

  readEnumField(tileSet, 'fillmode', ['stretch'], 'stretch');

  return {
    name: readStringField(tileSet, 'name', ''),
    image: readStringField(tileSet, 'image'),
    imageWidth: readIntegerField(tileSet, 'imagewidth', { minimum: 1 }),
    imageHeight: readIntegerField(tileSet, 'imageheight', { minimum: 1 }),
    tileWidth: readIntegerField(tileSet, 'tilewidth', { minimum: 1 }),
    tileHeight: readIntegerField(tileSet, 'tileheight', { minimum: 1 }),
    margin: readIntegerField(tileSet, 'margin', { minimum: 0, fallback: 0 }),
    spacing: readIntegerField(tileSet, 'spacing', { minimum: 0, fallback: 0 }),
    columns: readIntegerField(tileSet, 'columns', { minimum: 1 }),
    tileCount,
    tileOffset: {
      x: offset === null ? 0 : readNumberField(offset, 'x', 0),
      y: offset === null ? 0 : readNumberField(offset, 'y', 0),
    },
    grid: readGrid(tileSet),
    objectAlignment: readEnumField(
      tileSet,
      'objectalignment',
      objectAlignments,
      'unspecified',
    ),
    tileRenderSize: readEnumField(
      tileSet,
      'tilerendersize',
      ['tile', 'grid'],
      'tile',
    ),
    properties: readTiledProperties(tileSet),
    tiles: readTiles(tileSet, tileCount),
    describe,
  };
};

/**
 * Validates a `.tsj` tileset file.
 * @param json - The parsed JSON.
 * @param url - The file's URL, for error messages.
 * @returns The tileset.
 * @throws An error naming the file and field if the tileset is malformed or
 * uses a feature that isn't supported.
 */
export const validateTiledTileSetFile = (
  json: unknown,
  url: string,
): TiledTileSetFile => {
  const fail: FailFile = (reason) => {
    throw new Error(`Invalid Tiled tileset JSON at "${url}": ${reason}`);
  };

  return readTiledTileSet(readJsonObject(json, '', fail), `tileset "${url}"`);
};
