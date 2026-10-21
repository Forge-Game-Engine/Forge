import { GridLayout, Vector2 } from '../../math/index.js';
import { calculateSignedArea } from '../../physics/colliders/polygon-math.js';
import { TextureAtlas } from '../../rendering/texture-atlas/index.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import {
  collisionSnapSteps,
  describeSnappedShapeProblem,
  snapTileCollisionPolygon,
  tileLocalToCellSpace,
} from '../collision/tile-collision-variant.js';
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
 * A tile's collision shape, in tile-local space: the origin is the center
 * of the cell's footprint (`layout.getCellCenter`), in layer-local units,
 * Y-down. Tile-local space doesn't depend on the tile's image, so a tall
 * isometric wall tile's shape is its base on the floor.
 * - `'cell'`: the cell's whole footprint, a rectangle in an orthogonal
 *   layout and a diamond in an isometric one.
 * - A convex polygon of at least 3 points, inside the footprint: a slope, a
 *   half tile, a wall's base.
 * - `null`: the tile doesn't collide.
 */
export type TileCollisionShape = 'cell' | readonly Readonly<Vector2>[] | null;

/** One frame of a tile's animation (see {@link TileData.animation}). */
export interface TileAnimationFrame {
  /**
   * The index of the tile whose image the frame shows, in the same source
   * as the animated tile. It can be the animated tile itself. Only that
   * tile's image is used: its data, and its own animation, are ignored.
   */
  readonly tile: number;

  /** How long the frame shows, in milliseconds. Positive and finite. */
  readonly durationMilliseconds: number;
}

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

  /**
   * The tile's collision shape (see {@link TileCollisionShape}), which
   * `buildTilemapCollisionLoops` and `createTilemapColliderEcsSystem` merge
   * into a layer's collider. A polygon is stored wound with positive signed
   * area (clockwise on screen), whatever order it was given in. A cell's
   * flip and transpose bits move the shape within the footprint's bounds
   * the way they move the tile's image.
   */
  readonly collision: TileCollisionShape;

  /**
   * The tile's animation, or `null` if it has none, like Tiled's tile
   * animations and the animation frames of Godot's atlas tiles. Every cell
   * holding the tile shows the same frame at the same time, in every layer,
   * chosen from `Time.timeInMilliseconds` (see `getDisplayedTile`): frame
   * `0` starts at time `0` and at every multiple of the frames' total
   * duration. A cell's transform bits apply to every frame. Only the image
   * animates: the cell keeps the placed tile's `textureOrigin`,
   * `ySortOrigin`, `collision` and `properties`, so a frame change never
   * rebuilds a collider.
   */
  readonly animation: readonly TileAnimationFrame[] | null;
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

  /**
   * See {@link TileData.collision}. A polygon is copied. Defaults to
   * `null`: the tile doesn't collide.
   */
  collision?: TileCollisionShape;

  /**
   * See {@link TileData.animation}. Copied. Defaults to `null`: the tile
   * doesn't animate.
   */
  animation?: readonly TileAnimationFrame[] | null;
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

const defaultTileDataOptions: Required<TileDataOptions> = {
  properties: {},
  textureOrigin: { x: 0, y: 0 },
  ySortOrigin: 0,
  collision: null,
  animation: null,
};

/** How far outside the footprint, in cell space, a point still snaps onto its edge. */
const footprintTolerance = 0.5 / collisionSnapSteps;

const describeTransformBits = (bits: number): string => {
  const names = [
    bits & 4 ? 'flip X' : null,
    bits & 2 ? 'flip Y' : null,
    bits & 1 ? 'transpose' : null,
  ].filter((name) => name !== null);

  return names.join(', ');
};

/**
 * Checks a collision polygon and stores it frozen, wound with positive
 * signed area. Every transform of it is snapped and checked exactly as the
 * outline builder will use it, so building an outline never meets a shape
 * it can't merge.
 */
