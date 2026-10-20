import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import type { Geometry } from '../../rendering/geometry/geometry.js';
import type { MeshMaterial } from '../../rendering/materials/mesh-material.js';
import { releaseTilemapChunkMesh } from '../rendering/release-tilemap-chunk-mesh.js';
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
}

/**
 * What `createTilemapRenderEcsSystem` built for one tilemap layer, on the
 * layer entity. The system adds it the first time it updates the layer, and
 * is the only code that writes it: read it, don't write it.
 *
 * Removing it, or removing the layer entity, removes every chunk mesh
 * entity it lists and disposes their geometries; the system builds the
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

  /** The `category` last copied onto every chunk mesh. */
  readonly appliedCategory: number;

  /** The draw-order `layer` last copied onto every chunk mesh. */
  readonly appliedDrawLayer: number;

  /**
   * Every chunk mesh, in the order their entities are among the layer's
   * children: by chunk row, then chunk column, then source index. Chunks
   * in that order draw back to front.
   */
  readonly meshes: readonly TilemapChunkMesh[];

  /** One material per source index that has at least one mesh. */
  readonly materials: ReadonlyMap<number, MeshMaterial>;
}

/**
 * The component key of {@link TilemapRenderStateEcsComponent}. Removing or
 * replacing the state removes the chunk mesh entities it lists and
 * disposes their geometries.
 */
export const tilemapRenderStateId =
  createComponentId<TilemapRenderStateEcsComponent>('tilemapRenderState', {
    onRemove: releaseTilemapRenderState,
  });

/**
 * The state's remove hook: releases every chunk mesh it lists. A function
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
  for (const mesh of state.meshes) {
    releaseTilemapChunkMesh(world, mesh);
  }
}
