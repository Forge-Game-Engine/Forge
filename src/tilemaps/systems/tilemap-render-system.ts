import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  PositionEcsComponent,
  positionId,
} from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  addMeshComponent,
  meshId,
} from '../../rendering/components/mesh-component.js';
import { Geometry } from '../../rendering/geometry/geometry.js';
import {
  createMeshMaterial,
  MeshMaterial,
} from '../../rendering/materials/mesh-material.js';
import type { RenderContext } from '../../rendering/render-context.js';
import { computeRegionInset } from '../../rendering/utilities/compute-region-inset.js';
import { getChunkKey } from '../cells/chunk-key.js';
import {
  TilemapChunk,
  TilemapLayerEcsComponent,
  tilemapLayerId,
} from '../components/tilemap-layer-component.js';
import {
  TilemapChunkMesh,
  TilemapRenderStateEcsComponent,
  tilemapRenderStateId,
} from '../components/tilemap-render-state-component.js';
import { getQuadIndices, verticesPerTile } from '../rendering/quad-indices.js';
import { releaseTilemapChunkMesh } from '../rendering/release-tilemap-chunk-mesh.js';
import {
  countChunkTilesBySource,
  createTilemapVertexArrays,
  positionSize,
  TilemapVertexArrays,
  writeChunkVertices,
} from '../rendering/write-chunk-vertices.js';

// The vertex attributes `tilemap.vert` reads.
const positionAttribute = 'a_position';
const texCoordAttribute = 'a_texCoord';
const texRectAttribute = 'a_texRect';

/** The state's internal type, whose fields only this system writes. */
type WritableTilemapRenderState = {
  -readonly [
    K in keyof TilemapRenderStateEcsComponent
  ]: TilemapRenderStateEcsComponent[K];
};

/** A chunk mesh's internal type, whose fields only this system writes. */
type WritableTilemapChunkMesh = {
  -readonly [K in keyof TilemapChunkMesh]: TilemapChunkMesh[K];
};

const asWritableState = (
  state: TilemapRenderStateEcsComponent,
): WritableTilemapRenderState => state;

const asWritableMesh = (mesh: TilemapChunkMesh): WritableTilemapChunkMesh =>
  mesh;

/**
 * Creates the system that draws tilemap layers. For every chunk of a layer
 * and every tileset source its tiles use, it builds a mesh of two triangles
 * per tile and draws it through a `MeshEcsComponent` on a child entity of
 * the layer entity, so the render system draws one call per visible
 * (chunk, source), sorted with sprites and text by the layer entity's draw
 * order, and hidden and masked with the layer entity. Chunk entities stay
 * in row-major chunk order among themselves in the layer's children, and
 * each mesh writes its tiles in row-major cell order, so tiles of one
 * source that overlap (isometric walls, tall tiles) draw back to front.
 *
 * Each tick it rebuilds only the chunks whose tiles changed since it last
 * saw the layer, writing an existing mesh's geometry in place with
 * `Geometry.update`, so an edit creates GL objects only for a chunk or
 * source that had no mesh. It copies the layer's `category` and draw
 * `layer` onto its meshes and its `tintColor` onto their materials.
 * It's the only writer of the chunk entities, their meshes and the layer's
 * `TilemapRenderStateEcsComponent`, where it keeps what it built.
 *
 * Register it after the systems that edit tiles, so an edited tile shows on
 * the same frame, and before `createTransformEcsSystem`, so new chunk
 * entities get their world transform in the frame they're created;
 * `createRenderEcsSystem` draws them.
 *
 * Removing a layer entity removes its chunk entities and disposes their
 * geometries; removing its `TilemapLayerEcsComponent` or its
 * `PositionEcsComponent` does the same on the system's next tick. To catch
 * a layer or position removed from a live entity, each tick starts with an
 * `EcsWorld.query` of every render state, which
 * builds new arrays on every call: fine for the few layer entities a game
 * has, but not a pattern for components that many entities carry. Removing
 * this system or stopping the world leaves every layer drawn as it was
 * last built.
 * @param renderContext - The render context the chunk geometries and
 * materials are created in.
 * @returns The tilemap render ECS system.
 */
