import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  PositionEcsComponent,
  positionId,
  Time,
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
  writeAnimatedQuads,
  writeChunkVertices,
} from '../rendering/write-chunk-vertices.js';
import { getTileData, TileAnimationFrame } from '../tile-set/tile-set.js';
import {
  getFrameIndexAt,
  getNextFrameChangeTime,
} from '../tiles/tile-animation-timing.js';

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

/** The layer a tick is rebuilding chunks of, and the time it shows. */
interface LayerBuild {
  readonly layer: TilemapLayerEcsComponent;
  readonly state: WritableTilemapRenderState;
  /** The time whose animation frames the rebuilt meshes show. */
  readonly now: number;
}

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
 *
 * Animated tiles (`TileData.animation`) show their frame at
 * `time.timeInMilliseconds`, so every cell of a tile, in every layer, shows
 * the same frame, and a `timeScale` of `0` pauses them. Each mesh records
 * which of its quads hold animated tiles. On a tick where an animated
 * tile's frame changes, the system rewrites only those quads, in only the
 * meshes that hold that tile, and uploads them with `Geometry.update`. A
 * mesh without animated tiles is never touched, and between frame changes
 * a layer costs one comparison. Animation never changes the layer's cells
 * or `version`.
 * @param renderContext - The render context the chunk geometries and
 * materials are created in.
 * @param time - The game's time, whose `timeInMilliseconds` chooses each
 * animated tile's frame.
 * @returns The tilemap render ECS system.
 */
