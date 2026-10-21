// The subset of Tiled's JSON formats the loader reads, validated and with
// Tiled's defaults filled in. Not exported from the package.

import type { Vector2 } from '../../../math/index.js';
import type { JsonObject } from './json-reader.js';

/** The custom property types the loader reads. `class` properties are left out. */
export type TiledPropertyType =
  'string' | 'int' | 'float' | 'bool' | 'color' | 'file' | 'object';

/** A custom property, as written in its file. */
export interface TiledPropertyFile {
  readonly name: string;
  readonly type: TiledPropertyType;

  /**
   * The value: a string for `string`, `color` (`#AARRGGBB`, `#RRGGBB` or
   * `''`) and `file` (a path relative to the file), a number for `int`,
   * `float` and `object`, a boolean for `bool`.
   */
  readonly value: string | number | boolean;
}

/** Where a tile object's position is on its image. */
export type TiledObjectAlignment =
  | 'unspecified'
  | 'topleft'
  | 'top'
  | 'topright'
  | 'left'
  | 'center'
  | 'right'
  | 'bottomleft'
  | 'bottom'
  | 'bottomright';

/** A text object's text and style. */
export interface TiledTextFile {
  readonly text: string;
  readonly pixelSize: number;
  readonly color: string;
  readonly fontFamily: string;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly wrap: boolean;
  readonly horizontalAlignment: 'left' | 'center' | 'right' | 'justify';
  readonly verticalAlignment: 'top' | 'center' | 'bottom';
}

/** The kinds of object Tiled draws. */
export type TiledObjectShapeKind =
  | 'rectangle'
  | 'ellipse'
  | 'capsule'
  | 'point'
  | 'polygon'
  | 'polyline'
  | 'tile'
  | 'text';

/** An object of an object layer or a tile's collision group. */
export interface TiledObjectFile {
  readonly id: number;
  readonly name: string;

  /** `type`, or `class` in files saved by Tiled 1.9. */
  readonly type: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  /** Clockwise, in degrees. */
  readonly rotation: number;
  readonly visible: boolean;
  readonly kind: TiledObjectShapeKind;

  /** The tile's gid, flip bits included, for a tile object. */
  readonly gid: number | null;

  /** The points of a polygon or polyline, relative to `x`, `y`. */
  readonly points: readonly Readonly<Vector2>[] | null;
  readonly text: TiledTextFile | null;
  readonly properties: readonly TiledPropertyFile[];

  /** The object's JSON path, for error messages. */
  readonly path: string;
}

/** A frame of a tile's animation. */
export interface TiledFrameFile {
  readonly tileId: number;

  /** Milliseconds. */
  readonly duration: number;
}

/** A tile of a tileset that has data of its own. */
export interface TiledTileFile {
  readonly id: number;
  readonly properties: readonly TiledPropertyFile[];
  readonly animation: readonly TiledFrameFile[] | null;

  /** The objects of its collision group, or `null` if it has none. */
  readonly objects: readonly TiledObjectFile[] | null;
  readonly path: string;
}

/** A tileset, embedded in a map or read from a `.tsj` file. */
export interface TiledTileSetFile {
  readonly name: string;

  /** The image's path, relative to the file the tileset is in. */
  readonly image: string;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly margin: number;
  readonly spacing: number;
  readonly columns: number;
  readonly tileCount: number;
  readonly tileOffset: Readonly<Vector2>;

  /** The grid tile collision shapes are drawn on, or `null` for Tiled's default orthogonal one. */
  readonly grid: {
    readonly orientation: 'orthogonal' | 'isometric';
    readonly width: number;
    readonly height: number;
  } | null;
  readonly objectAlignment: TiledObjectAlignment;
  readonly tileRenderSize: 'tile' | 'grid';
  readonly properties: readonly TiledPropertyFile[];
  readonly tiles: readonly TiledTileFile[];

  /** Where the tileset is, for error messages: its file, or the map and its JSON path. */
  readonly describe: string;
}

/** One of a map's tilesets: embedded in the map, or in a `.tsj` file. */
export type TiledTileSetReferenceFile =
  | {
      readonly firstGid: number;
      readonly source: null;

      /** The embedded tileset. */
      readonly tileSet: TiledTileSetFile;
    }
  | {
      readonly firstGid: number;

      /** The `.tsj` file's path, relative to the map. */
      readonly source: string;
      readonly tileSet: null;
    };

/** The fields every layer has. */
export interface TiledLayerFileFields {
  readonly id: number;
  readonly name: string;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly visible: boolean;
  readonly opacity: number;
  readonly tintColor: string | null;
  readonly properties: readonly TiledPropertyFile[];
  readonly path: string;
}

/** A rectangle of gids: a finite layer's data, or one chunk of an infinite one. */
export interface TiledTileBlockFile {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  /** The gids, as a CSV array (checked when it's decoded) or a base64 string. */
  readonly data: readonly unknown[] | string;
  readonly path: string;
}

/** A tile layer. */
export interface TiledTileLayerFile extends TiledLayerFileFields {
  readonly kind: 'tiles';
  readonly encoding: 'csv' | 'base64';
  readonly compression: '' | 'zlib' | 'gzip';
  readonly blocks: readonly TiledTileBlockFile[];
}

/**
 * An object layer. Its objects are read once their templates have loaded,
 * since a template gives an object the fields it doesn't set.
 */
export interface TiledObjectLayerFile extends TiledLayerFileFields {
  readonly kind: 'objects';
  readonly objects: readonly JsonObject[];
}

/** A group layer. */
export interface TiledGroupLayerFile extends TiledLayerFileFields {
  readonly kind: 'group';
  readonly layers: readonly TiledLayerFile[];
}

/** A layer the loader reads. Image layers are left out. */
export type TiledLayerFile =
  TiledTileLayerFile | TiledObjectLayerFile | TiledGroupLayerFile;

/** A map (`.tmj`). */
export interface TiledMapFile {
  readonly orientation: 'orthogonal' | 'isometric';
  readonly width: number;
  readonly height: number;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly infinite: boolean;
  readonly backgroundColor: string | null;
  readonly properties: readonly TiledPropertyFile[];
  readonly tileSets: readonly TiledTileSetReferenceFile[];
  readonly layers: readonly TiledLayerFile[];
}

/** An object template (`.tj`). */
export interface TiledTemplateFile {
  /** The template object's tileset, if it's a tile object. */
  readonly tileSet: {
    readonly firstGid: number;

    /** The `.tsj` file's path, relative to the template. */
    readonly source: string;
  } | null;

  /** The template object's raw fields, merged into each instance. */
  readonly object: JsonObject;
}
