import type { Vector2 } from '../../math/index.js';
import type { Color } from '../../rendering/color.js';
import type { TileSet } from '../tile-set/tile-set.js';

/**
 * A custom property from Tiled, keeping the type it was given in Tiled, so a
 * game can tell an `int` from a `float` and a color from a string.
 */
export type TiledProperty =
  | { readonly type: 'string'; readonly value: string }
  | { readonly type: 'int'; readonly value: number }
  | { readonly type: 'float'; readonly value: number }
  | { readonly type: 'bool'; readonly value: boolean }
  /** `null` for Tiled's empty color. */
  | { readonly type: 'color'; readonly value: Color | null }
  /**
   * An absolute URL, resolved against the file the property is written in,
   * or `''` if no file was chosen. The loader doesn't fetch it.
   */
  | { readonly type: 'file'; readonly value: string }
  /** The id of an object in the map, or `0` for none. */
  | { readonly type: 'object'; readonly value: number };

/**
 * Custom properties by name. Properties of type `class` (Tiled's custom
 * property types) are left out.
 */
export type TiledProperties = Readonly<Record<string, TiledProperty>>;

/** What a map says about one of its tilesets. */
export interface TiledTileSetInfo {
  /** The tileset's name in Tiled. */
  readonly name: string;

  /** The first gid of the tileset in the map. */
  readonly firstGid: number;

  /** How many tiles the tileset has. */
  readonly tileCount: number;

  /** The `.tsj` file's URL, or `null` for a tileset embedded in the map. */
  readonly url: string | null;

  /** The tileset's custom properties. Its tiles' properties are in the tile set's `TileData`. */
  readonly properties: TiledProperties;
}

/** The shape of a {@link TiledObject}, in the object's own frame. */
export type TiledObjectShape =
  /**
   * A rectangle with its top-left corner at the object's position. Only in
   * orthogonal maps: an isometric map's rectangles are `polygon`s.
   */
  | {
      readonly kind: 'rectangle';
      readonly width: number;
      readonly height: number;
    }
  /**
   * An ellipse whose bounding box has its top-left corner at the object's
   * position. Only in orthogonal maps: an isometric map's ellipses are
   * `polygon`s.
   */
  | {
      readonly kind: 'ellipse';
      readonly width: number;
      readonly height: number;
    }
  /**
   * A capsule (a rectangle with round ends on its shorter sides) whose
   * bounding box has its top-left corner at the object's position. Only in
   * orthogonal maps: an isometric map's capsules are `polygon`s.
   */
  | {
      readonly kind: 'capsule';
      readonly width: number;
      readonly height: number;
    }
  /** A point: just the object's position. */
  | { readonly kind: 'point' }
  /** A closed polygon. Its points are relative to the object's position, before rotation. */
  | { readonly kind: 'polygon'; readonly points: readonly Readonly<Vector2>[] }
  /** An open line. Its points are relative to the object's position, before rotation. */
  | { readonly kind: 'polyline'; readonly points: readonly Readonly<Vector2>[] }
  /**
   * A tile drawn as an object.
   */
  | {
      readonly kind: 'tile';

      /** The packed tile, in the map's `tileSet`, with its flip bits. */
      readonly tile: number;

      /** The width Tiled draws the tile at, in world units. */
      readonly width: number;

      /** The height Tiled draws the tile at, in world units. */
      readonly height: number;

      /**
       * The point of the image at the object's position, as a Y-down
       * normalized pivot (`(0, 1)` is the bottom-left corner), the way a
       * sprite takes it. From the tileset's object alignment.
       */
      readonly pivot: Readonly<Vector2>;
    }
  /** A text box with its top-left corner at the object's position, drawn screen-aligned. */
  | {
      readonly kind: 'text';
      readonly text: string;
      readonly width: number;
      readonly height: number;

      /** The font size, in world units. */
      readonly pixelSize: number;
      readonly color: Color;
      readonly fontFamily: string;
      readonly bold: boolean;
      readonly italic: boolean;
      readonly wrap: boolean;
      readonly horizontalAlignment: 'left' | 'center' | 'right' | 'justify';
      readonly verticalAlignment: 'top' | 'center' | 'bottom';
    };