export const createTilemapRenderEcsSystem = (
  renderContext: RenderContext,
  time: Time,
): EcsSystem<[TilemapLayerEcsComponent, PositionEcsComponent]> => ({
  name: 'tilemapRender',
  query: [tilemapLayerId, positionId],
  update: (world, { entities, components: [layers] }) => {
    releaseOrphanedStates(world);

    for (let i = 0; i < entities.length; i++) {
      updateLayer(
        world,
        renderContext,
        entities[i],
        layers[i],
        time.timeInMilliseconds,
      );
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
        animationTime: null,
        nextFrameChangeTime: Infinity,
      }),
  );

const updateLayer = (
  world: EcsWorld,
  renderContext: RenderContext,
  entity: number,
  layer: TilemapLayerEcsComponent,
  now: number,
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
    state.animationTime = null;
  }

  // Frames are a function of time, so no frame changed unless time reached
  // the next change. `Time` never runs backwards, but a game or a test can
  // drive a world with a clock that does.
  const { animationTime } = state;
  const animate =
    animationTime !== null &&
    (now >= state.nextFrameChangeTime || now < animationTime);
  const rebuild = layer.version !== state.builtVersion;

  // Brings the meshes of unchanged chunks to `now`; the rebuild writes the
  // frames at `now` into the changed ones.
  if (animate) {
    advanceAnimatedTiles(layer, state, animationTime, now);
  }

  if (rebuild) {
    rebuildChangedChunks(world, renderContext, entity, layer, state, now);
  }

  if (animate || rebuild) {
    state.animationTime = now;
    state.nextFrameChangeTime = getNextFrameChangeTimeOfMeshes(
      layer,
      state,
      now,
    );
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

/**
 * The animation of an animated tile, from its animation key.
 * @throws An error if the tile has no animation, which means the mesh that
 * listed it wasn't built from the layer's current tile set.
 */
const getAnimation = (
  layer: TilemapLayerEcsComponent,
  key: number,
): readonly TileAnimationFrame[] => {
  const { animation } = getTileData(layer.tileSet, key);

  if (animation === null) {
    throw new Error(
      `Unable to animate the tile ${key} of a tilemap layer: it has no animation in the layer's tile set.`,
    );
  }

  return animation;
};

/**
 * Rewrites the animated quads whose tile's frame changed between `shownAt`
 * (the state's `animationTime`) and `now`, in the meshes of chunks that
 * haven't changed since the last build, and uploads their new texture
 * coordinates.
 *
 * Meshes of changed chunks are left to the rebuild: their animated quads
 * may name cells that changed, and after `setTileSet` their keys may name
 * tiles the new tile set doesn't animate, or doesn't have.
 */
const advanceAnimatedTiles = (
  layer: TilemapLayerEcsComponent,
  state: WritableTilemapRenderState,
  shownAt: number,
  now: number,
): void => {
  // Local to this call, so the system keeps no state.
  const frames: FrameChanges = {
    changed: new Map(),
    unchanged: new Set(),
    shownAt,
    now,
  };

  for (const mesh of state.meshes) {
    const chunk = getUnchangedAnimatedChunk(layer, state, mesh);

    if (chunk && holdsChangedFrame(layer, mesh, frames)) {
      uploadAnimatedQuads(layer, chunk, mesh, frames.changed);
    }
  }
};

/** Which animated tiles changed frame between two times, found as needed. */
interface FrameChanges {
  /** The tile index each key whose image changed shows now, by key. */
  readonly changed: Map<number, number>;

  /** The keys found to show the same image at both times. */
  readonly unchanged: Set<number>;

  /** The time the meshes show. */
  readonly shownAt: number;

  /** The time to show. */
  readonly now: number;
}

/**
 * The chunk a mesh with animated tiles draws, if it hasn't changed since
 * the last build, so the mesh still matches its cells and the layer's tile
 * set.
 */
const getUnchangedAnimatedChunk = (
  layer: TilemapLayerEcsComponent,
  state: WritableTilemapRenderState,
  mesh: TilemapChunkMesh,
): TilemapChunk | null => {
  if (mesh.animatedTiles.length === 0) {
    return null;
  }

  const chunk = layer.chunks.get(getChunkKey(mesh.chunkColumn, mesh.chunkRow));

  if (!chunk || chunk.changedAt > state.builtVersion) {
    return null;
  }

  return chunk;
};

/**
 * Whether any animated tile of a mesh shows a different image now,
 * recording each key it checks in `frames`.
 */
const holdsChangedFrame = (
  layer: TilemapLayerEcsComponent,
  mesh: TilemapChunkMesh,
  frames: FrameChanges,
): boolean => {
  let changed = false;

  for (const key of mesh.animatedTiles) {
    if (frames.changed.has(key)) {
      changed = true;

      continue;
    }

    if (frames.unchanged.has(key)) {
      continue;
    }

    const animation = getAnimation(layer, key);
    const shown = animation[getFrameIndexAt(animation, frames.shownAt)].tile;
    const current = animation[getFrameIndexAt(animation, frames.now)].tile;

    if (shown === current) {
      frames.unchanged.add(key);

      continue;
    }

    frames.changed.set(key, current);
    changed = true;
  }

  return changed;
};

/**
 * Rewrites a mesh's animated quads whose frame changed and uploads their
 * texture coordinates, and their positions if a differently trimmed frame
 * moved a corner.
 */
const uploadAnimatedQuads = (
  layer: TilemapLayerEcsComponent,
  chunk: TilemapChunk,
  mesh: TilemapChunkMesh,
  changedFrames: ReadonlyMap<number, number>,
): void => {
  const moved = writeAnimatedQuads(
    layer.tileSet,
    chunk,
    mesh,
    mesh,
    changedFrames,
  );
  const attributes: Record<string, Float32Array> = {
    [texCoordAttribute]: mesh.texCoords,
    [texRectAttribute]: mesh.texRects,
  };

  if (moved) {
    attributes[positionAttribute] = mesh.positions;
  }

  mesh.geometry.update({
    vertexCount: mesh.tileCount * verticesPerTile,
    attributes,
  });
};

/**
 * The earliest time after `now` at which an animated tile of any of the
 * layer's meshes changes frame, or `Infinity` if they hold none. Every
 * mesh was built from the layer's current cells and tile set by now.
 */
const getNextFrameChangeTimeOfMeshes = (
  layer: TilemapLayerEcsComponent,
  state: WritableTilemapRenderState,
  now: number,
): number => {
  let next = Infinity;

  for (const mesh of state.meshes) {
    for (const key of mesh.animatedTiles) {
      next = Math.min(
        next,
        getNextFrameChangeTime(getAnimation(layer, key), now),
      );
    }
  }

  return next;
};

const rebuildChangedChunks = (
  world: EcsWorld,
  renderContext: RenderContext,
  entity: number,
  layer: TilemapLayerEcsComponent,
  state: WritableTilemapRenderState,
  now: number,
): void => {
  const counts = new Uint16Array(layer.tileSet.sources.length);

  for (const chunk of layer.chunks.values()) {
    if (chunk.changedAt > state.builtVersion) {
      countChunkTilesBySource(chunk, counts);
      rebuildChunk(
        world,
        renderContext,
        entity,
        { layer, state, now },
        chunk,
        counts,
      );
    }
  }

  // Meshes of chunks the layer no longer has (emptied, or cleared), and of
  // sources a smaller replacement tile set doesn't have, which
  // `rebuildChunk` never reaches since it only counts the new tile set's
  // sources (no stored tile can name them, `setTileSet` checks that).
  const sourceCount = layer.tileSet.sources.length;
  const kept = state.meshes.filter((mesh) => {
    if (
      mesh.source < sourceCount &&
      layer.chunks.has(getChunkKey(mesh.chunkColumn, mesh.chunkRow))
    ) {
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
  build: LayerBuild,
  chunk: TilemapChunk,
  counts: Uint16Array,
): void => {
  const { layer, state, now } = build;
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
      updateMesh(world, entity, build, index, chunk, tileCount);

      continue;
    }

    const arrays = createTilemapVertexArrays(tileCount);
    const { animatedQuads, animatedCells, animatedTiles } = writeChunkVertices(
      layer.tileSet,
      chunk,
      source,
      arrays,
      now,
    );

    const mesh: TilemapChunkMesh = {
      chunkColumn: chunk.column,
      chunkRow: chunk.row,
      source,
      entity: world.createEntity(),
      geometry: createChunkGeometry(renderContext, arrays, tileCount),
      tileCount,
      ...arrays,
      animatedQuads,
      animatedCells,
      animatedTiles,
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
  build: LayerBuild,
  index: number,
  chunk: TilemapChunk,
  tileCount: number,
): void => {
  const { layer, state, now } = build;
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

  const { animatedQuads, animatedCells, animatedTiles } = writeChunkVertices(
    layer.tileSet,
    chunk,
    mesh.source,
    mesh,
    now,
  );

  mesh.tileCount = tileCount;
  mesh.animatedQuads = animatedQuads;
  mesh.animatedCells = animatedCells;
  mesh.animatedTiles = animatedTiles;
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