const createCollisionPolygon = (
  polygon: readonly Readonly<Vector2>[],
  layout: GridLayout,
  describeTile: string,
): readonly Readonly<Vector2>[] => {
  const prefix = `Unable to create a tile set: ${describeTile} has a collision polygon`;

  if (polygon.length < 3) {
    throw new Error(
      `${prefix} with ${polygon.length} points, and a polygon needs at least 3.`,
    );
  }

  polygon.forEach((point, index) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new Error(
        `${prefix} whose point ${index} is (${point.x}, ${point.y}), which must be finite.`,
      );
    }

    const cellSpace = tileLocalToCellSpace(layout, point);

    if (
      Math.min(cellSpace.x, cellSpace.y) < -footprintTolerance ||
      Math.max(cellSpace.x, cellSpace.y) > 1 + footprintTolerance
    ) {
      throw new Error(
        `${prefix} whose point ${index}, (${point.x}, ${point.y}), is outside the cell's footprint. A collision polygon is measured from the center of the cell's footprint and must stay inside it.`,
      );
    }
  });

  const points = polygon.map((point) =>
    Object.freeze({ x: point.x, y: point.y }),
  );

  if (calculateSignedArea(points) < 0) {
    points.reverse();
  }

  for (let bits = 0; bits < 8; bits++) {
    const problem = describeSnappedShapeProblem(
      snapTileCollisionPolygon(layout, points, bits),
    );

    if (problem) {
      const transform =
        bits === 0
          ? ''
          : ` when turned by the transform bits ${describeTransformBits(bits)}`;

      throw new Error(
        `${prefix} that ${problem}${transform}, once snapped to 1/${collisionSnapSteps} of a cell. Move its points onto the cell's edge or further inside it.`,
      );
    }
  }

  return Object.freeze(points);
};

/**
 * Checks an animation's frames and stores them frozen.
 * @param animation - The frames.
 * @param tileCount - How many tiles the animated tile's source has.
 * @param describeTile - The animated tile, for error messages.
 * @returns The frames, copied and frozen.
 */
const createTileAnimation = (
  animation: readonly TileAnimationFrame[],
  tileCount: number,
  describeTile: string,
): readonly TileAnimationFrame[] => {
  const prefix = `Unable to create a tile set: ${describeTile}`;

  if (animation.length === 0) {
    throw new Error(
      `${prefix} has an empty animation. Leave animation out, or set it to null, for a tile that doesn't animate.`,
    );
  }

  return Object.freeze(
    animation.map(({ tile, durationMilliseconds }, index) => {
      if (!Number.isInteger(tile) || tile < 0 || tile >= tileCount) {
        throw new Error(
          `${prefix} has an animation whose frame ${index} shows tile ${tile}, but its source has ${tileCount} ${tileCount === 1 ? 'tile' : 'tiles'}, so its tile indices are whole numbers from 0 to ${tileCount - 1}.`,
        );
      }

      if (!Number.isFinite(durationMilliseconds) || durationMilliseconds <= 0) {
        throw new Error(
          `${prefix} has an animation whose frame ${index} lasts ${durationMilliseconds} ms, which must be a positive finite number.`,
        );
      }

      return Object.freeze({ tile, durationMilliseconds });
    }),
  );
};

const createTileData = (
  options: TileDataOptions,
  describeTile: string,
  layout: GridLayout,
  tileCount: number,
): TileData => {
  const { properties, textureOrigin, ySortOrigin, collision, animation } =
    withDefaults(defaultTileDataOptions, options);

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
    collision:
      collision === null || collision === 'cell'
        ? collision
        : createCollisionPolygon(collision, layout, describeTile),
    animation:
      animation === null
        ? null
        : createTileAnimation(animation, tileCount, describeTile),
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
      layout,
      tileCount,
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
 * `textureOrigin`, a `0` `ySortOrigin`, no `collision` and no `animation`)
 * unless the source's `tiles` give it data of its own.
 *
 * A collision polygon is checked against the layout: it must be inside the
 * cell's footprint (a point within `1/131,072` of a cell outside it counts
 * as on its edge), and under each of the eight combinations of transform
 * bits, once its points are snapped to `1/65,536` of a cell, it must be
 * strictly convex and must not cross itself. Snapping merges points that
 * land on the same spot and drops points in the middle of a straight edge.
 * @param options - The layout and the sources.
 * @returns The tile set, frozen along with its sources and tile data.
 * @throws An error if there are no sources or more than `256`, a source's
 * `tileWidth` or `tileHeight` isn't a positive finite number, its atlas has
 * more than `1,048,576` regions, its `tiles` has a key that isn't one of
 * its tile indices, a tile's `textureOrigin` or `ySortOrigin` isn't
 * finite, or a tile's collision polygon has fewer than 3 points, a point
 * that isn't finite or is outside the footprint, or isn't strictly convex
 * or crosses itself under some transform, or a tile's animation is empty,
 * has a frame tile its source doesn't have, or has a frame whose
 * `durationMilliseconds` isn't a positive finite number.
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

  // The default tile has no animation, so no frame is checked against a
  // tile count.
  const defaultTileData = createTileData({}, 'the default tile', layout, 0);

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