/**
 * An object from one of the map's object layers, as data for the game to
 * turn into entities. Every value is in world units, in map space: the
 * local space of the spawned map's root entity, with the offsets of the
 * object's layer and groups already added.
 *
 * A point `p` of the shape is at `position + rotate(p, rotation)` in map
 * space, the composition the transform system uses for a child.
 */
export interface TiledObject {
  /** The object's id, unique in the map. */
  readonly id: number;

  /** The object's name, or `''`. */
  readonly name: string;

  /** The object's class (`type` in Tiled 1.10 and later, `class` in 1.9), or `''`. */
  readonly type: string;

  /** The object's origin in map space. */
  readonly position: Readonly<Vector2>;

  /** The object's rotation about `position`, in radians, clockwise on screen. */
  readonly rotation: number;

  /** Whether the object is visible in Tiled. */
  readonly visible: boolean;

  /** The object's custom properties, its template's merged in. */
  readonly properties: TiledProperties;

  /** The object's shape. */
  readonly shape: TiledObjectShape;
}

/** The fields every {@link TiledLayer} has. */
export interface TiledLayerFields {
  /** The layer's id, unique in the map. */
  readonly id: number;

  /** The layer's name. Names aren't unique. */
  readonly name: string;

  /** The names of the layer's groups and its own, joined with `'/'`. */
  readonly path: string;

  /** The layer's offset from its group (or the map), in world units, Y-down. */
  readonly offset: Readonly<Vector2>;

  /** Whether the layer is visible in Tiled. */
  readonly visible: boolean;

  /** The layer's own opacity, from `0` to `1`. */
  readonly opacity: number;

  /** The layer's own tint color, or white. Its opacity isn't folded in. */
  readonly tintColor: Color;

  /** The layer's custom properties. */
  readonly properties: TiledProperties;
}

/**
 * A rectangle of packed tiles: a finite map's whole layer, or one chunk of
 * an infinite map's layer.
 */
export interface TiledTileBlock {
  /** The column of the block's left edge. */
  readonly column: number;

  /** The row of the block's top edge. */
  readonly row: number;

  /** The block's width, in cells. */
  readonly columns: number;

  /** The block's height, in cells. */
  readonly rows: number;

  /**
   * The `columns * rows` packed tiles, in the map's `tileSet`, row-major.
   * Shared by every spawn of the map: read it, never write it.
   */
  readonly tiles: Uint32Array;
}

/** A tile layer. */
export interface TiledTileLayer extends TiledLayerFields {
  readonly kind: 'tiles';

  /** The layer's tiles. */
  readonly blocks: readonly TiledTileBlock[];

  /** Whether any of its tiles has a collision shape. */
  readonly collides: boolean;
}

/** An object layer. */
export interface TiledObjectLayer extends TiledLayerFields {
  readonly kind: 'objects';

  /** The layer's objects, in Tiled's order. */
  readonly objects: readonly TiledObject[];
}

/** A group layer. */
export interface TiledGroupLayer extends TiledLayerFields {
  readonly kind: 'group';

  /** The group's layers, in Tiled's order (first is drawn first). */
  readonly layers: readonly TiledLayer[];
}

/** A layer of a {@link TiledMap}. Image layers are left out. */
export type TiledLayer = TiledTileLayer | TiledObjectLayer | TiledGroupLayer;

/**
 * A Tiled map, loaded by `TiledMapCache` and spawned with `spawnTiledMap`.
 * It's frozen, and shared by every spawn.
 */
export interface TiledMap {
  /** The map's resolved URL. */
  readonly url: string;

  /** The map's orientation in Tiled, which decides `tileSet.layout`. */
  readonly orientation: 'orthogonal' | 'isometric';

  /**
   * The map's tile set: one source per Tiled tileset, in `firstgid` order,
   * laid out by the map's orientation with its tile size as the cell size.
   */
  readonly tileSet: TileSet;

  /** What the map says about each source of `tileSet`, by source index. */
  readonly tileSets: readonly TiledTileSetInfo[];

  /** The map's size in cells, or `null` for an infinite map. */
  readonly size: Readonly<{ columns: number; rows: number }> | null;

  /** The map's background color, or `null` if it has none. */
  readonly backgroundColor: Color | null;

  /** The map's custom properties. */
  readonly properties: TiledProperties;

  /** The top-level layers, in Tiled's order (first is drawn first). */
  readonly layers: readonly TiledLayer[];
}
