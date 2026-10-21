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
  addDrawOrderComponent,
  drawOrderId,
} from '../../rendering/components/draw-order-component.js';
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
  TilemapYSortMesh,
  TilemapYSortRow,
} from '../components/tilemap-render-state-component.js';
import { getSiblingIndexBesideNeighbors } from '../rendering/place-beside-neighbors.js';
import {
  createQuadIndices,
  getQuadIndices,
  indicesPerTile,
  verticesPerTile,
} from '../rendering/quad-indices.js';
import {
  releaseTilemapChunkMesh,
  releaseTilemapYSortMesh,
} from '../rendering/release-tilemap-chunk-mesh.js';
import {
  countChunkTilesBySource,
  createTilemapVertexArrays,
  positionSize,
  TilemapVertexArrays,
  writeAnimatedQuads,
  writeChunkVertices,
} from '../rendering/write-chunk-vertices.js';
import {
  collectYSortCells,
  writeYSortAnimatedQuads,
  writeYSortVertices,
} from '../rendering/write-y-sort-vertices.js';
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

/** A y-sort mesh's internal type, whose fields only this system writes. */
type WritableTilemapYSortMesh = {
  -readonly [K in keyof TilemapYSortMesh]: TilemapYSortMesh[K];
};

/** The layer a tick is rebuilding meshes of, and the time it shows. */
interface LayerBuild {
  readonly layer: TilemapLayerEcsComponent;
  readonly state: WritableTilemapRenderState;
  /** The time whose animation frames the rebuilt meshes show. */
  readonly now: number;
}

/** What a mesh's animation bookkeeping has, for either kind of mesh. */
interface AnimatedMesh {
  readonly animatedTiles: readonly number[];
}

const asWritableState = (
  state: TilemapRenderStateEcsComponent,
): WritableTilemapRenderState => state;

const asWritableMesh = (mesh: TilemapChunkMesh): WritableTilemapChunkMesh =>
  mesh;

const asWritableYSortMesh = (
  mesh: TilemapYSortMesh,
): WritableTilemapYSortMesh => mesh;

/**
 * Creates the system that draws tilemap layers, one of two ways.
 *
 * A layer is drawn as chunk meshes unless it's y-sorted. For every chunk of
 * the layer and every tileset source its tiles use, the system builds a mesh
 * of two triangles per tile and draws it through a `MeshEcsComponent` on a
 * child entity of the layer entity, so the render system draws one call per
 * visible (chunk, source), sorted with sprites and text by the layer
 * entity's draw order, and hidden and masked with the layer entity. Chunk
 * entities stay in row-major chunk order among themselves in the layer's
 * children, and each mesh writes its tiles in row-major cell order, so
 * tiles of one source that overlap (isometric walls, tall tiles) draw back
 * to front.
 *
 * A layer whose entity's `DrawOrderEcsComponent.ySortChildren` is `true` is
 * y-sorted: its tiles sort with sprites row by row, so a character can walk
 * behind one wall and in front of the next. The system groups the layer's
 * cells by sort Y (the Y of the cell's center plus its tile's
 * `ySortOrigin`) into sort rows and builds one geometry per source for the
 * whole layer, with one `GeometrySection` per row. Each (row, source) is
 * drawn by a child entity of the layer at the layer's origin, with a
 * `DrawOrderEcsComponent` whose `ySortOrigin` is the row's sort Y, so under
 * a camera with `ySort` each row is a sort unit of its own. The row
 * entities stay in ascending sort Y order among the layer's children, so a
 * camera without `ySort` draws them back to front. Rows that are neighbors
 * in the draw order draw in one call, so a layer costs one draw per visible
 * run of a source's rows, plus one for each sprite that sorts between them.
 * The system only reads the flag; changing it rebuilds the layer as the
 * other kind on the next tick.
 *
 * Each tick it rebuilds only what the edits since it last saw the layer
 * changed: the chunks whose tiles changed, or, in a y-sorted layer, the
 * whole geometry of each source those chunks held, adding and removing row
 * entities as rows appear and empty. It writes an existing geometry in place
 * with `Geometry.update`, so an edit creates GL objects only for a chunk or
 * source that had no mesh. It copies the layer's `category` and draw
 * `layer` onto its meshes and its `tintColor` onto their materials.
 * It's the only writer of the chunk and row entities, their components and
 * the layer's `TilemapRenderStateEcsComponent`, where it keeps what it
 * built.
 *
 * Register it after the systems that edit tiles, so an edited tile shows on
 * the same frame, and before `createTransformEcsSystem`, so new chunk and
 * row entities get their world transform in the frame they're created;
 * `createRenderEcsSystem` draws them.
 *
 * Removing a layer entity removes its chunk and row entities and disposes
 * their geometries; removing its `TilemapLayerEcsComponent` or its
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
        ySorted: false,
        chunkMeshes: [],
        ySortMeshes: [],
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
  const ySorted =
    world.getComponent(entity, drawOrderId)?.ySortChildren ?? false;

  // The first build, the layer component was replaced by a new one (whose
  // version starts again at 0), or the layer switched between chunk meshes
  // and y-sorted rows: nothing built so far applies.
  if (state.builtFrom !== layer || state.ySorted !== ySorted) {
    releaseMeshes(world, state);
    state.builtFrom = layer;
    state.builtVersion = -1;
    state.ySorted = ySorted;
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
  const build: LayerBuild = { layer, state, now };
  const shownAt = animate ? animationTime : null;

  if (ySorted) {
    updateYSortMeshes(world, renderContext, entity, build, shownAt, rebuild);
  } else {
    updateChunkMeshes(world, renderContext, entity, build, shownAt, rebuild);
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
 * Brings a chunk layer's meshes the edits didn't touch to `now` when an
 * animated tile's frame changed since `shownAt`, then rebuilds the changed
 * chunks, which writes the frames at `now` into them.
 * @param shownAt - The time the meshes show, or `null` when no frame
 * changed.
 */
