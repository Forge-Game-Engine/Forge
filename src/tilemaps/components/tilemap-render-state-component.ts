import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import type { Geometry } from '../../rendering/geometry/geometry.js';
import type { MeshMaterial } from '../../rendering/materials/mesh-material.js';
import {
  releaseTilemapChunkMesh,
  releaseTilemapYSortMesh,
} from '../rendering/release-tilemap-chunk-mesh.js';
import type { TilemapLayerEcsComponent } from './tilemap-layer-component.js';

/**
 * One mesh of a tilemap layer: the tiles of one tileset source in one
 * chunk, drawn by a child entity of the layer entity. Written only by
 * `createTilemapRenderEcsSystem`.
 */
export interface TilemapChunkMesh {
  /** The chunk's column, as in `TilemapChunk.column`. */
  readonly chunkColumn: number;

  /** The chunk's row, as in `TilemapChunk.row`. */
  readonly chunkRow: number;

  /** The index of the tileset source whose tiles the mesh draws. */
  readonly source: number;

  /**
   * The child entity of the layer that draws the mesh, through its
   * `MeshEcsComponent`. It sits at the layer's origin, with the tiles'
   * vertices in the layer's local space.
   */
  readonly entity: number;

  /**
   * The mesh's geometry: two triangles per tile, in row-major cell order.
   * Created by the tilemap render system, and disposed when the system
   * drops the mesh or the render state that lists it is removed.
   */
  readonly geometry: Geometry;

  /** How many tiles (quads) the geometry draws. */
  readonly tileCount: number;

  /**
   * The `a_position` data `geometry` was last updated from. The geometry
   * keeps a reference to it, so it's never shared with another mesh.
   */
  readonly positions: Float32Array;

  /** The `a_texCoord` data `geometry` was last updated from. */
  readonly texCoords: Float32Array;

  /** The `a_texRect` data `geometry` was last updated from. */
  readonly texRects: Float32Array;

  /**
   * The quad index, in the mesh, of each tile with an animation, in the
   * order the mesh writes them (row-major cell order). Empty for a mesh
   * without animated tiles, which the system never rewrites for animation.
   */
  readonly animatedQuads: Uint16Array;

  /**
   * The index, in the chunk's `tiles`, of the cell each of `animatedQuads`
   * draws, in the same order.
   */
  readonly animatedCells: Uint16Array;

  /**
   * The distinct animated tiles among the mesh's tiles, each packed without
   * its transform bits (`packTile({ source, tile })`): cells holding the
   * same tile with different flips show the same frame.
   */
  readonly animatedTiles: readonly number[];
}

/**
 * One sort row of a {@link TilemapYSortMesh}: the source's cells with one
 * sort Y, drawn by one child entity of the layer entity. Written only by
 * `createTilemapRenderEcsSystem`.
 */
export interface TilemapYSortRow {
  /**
   * The row's sort Y, in the layer's local units: the Y of each of its
   * cells' centers (`layout.getCellCenter`) plus its placed tile's
   * `ySortOrigin`. Also its entity's `DrawOrderEcsComponent.ySortOrigin`,
   * so the row sorts there.
   */
  readonly sortY: number;

  /**
   * The child entity of the layer that draws the row, through a
   * `MeshEcsComponent` whose `section` is the row's index in its mesh's
   * `rows`. It sits at the layer's origin, like every row of the layer, so
   * neighboring rows can draw in one call.
   */
  readonly entity: number;
}

/**
 * The tiles of one tileset source in a y-sorted layer (one whose entity's
 * `DrawOrderEcsComponent.ySortChildren` is `true`): one geometry for the
 * whole layer, with one section per sort row, each drawn by an entity of
 * its own. Written only by `createTilemapRenderEcsSystem`.
 */
export interface TilemapYSortMesh {
  /** The index of the tileset source whose tiles the mesh draws. */
  readonly source: number;

  /**
   * The mesh's geometry: two triangles per tile, grouped by sort row in
   * ascending sort Y, each row's cells in row-major order. Section `i`
   * holds `rows[i]`'s tiles. Created by the tilemap render system, and
   * disposed when the system drops the mesh or the render state that lists
   * it is removed.
   */
  readonly geometry: Geometry;

  /** How many tiles (quads) the geometry draws. */
  readonly tileCount: number;

  /**
   * The `a_position` data `geometry` was last updated from. The geometry
   * keeps a reference to it, so it's never shared with another mesh.
   */
  readonly positions: Float32Array;

  /** The `a_texCoord` data `geometry` was last updated from. */
  readonly texCoords: Float32Array;

  /** The `a_texRect` data `geometry` was last updated from. */
  readonly texRects: Float32Array;

  /**
   * The quad pattern `geometry` draws a prefix of, owned by this mesh:
   * 16-bit while the mesh has room for at most 16,384 tiles, else 32-bit.
   */
  readonly indices: Uint16Array | Uint32Array;