export const createTilemapRenderEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[TilemapLayerEcsComponent, PositionEcsComponent]> => ({
  name: 'tilemapRender',
  query: [tilemapLayerId, positionId],
  update: (world, { entities, components: [layers] }) => {
    releaseOrphanedStates(world);

    for (let i = 0; i < entities.length; i++) {
      updateLayer(world, renderContext, entities[i], layers[i]);
    }
  },
});

/**
 * Removes the render state of every entity that no longer matches the
 * system's query, whose remove hook then releases its meshes. Removing the
 * entity or the state runs the hook directly; this covers the layer or the
 * position being removed from a live entity.
 */
const releaseOrphanedStates = (world: EcsWorld): void => {
  // Builds new arrays on every call; fine for the handful of layer
  // entities a game has, but don't copy this for components many entities
  // carry.
  const { entities } = world.query([tilemapRenderStateId]);

  for (const entity of entities) {
    if (
      world.getComponent(entity, tilemapLayerId) === null ||
      world.getComponent(entity, positionId) === null
    ) {
      world.removeComponent(entity, tilemapRenderStateId);
    }
  }
};

const getOrAddState = (
  world: EcsWorld,
  entity: number,
  layer: TilemapLayerEcsComponent,
): WritableTilemapRenderState =>
  asWritableState(
    world.getComponent(entity, tilemapRenderStateId) ??
      world.addComponent(entity, tilemapRenderStateId, {
        builtFrom: null,
        builtVersion: -1,
        appliedCategory: layer.category,
        appliedDrawLayer: layer.layer,
        meshes: [],
        materials: new Map(),
      }),
  );

const updateLayer = (
  world: EcsWorld,
  renderContext: RenderContext,
  entity: number,
  layer: TilemapLayerEcsComponent,
): void => {
  const state = getOrAddState(world, entity, layer);

  // The first build, or the layer component was replaced by a new one
  // (whose version starts again at 0): nothing built so far applies.
  if (state.builtFrom !== layer) {
    for (const mesh of state.meshes) {
      releaseTilemapChunkMesh(world, mesh);
    }

    state.builtFrom = layer;
    state.builtVersion = -1;
    state.meshes = [];
    state.materials = new Map();
  }

  if (layer.version !== state.builtVersion) {
    rebuildChangedChunks(world, renderContext, entity, layer, state);
  }

  if (
    layer.category !== state.appliedCategory ||
    layer.layer !== state.appliedDrawLayer
  ) {
    applyCategoryAndLayer(world, layer, state);
  }

  // Written every tick, as `SpriteMaterial` does on every bind: a texture
  // is 0 by 0 (no inset) until its image loads, and `Texture.update` can
  // change its size. These are stored values, uploaded when the material
  // is bound.
  for (const [source, material] of state.materials) {
    const { texture } = layer.tileSet.sources[source].atlas;

    material.setUniform('u_texture', texture);
    material.setUniform('u_regionInset', computeRegionInset(texture));
    material.setColorUniform('u_tint', layer.tintColor);
  }
};

const rebuildChangedChunks = (
  world: EcsWorld,
  renderContext: RenderContext,
  entity: number,
  layer: TilemapLayerEcsComponent,
  state: WritableTilemapRenderState,
): void => {
  const counts = new Uint16Array(layer.tileSet.sources.length);

  for (const chunk of layer.chunks.values()) {
    if (chunk.changedAt > state.builtVersion) {
      countChunkTilesBySource(chunk, counts);
      rebuildChunk(world, renderContext, entity, layer, state, chunk, counts);
    }
  }

  // Meshes of chunks the layer no longer has (emptied, or cleared).
  const kept = state.meshes.filter((mesh) => {
    if (layer.chunks.has(getChunkKey(mesh.chunkColumn, mesh.chunkRow))) {
      return true;
    }

    releaseTilemapChunkMesh(world, mesh);

    return false;
  });

  if (kept.length !== state.meshes.length) {
    state.meshes = kept;
  }

  // Materials of sources no mesh draws any more, which a new tile set
  // might not even have.
  for (const source of state.materials.keys()) {
    if (!state.meshes.some((mesh) => mesh.source === source)) {
      const materials = new Map(state.materials);

      materials.delete(source);
      state.materials = materials;
    }
  }

  state.builtVersion = layer.version;
};