const updateChunkMeshes = (
  world: EcsWorld,
  renderContext: RenderContext,
  entity: number,
  { layer, state, now }: LayerBuild,
  shownAt: number | null,
  rebuild: boolean,
): void => {
  if (shownAt !== null) {
    advanceAnimatedTiles(layer, state, shownAt, now);
  }

  if (rebuild) {
    rebuildChangedChunks(world, renderContext, entity, layer, state, now);
  }
};

/**
 * {@link updateChunkMeshes} for a y-sorted layer, a source at a time.
 * @param shownAt - The time the meshes show, or `null` when no frame
 * changed.
 */
const updateYSortMeshes = (
  world: EcsWorld,
  renderContext: RenderContext,
  entity: number,
  build: LayerBuild,
  shownAt: number | null,
  rebuild: boolean,
): void => {
  const changedSources = rebuild
    ? findChangedSources(build.layer, build.state)
    : null;

  if (shownAt !== null) {
    advanceYSortAnimatedTiles(build, changedSources, shownAt);
  }

  if (changedSources) {
    rebuildYSortMeshes(world, renderContext, entity, build, changedSources);
  }
};

/** Releases every mesh the state lists, of both kinds, and forgets them. */
const releaseMeshes = (
  world: EcsWorld,
  state: WritableTilemapRenderState,
): void => {
  for (const mesh of state.chunkMeshes) {
    releaseTilemapChunkMesh(world, mesh);
  }

  for (const mesh of state.ySortMeshes) {
    releaseTilemapYSortMesh(world, mesh);
  }

  state.chunkMeshes = [];
  state.ySortMeshes = [];
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

  for (const mesh of state.chunkMeshes) {
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
  mesh: AnimatedMesh,
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

  uploadAnimatedVertices(mesh, moved);
};

/**
 * Uploads a mesh's texture coordinates after its animated quads were
 * rewritten, and its positions if a differently trimmed frame moved a
 * corner.
 */
const uploadAnimatedVertices = (
  mesh: TilemapVertexArrays & {
    readonly geometry: Geometry;
    readonly tileCount: number;
  },
  moved: boolean,
): void => {
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
  const meshLists: readonly (readonly AnimatedMesh[])[] = [
    state.chunkMeshes,
    state.ySortMeshes,
  ];

  for (const meshes of meshLists) {
    for (const mesh of meshes) {
      for (const key of mesh.animatedTiles) {
        next = Math.min(
          next,
          getNextFrameChangeTime(getAnimation(layer, key), now),
        );
      }
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
  const kept = state.chunkMeshes.filter((mesh) => {
    if (
      mesh.source < sourceCount &&
      layer.chunks.has(getChunkKey(mesh.chunkColumn, mesh.chunkRow))
    ) {
      return true;
    }

    releaseTilemapChunkMesh(world, mesh);

    return false;
  });

  if (kept.length !== state.chunkMeshes.length) {
    state.chunkMeshes = kept;
  }

  dropUnusedMaterials(state);
  state.builtVersion = layer.version;
};

/**
 * Drops the materials of sources no mesh draws any more, which a new tile
 * set might not even have.
 */
const dropUnusedMaterials = (state: WritableTilemapRenderState): void => {
  const isDrawn = (source: number): boolean =>
    state.chunkMeshes.some((mesh) => mesh.source === source) ||
    state.ySortMeshes.some((mesh) => mesh.source === source);
  const unused = [...state.materials.keys()].filter(
    (source) => !isDrawn(source),
  );

  if (unused.length === 0) {
    return;
  }

  const materials = new Map(state.materials);

  for (const source of unused) {
    materials.delete(source);
  }

  state.materials = materials;
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
    const { index, found } = findMeshIndex(state.chunkMeshes, key, source);
    const tileCount = counts[source];

    if (tileCount === 0) {
      if (found) {
        releaseTilemapChunkMesh(world, state.chunkMeshes[index]);
        state.chunkMeshes = state.chunkMeshes.filter((_, i) => i !== index);
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

    state.chunkMeshes = [
      ...state.chunkMeshes.slice(0, index),
      mesh,
      ...state.chunkMeshes.slice(index),
    ];
    addChunkEntity(world, entity, layer, state.chunkMeshes, index, material);
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
  const mesh = asWritableMesh(state.chunkMeshes[index]);
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
    addChunkEntity(world, entity, layer, state.chunkMeshes, index, material);

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

const applyCategoryAndLayer = (
  world: EcsWorld,
  layer: TilemapLayerEcsComponent,
  state: WritableTilemapRenderState,
): void => {
  const apply = (entity: number): void => {
    const mesh = world.getComponent(entity, meshId);

    if (mesh) {
      mesh.category = layer.category;
      mesh.layer = layer.layer;
    }
  };

  for (const { entity } of state.chunkMeshes) {
    apply(entity);
  }

  for (const { rows } of state.ySortMeshes) {
    for (const { entity } of rows) {
      apply(entity);
    }
  }

  state.appliedCategory = layer.category;
  state.appliedDrawLayer = layer.layer;
};

/**
 * Which sources' y-sort meshes the edits since the last build touched:
 * every source on the first build, else the sources held now by a chunk
 * that changed, and those whose mesh held tiles in a chunk that changed or
 * emptied.
 * @returns A flag per source of the layer's tile set.
 */
const findChangedSources = (
  layer: TilemapLayerEcsComponent,
  state: WritableTilemapRenderState,
): boolean[] => {
  const sourceCount = layer.tileSet.sources.length;

  if (state.builtVersion === -1) {
    return new Array<boolean>(sourceCount).fill(true);
  }

  const changed = new Array<boolean>(sourceCount).fill(false);
  const counts = new Uint16Array(sourceCount);

  for (const chunk of layer.chunks.values()) {
    if (chunk.changedAt > state.builtVersion) {
      countChunkTilesBySource(chunk, counts);

      for (let source = 0; source < sourceCount; source++) {
        changed[source] ||= counts[source] > 0;
      }
    }
  }

  // A mesh of a source a smaller replacement tile set doesn't have is
  // released by the rebuild instead.
  for (const mesh of state.ySortMeshes) {
    if (mesh.source < sourceCount && !changed[mesh.source]) {
      changed[mesh.source] = [...mesh.chunkKeys].some((key) => {
        const chunk = layer.chunks.get(key);

        return !chunk || chunk.changedAt > state.builtVersion;
      });
    }
  }

  return changed;
};

/**
 * Rewrites the animated quads whose tile's frame changed between `shownAt`
 * and the build's `now` in the y-sort meshes the edits didn't touch, and
 * uploads them. The meshes of changed sources are left to the rebuild, as
 * for chunk meshes.
 */
const advanceYSortAnimatedTiles = (
  build: LayerBuild,
  changedSources: readonly boolean[] | null,
  shownAt: number,
): void => {
  const { layer, state, now } = build;
  // Local to this call, so the system keeps no state.
  const frames: FrameChanges = {
    changed: new Map(),
    unchanged: new Set(),
    shownAt,
    now,
  };

  for (const mesh of state.ySortMeshes) {
    const stale =
      changedSources !== null &&
      (mesh.source >= changedSources.length || changedSources[mesh.source]);

    if (
      !stale &&
      mesh.animatedTiles.length > 0 &&
      holdsChangedFrame(layer, mesh, frames)
    ) {
      const moved = writeYSortAnimatedQuads(layer, mesh, mesh, frames.changed);

      uploadAnimatedVertices(mesh, moved);
    }
  }
};

/**
 * Rebuilds the y-sort mesh of every changed source, releases the meshes of
 * sources the tile set no longer has, and places the row entities it
 * created among the layer's children.
 */
const rebuildYSortMeshes = (
  world: EcsWorld,
  renderContext: RenderContext,
  layerEntity: number,
  build: LayerBuild,
  changedSources: readonly boolean[],
): void => {
  const { layer, state } = build;
  // Local to this call, so the system keeps no state.
  const newRows = new Set<number>();

  for (let source = 0; source < changedSources.length; source++) {
    if (changedSources[source]) {
      rebuildYSortSource(world, renderContext, build, source, newRows);
    }
  }

  const sourceCount = layer.tileSet.sources.length;
  const kept = state.ySortMeshes.filter((mesh) => {
    if (mesh.source < sourceCount) {
      return true;
    }

    releaseTilemapYSortMesh(world, mesh);

    return false;
  });

  if (kept.length !== state.ySortMeshes.length) {
    state.ySortMeshes = kept;
  }

  dropUnusedMaterials(state);
  placeNewRows(world, layerEntity, state, newRows);
  state.builtVersion = layer.version;
};

/**
 * Builds, or rewrites in place, the y-sort mesh of one source, and brings
 * its row entities in line with its rows. Row entities it creates are
 * added to `newRows`, and aren't parented yet.
 */
const rebuildYSortSource = (
  world: EcsWorld,
  renderContext: RenderContext,
  build: LayerBuild,
  source: number,
  newRows: Set<number>,
): void => {
  const { layer, state, now } = build;
  const cells = collectYSortCells(layer, source);
  const index = state.ySortMeshes.findIndex((mesh) => mesh.source === source);

  if (cells.count === 0) {
    if (index !== -1) {
      releaseTilemapYSortMesh(world, state.ySortMeshes[index]);
      state.ySortMeshes = state.ySortMeshes.filter((_, i) => i !== index);
    }

    return;
  }

  const material = getMaterial(renderContext, state, source);

  if (index === -1) {
    const arrays = createTilemapVertexArrays(cells.count);
    const indices = createQuadIndices(cells.count);
    const written = writeYSortVertices(layer.tileSet, cells, arrays, now);
    const mesh: WritableTilemapYSortMesh = {
      source,
      geometry: new Geometry(renderContext, {
        attributes: [
          { name: positionAttribute, data: arrays.positions, size: 2 },
          { name: texCoordAttribute, data: arrays.texCoords, size: 2 },
          { name: texRectAttribute, data: arrays.texRects, size: 4 },
        ],
        indices,
        sections: written.sections,
      }),
      tileCount: cells.count,
      ...arrays,
      indices,
      rows: [],
      chunkKeys: cells.chunkKeys,
      animatedQuads: written.animatedQuads,
      animatedCells: written.animatedCells,
      animatedTiles: written.animatedTiles,
    };

    // By ascending source index: sources rebuild in that order, and no
    // mesh of a higher source is kept past a smaller tile set.
    state.ySortMeshes = [...state.ySortMeshes, mesh].sort(
      (a, b) => a.source - b.source,
    );
    mesh.rows = reconcileRows(
      world,
      layer,
      mesh,
      material,
      written.sortYs,
      newRows,
    );

    return;
  }

  const mesh = asWritableYSortMesh(state.ySortMeshes[index]);
  const capacity = mesh.indices.length / indicesPerTile;
  const grows = cells.count > capacity;

  if (grows) {
    const grownCapacity = 2 ** Math.ceil(Math.log2(cells.count));

    Object.assign(mesh, createTilemapVertexArrays(grownCapacity));
    mesh.indices = createQuadIndices(grownCapacity);
  }

  const written = writeYSortVertices(layer.tileSet, cells, mesh, now);

  // The indices only need uploading when the number drawn, or the array,
  // changed.
  mesh.geometry.update({
    vertexCount: cells.count * verticesPerTile,
    attributes: {
      [positionAttribute]: mesh.positions,
      [texCoordAttribute]: mesh.texCoords,
      [texRectAttribute]: mesh.texRects,
    },
    indices:
      grows || cells.count !== mesh.tileCount
        ? mesh.indices.subarray(0, cells.count * indicesPerTile)
        : undefined,
    sections: written.sections,
  });
  mesh.tileCount = cells.count;
  mesh.chunkKeys = cells.chunkKeys;
  mesh.animatedQuads = written.animatedQuads;
  mesh.animatedCells = written.animatedCells;
  mesh.animatedTiles = written.animatedTiles;
  mesh.rows = reconcileRows(
    world,
    layer,
    mesh,
    material,
    written.sortYs,
    newRows,
  );
};

/**
 * Matches a y-sort mesh's row entities to its new rows, both in ascending
 * sort Y: keeps the entity of a row that's still there, removes those of
 * rows that emptied, and creates one for each new row (or for a row whose
 * entity game code removed). Then points every row's mesh at its section,
 * whose index shifts as rows come and go.
 * @returns The new rows.
 */
const reconcileRows = (
  world: EcsWorld,
  layer: TilemapLayerEcsComponent,
  mesh: TilemapYSortMesh,
  material: MeshMaterial,
  sortYs: readonly number[],
  newRows: Set<number>,
): TilemapYSortRow[] => {
  const old = mesh.rows;
  const rows: TilemapYSortRow[] = [];
  let next = 0;

  const removeRow = (row: TilemapYSortRow): void => {
    if (world.isAlive(row.entity)) {
      world.removeEntity(row.entity);
    }
  };

  for (const sortY of sortYs) {
    while (next < old.length && old[next].sortY < sortY) {
      removeRow(old[next]);
      next++;
    }

    if (
      next < old.length &&
      old[next].sortY === sortY &&
      world.isAlive(old[next].entity)
    ) {
      rows.push(old[next]);
      next++;

      continue;
    }

    if (next < old.length && old[next].sortY === sortY) {
      next++;
    }

    const entity = createRowEntity(world, sortY);

    newRows.add(entity);
    rows.push({ sortY, entity });
  }

  for (; next < old.length; next++) {
    removeRow(old[next]);
  }

  for (const [section, { entity }] of rows.entries()) {
    const meshComponent = world.getComponent(entity, meshId);

    if (meshComponent) {
      meshComponent.geometry = mesh.geometry;
      meshComponent.material = material;
      meshComponent.section = section;

      continue;
    }

    addMeshComponent(world, entity, {
      geometry: mesh.geometry,
      material,
      section,
      category: layer.category,
      layer: layer.layer,
    });
  }

  return rows;
};

/**
 * Creates the entity of a new sort row: identity local transforms, as for
 * a chunk entity, so it has exactly the layer's world transform, and a draw
 * order that sorts it at the row's sort Y. `placeNewRows` parents it.
 */
const createRowEntity = (world: EcsWorld, sortY: number): number => {
  const entity = world.createEntity();

  addPositionComponent(world, entity);
  addRotationComponent(world, entity);
  addScaleComponent(world, entity);
  addDrawOrderComponent(world, entity, { ySortOrigin: sortY });

  return entity;
};

/**
 * Parents each row entity created this tick to the layer and places it in
 * ascending (sort Y, source) order among the layer's row entities. Rows
 * are parented one at a time, just before they're placed, so every row
 * the placement looks at is already in order.
 */
const placeNewRows = (
  world: EcsWorld,
  layerEntity: number,
  state: WritableTilemapRenderState,
  newRows: ReadonlySet<number>,
): void => {
  if (newRows.size === 0) {
    return;
  }

  const ordered = state.ySortMeshes
    .flatMap(({ source, rows }) =>
      rows.map(({ sortY, entity }) => ({ sortY, source, entity })),
    )
    .sort((a, b) => a.sortY - b.sortY || a.source - b.source);

  for (const [index, { entity }] of ordered.entries()) {
    if (newRows.has(entity)) {
      world.setParent(entity, layerEntity);
      world.setSiblingIndex(
        entity,
        getSiblingIndexBesideNeighbors(world, layerEntity, ordered, index),
      );
    }
  }
};