  /** The mesh's sort rows, in ascending sort Y. */
  readonly rows: readonly TilemapYSortRow[];

  /**
   * The keys, in the layer's `chunks`, of the chunks that held at least one
   * of the mesh's tiles when it was built.
   */
  readonly chunkKeys: ReadonlySet<number>;

  /**
   * The quad index, in the mesh, of each tile with an animation, in the
   * order the mesh writes them. Empty for a mesh without animated tiles,
   * which the system never rewrites for animation.
   */
  readonly animatedQuads: Uint32Array;

  /**
   * The cell each of `animatedQuads` draws, as a column and a row per quad,
   * in the same order.
   */
  readonly animatedCells: Int32Array;

  /**
   * The distinct animated tiles among the mesh's tiles, each packed without
   * its transform bits, as in {@link TilemapChunkMesh.animatedTiles}.
   */
  readonly animatedTiles: readonly number[];
}

/**
 * What `createTilemapRenderEcsSystem` built for one tilemap layer, on the
 * layer entity. The system adds it the first time it updates the layer, and
 * is the only code that writes it: read it, don't write it.
 *
 * A layer is drawn one of two ways. A layer whose entity's
 * `DrawOrderEcsComponent.ySortChildren` is `true` is y-sorted: its tiles
 * are in `ySortMeshes`, one per source, drawn row by row. Any other layer
 * is in `chunkMeshes`, one per chunk and source. The other list is empty.
 *
 * Removing it, or removing the layer entity, removes every mesh entity it
 * lists and disposes their geometries; the system builds the
 * layer again on its next tick if the layer is still there. The system
 * removes it itself, on its next tick, when the entity has lost its
 * `TilemapLayerEcsComponent` or `PositionEcsComponent`.
 */
export interface TilemapRenderStateEcsComponent {
  /**
   * The layer component the meshes were built from, by identity, or `null`
   * before the first build. A different one on the entity (the layer was
   * replaced) rebuilds everything.
   */
  readonly builtFrom: TilemapLayerEcsComponent | null;

  /** The `version` of `builtFrom` the meshes show; `-1` before the first build. */
  readonly builtVersion: number;

  /** The `category` last copied onto every mesh entity. */
  readonly appliedCategory: number;

  /** The draw-order `layer` last copied onto every mesh entity. */
  readonly appliedDrawLayer: number;

  /**
   * Whether the meshes are y-sorted rows: the layer entity's
   * `DrawOrderEcsComponent.ySortChildren` when they were built. When the
   * flag changes, the system builds the layer again as the other kind on
   * its next tick.
   */
  readonly ySorted: boolean;

  /**
   * Every chunk mesh of a layer that isn't y-sorted, in the order their
   * entities are among the layer's children: by chunk row, then chunk
   * column, then source index. Chunks in that order draw back to front.
   * Empty when `ySorted`.
   */
  readonly chunkMeshes: readonly TilemapChunkMesh[];

  /**
   * One mesh per source that has tiles in a y-sorted layer, by ascending
   * source index. Their row entities are in ascending sort Y, then source,
   * among the layer's children. Empty when not `ySorted`.
   */
  readonly ySortMeshes: readonly TilemapYSortMesh[];

  /** One material per source index that has at least one mesh. */
  readonly materials: ReadonlyMap<number, MeshMaterial>;

  /**
   * The time, in `Time.timeInMilliseconds`, whose animation frames every
   * mesh shows. `null` before the first build, and after the layer
   * component is replaced.
   */
  readonly animationTime: number | null;

  /**
   * The earliest time after `animationTime` at which a tile the meshes hold
   * changes frame, or `Infinity` if they hold no animated tiles. Until
   * `time.timeInMilliseconds` reaches it, the system doesn't look at the
   * layer's animated tiles.
   */
  readonly nextFrameChangeTime: number;
}

/**
 * The component key of {@link TilemapRenderStateEcsComponent}. Removing or
 * replacing the state removes the mesh entities it lists and disposes
 * their geometries.
 */
export const tilemapRenderStateId =
  createComponentId<TilemapRenderStateEcsComponent>('tilemapRenderState', {
    onRemove: releaseTilemapRenderState,
  });

/**
 * The state's remove hook: releases every chunk and y-sort mesh it lists. A function
 * declaration, so it's hoisted above `tilemapRenderStateId`, which names
 * it.
 * @param world - The world the state was removed from.
 * @param _entity - The layer entity.
 * @param state - The removed state.
 */
function releaseTilemapRenderState(
  world: EcsWorld,
  _entity: number,
  state: TilemapRenderStateEcsComponent,
): void {
  for (const mesh of state.chunkMeshes) {
    releaseTilemapChunkMesh(world, mesh);
  }

  for (const mesh of state.ySortMeshes) {
    releaseTilemapYSortMesh(world, mesh);
  }
}