/**
 * Orders chunk meshes as they draw: by chunk row, then chunk column (the
 * row-major chunk key), then source.
 * @returns Negative if `(key, source)` comes before `mesh`, positive if
 * after, `0` if it's the same mesh.
 */
const compareToMesh = (
  key: number,
  source: number,
  mesh: TilemapChunkMesh,
): number =>
  key - getChunkKey(mesh.chunkColumn, mesh.chunkRow) || source - mesh.source;

/**
 * Finds a chunk mesh in the state's sorted list.
 * @returns The mesh's index, or, if there's none, the index it goes at.
 */
const findMeshIndex = (
  meshes: readonly TilemapChunkMesh[],
  key: number,
  source: number,
): { index: number; found: boolean } => {
  let low = 0;
  let high = meshes.length;

  while (low < high) {
    const middle = (low + high) >>> 1;
    const comparison = compareToMesh(key, source, meshes[middle]);

    if (comparison === 0) {
      return { index: middle, found: true };
    }

    if (comparison < 0) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  return { index: low, found: false };
};

const rebuildChunk = (
  world: EcsWorld,
  renderContext: RenderContext,
  entity: number,
  layer: TilemapLayerEcsComponent,
  state: WritableTilemapRenderState,
  chunk: TilemapChunk,
  counts: Uint16Array,
): void => {
  const key = getChunkKey(chunk.column, chunk.row);

  for (let source = 0; source < counts.length; source++) {
    const { index, found } = findMeshIndex(state.meshes, key, source);
    const tileCount = counts[source];

    if (tileCount === 0) {
      if (found) {
        releaseTilemapChunkMesh(world, state.meshes[index]);
        state.meshes = state.meshes.filter((_, i) => i !== index);
      }

      continue;
    }

    const material = getMaterial(renderContext, state, source);

    if (found) {
      updateMesh(world, entity, layer, state, index, chunk, tileCount);

      continue;
    }

    const arrays = createTilemapVertexArrays(tileCount);

    writeChunkVertices(layer.tileSet, chunk, source, arrays);

    const mesh: TilemapChunkMesh = {
      chunkColumn: chunk.column,
      chunkRow: chunk.row,
      source,
      entity: world.createEntity(),
      geometry: createChunkGeometry(renderContext, arrays, tileCount),
      tileCount,
      ...arrays,
    };

    state.meshes = [
      ...state.meshes.slice(0, index),
      mesh,
      ...state.meshes.slice(index),
    ];
    addChunkEntity(world, entity, layer, state.meshes, index, material);
  }
};

const getMaterial = (
  renderContext: RenderContext,
  state: WritableTilemapRenderState,
  source: number,
): MeshMaterial => {
  const existing = state.materials.get(source);

  if (existing) {
    return existing;
  }

  const material = createMeshMaterial(
    renderContext,
    'tilemap.vert',
    'tilemap.frag',
  );

  state.materials = new Map(state.materials).set(source, material);

  return material;
};

const createChunkGeometry = (
  renderContext: RenderContext,
  arrays: TilemapVertexArrays,
  tileCount: number,
): Geometry =>
  new Geometry(renderContext, {
    attributes: [
      { name: positionAttribute, data: arrays.positions, size: 2 },
      { name: texCoordAttribute, data: arrays.texCoords, size: 2 },
      { name: texRectAttribute, data: arrays.texRects, size: 4 },
    ],
    indices: getQuadIndices(tileCount),
  });

/**
 * Rewrites an existing chunk mesh's vertices in place, growing its arrays
 * to the next power of two in tiles when they're too small, and gives it an
 * entity again if game code removed it.
 */
const updateMesh = (
  world: EcsWorld,
  entity: number,
  layer: TilemapLayerEcsComponent,
  state: WritableTilemapRenderState,
  index: number,
  chunk: TilemapChunk,
  tileCount: number,
): void => {
  const mesh = asWritableMesh(state.meshes[index]);
  const material = state.materials.get(mesh.source);

  if (!material) {
    throw new Error(
      `Unable to update the tilemap chunk mesh of source ${mesh.source}: it has no material.`,
    );
  }

  const capacity = mesh.positions.length / (verticesPerTile * positionSize);

  if (tileCount > capacity) {
    Object.assign(
      mesh,
      createTilemapVertexArrays(2 ** Math.ceil(Math.log2(tileCount))),
    );
  }

  writeChunkVertices(layer.tileSet, chunk, mesh.source, mesh);
  mesh.tileCount = tileCount;
  mesh.geometry.update({
    vertexCount: tileCount * verticesPerTile,
    attributes: {
      [positionAttribute]: mesh.positions,
      [texCoordAttribute]: mesh.texCoords,
      [texRectAttribute]: mesh.texRects,
    },
    indices: getQuadIndices(tileCount),
  });

  if (!world.isAlive(mesh.entity)) {
    mesh.entity = world.createEntity();
    addChunkEntity(world, entity, layer, state.meshes, index, material);

    return;
  }

  const meshComponent = world.getComponent(mesh.entity, meshId);

  if (!meshComponent) {
    addMeshComponent(world, mesh.entity, {
      geometry: mesh.geometry,
      material,
      category: layer.category,
      layer: layer.layer,
    });

    return;
  }

  meshComponent.material = material;
};

/**
 * Gives a new chunk mesh's entity its identity transform and mesh, parents
 * it to the layer and places it among the layer's children just in front
 * of the next chunk mesh, or just behind the previous one. Only the order
 * of the system's own entities is relied on: game code may reorder its own
 * children of the layer.
 */
const addChunkEntity = (
  world: EcsWorld,
  layerEntity: number,
  layer: TilemapLayerEcsComponent,
  meshes: readonly TilemapChunkMesh[],
  index: number,
  material: MeshMaterial,
): void => {
  const { entity, geometry } = meshes[index];

  // Identity local transforms: the transform system composes a parent's
  // rotation and scale only into children that have them, and the vertices
  // are already in the layer's local space.
  addPositionComponent(world, entity);
  addRotationComponent(world, entity);
  addScaleComponent(world, entity);
  addMeshComponent(world, entity, {
    geometry,
    material,
    category: layer.category,
    layer: layer.layer,
  });
  world.setParent(entity, layerEntity);
  world.setSiblingIndex(
    entity,
    getSiblingIndexBesideNeighbors(world, layerEntity, meshes, index),
  );
};

const isChildOf = (world: EcsWorld, entity: number, parent: number): boolean =>
  world.isAlive(entity) && world.getParent(entity) === parent;

/**
 * Where the chunk mesh at `index` goes among the layer's children: at the
 * place of the nearest later chunk mesh that's still a child of the layer,
 * so it lands just in front of it, or else just behind the nearest earlier
 * one, or else first.
 */
const getSiblingIndexBesideNeighbors = (
  world: EcsWorld,
  layerEntity: number,
  meshes: readonly TilemapChunkMesh[],
  index: number,
): number => {
  for (let next = index + 1; next < meshes.length; next++) {
    if (isChildOf(world, meshes[next].entity, layerEntity)) {
      return world.getSiblingIndex(meshes[next].entity);
    }
  }

  for (let previous = index - 1; previous >= 0; previous--) {
    if (isChildOf(world, meshes[previous].entity, layerEntity)) {
      return world.getSiblingIndex(meshes[previous].entity) + 1;
    }
  }

  return 0;
};

const applyCategoryAndLayer = (
  world: EcsWorld,
  layer: TilemapLayerEcsComponent,
  state: WritableTilemapRenderState,
): void => {
  for (const { entity } of state.meshes) {
    const mesh = world.getComponent(entity, meshId);

    if (mesh) {
      mesh.category = layer.category;
      mesh.layer = layer.layer;
    }
  }

  state.appliedCategory = layer.category;
  state.appliedDrawLayer = layer.layer;
};
