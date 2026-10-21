import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Color } from '../../rendering/color.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import { TileSet } from '../tile-set/tile-set.js';

/**
 * The width and height of a {@link TilemapChunk}, in cells. A constant, not
 * an option: renderers and collision bakers rebuild a chunk at a time, and
 * 32 x 32 keeps one chunk's quads inside 16-bit vertex indices.
 */
export const tilemapChunkSize = 32;

/**
 * A square block of a tilemap layer's cells, `tilemapChunkSize` a side.
 * Every field is output, written only by the cell functions (`setTile`,
 * `fillTiles`, ...).
 */
export interface TilemapChunk {
  /**
   * The chunk's column: it holds the cells whose columns are from
   * `column * tilemapChunkSize` to `(column + 1) * tilemapChunkSize - 1`.
   */
  readonly column: number;

  /**
   * The chunk's row: it holds the cells whose rows are from
   * `row * tilemapChunkSize` to `(row + 1) * tilemapChunkSize - 1`.
   */
  readonly row: number;

  /**
   * The chunk's packed tiles, `tilemapChunkSize * tilemapChunkSize` of
   * them, row-major: the cell `(column, row)` is at index
   * `(row - this.row * size) * size + (column - this.column * size)`.
   * Read it; only the cell functions write it, since they keep
   * `tileCount`, `changedAt` and the layer's `version` in step.
   */
  readonly tiles: Uint32Array;

  /**
   * How many of `tiles` aren't empty. Never `0`: the write that empties a
   * chunk removes it from the layer.
   */
  readonly tileCount: number;

  /**
   * The layer's `version` after the last call that changed one of this
   * chunk's cells. A consumer that last processed version `v` of this same
   * layer component rebuilds what it derived from the chunk when
   * `changedAt > v` (see {@link TilemapLayerEcsComponent.version}).
   */
  readonly changedAt: number;
}

/**
 * Fields of {@link TilemapLayerEcsComponent} with no sensible default;
 * callers must always provide these.
 */
export interface TilemapLayerRequiredOptions {
  /**
   * The tile set every cell's tile comes from, which also lays out the
   * cells. Change it with `setTileSet`, which checks every stored tile
   * exists in the new one.
   */
  readonly tileSet: TileSet;
}

/**
 * Fields of {@link TilemapLayerEcsComponent} with a sensible default;
 * callers may omit these. Change them freely.
 */
export interface TilemapLayerDefaultedOptions {
  /**
   * A color every tile's sampled texture color is multiplied by, alpha
   * included, as on a sprite. Defaults to `Color.white`, which leaves the
   * tiles unmodified.
   */
  tintColor: Color;

  /**
   * The render category the layer belongs to, matched against each
   * camera's `cullingMask` to decide which cameras draw it, as on a
   * sprite. Defaults to `1`.
   */
  category: number;

  /**
   * The draw-order layer, relative to sprites, text and meshes drawn by the
   * same camera, as on a sprite: lower layers are drawn first. Defaults to
   * `0`.
   */
  layer: number;
}

/**
 * One layer of a tilemap: a grid of cells, each holding a packed tile, on
 * one entity. The cells are in the entity's local space, laid out by
 * `tileSet.layout` with cell `(0, 0)` at the entity's origin. Columns
 * increase towards `+X` and rows towards `+Y`, down the screen. A map is a
 * root entity whose children are layer entities, ordered by sibling order
 * and `DrawOrderEcsComponent` like anything else.
 *
 * Cells are stored sparsely in chunks, so a layer has no size: any cell
 * from `-2^30` to `2^30 - 1` on each axis can hold a tile. Read and write
 * cells with the cell functions (`setTile`, `getTile`, `fillTiles`, ...),
 * the only code that writes `tileSet`, `chunks`, `version` and the
 * chunks. Add one with {@link addTilemapLayerComponent}.
 * `createTilemapRenderEcsSystem` draws the layer, as one mesh per chunk
 * and tile set source.
 */
export interface TilemapLayerEcsComponent
  extends TilemapLayerRequiredOptions, TilemapLayerDefaultedOptions {
  /**
   * The chunks that hold at least one tile, by an internal key. Read it;
   * only the cell functions add and remove chunks. `forEachTile` visits
   * the tiles in a fixed order.
   */
  readonly chunks: Map<number, TilemapChunk>;

  /**
   * Goes up by one on every call to a cell function that changes at least
   * one cell; the call stamps each chunk it changed with the new value in
   * `changedAt`. A call that changes nothing leaves it alone.
   *
   * This is how code that derives something from the layer (meshes,
   * colliders, a navigation grid) finds what changed. Nothing on the layer
   * is ever cleared, so any number of consumers can each keep track of
   * their own progress without hiding changes from one another. A consumer
   * keeps, in its own component on the layer entity, the layer component it
   * built from (by identity), the `version` it last processed, and what it
   * built per chunk. Each tick:
   *
   * 1. If the entity's `TilemapLayerEcsComponent` isn't the one it
   *    recorded (the first tick, or the layer was replaced by adding the
   *    component again, which starts `version` again at `0`), it removes
   *    everything it built, records the new one, and treats every chunk as
   *    changed.
   * 2. Otherwise, if `version` equals the version it processed, nothing
   *    changed.
   * 3. It rebuilds each chunk whose `changedAt` is greater than the version
   *    it processed, removes what it built for chunks no longer in
   *    `chunks`, and records `version`.
   */
  readonly version: number;
}

/** The component key of {@link TilemapLayerEcsComponent}. */
export const tilemapLayerId =
  createComponentId<TilemapLayerEcsComponent>('tilemapLayer');

/**
 * Attaches an empty {@link TilemapLayerEcsComponent} to `entity`. Give the
 * entity a `PositionEcsComponent` too, which places the layer's cell
 * `(0, 0)`, and optionally a rotation and a scale.
 *
 * Adding it to an entity that already has one replaces that layer with a
 * new, empty one whose `version` starts again at `0`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - The tile set, and optionally the tint, category and
 * draw-order layer.
 * @returns The attached component, to pass to the cell functions.
 */
export function addTilemapLayerComponent(
  world: EcsWorld,
  entity: number,
  options: TilemapLayerRequiredOptions & Partial<TilemapLayerDefaultedOptions>,
): TilemapLayerEcsComponent {
  const defaultTilemapLayerOptions: TilemapLayerDefaultedOptions = {
    tintColor: Color.white,
    category: 1,
    layer: 0,
  };

  const { tileSet, tintColor, category, layer } = withDefaults(
    defaultTilemapLayerOptions,
    options,
  );

  return world.addComponent(entity, tilemapLayerId, {
    tileSet,
    tintColor,
    category,
    layer,
    chunks: new Map(),
    version: 0,
  });
}
