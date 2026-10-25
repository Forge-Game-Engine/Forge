/* eslint-disable @typescript-eslint/naming-convention */
import {
  beforeEach,
  describe,
  expect,
  it,
  Mock,
  MockInstance,
  vi,
} from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  createTransformEcsSystem,
  positionId,
  rotationId,
  scaleId,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { createOrthogonalGridLayout } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import {
  MeshEcsComponent,
  meshId,
} from '../../rendering/components/mesh-component.js';
import { Geometry } from '../../rendering/geometry/geometry.js';
import { MeshMaterial } from '../../rendering/materials/mesh-material.js';
import {
  createRenderContext,
  RenderContext,
} from '../../rendering/render-context.js';
import {
  createGridTextureAtlas,
  createTextureAtlas,
} from '../../rendering/texture-atlas/index.js';
import { Texture } from '../../rendering/texture.js';
import { getChunkKey } from '../cells/chunk-key.js';
import {
  clearTile,
  clearTiles,
  fillTiles,
  setTile,
  setTileSet,
} from '../cells/edit-tiles.js';
import {
  addTilemapLayerComponent,
  TilemapLayerEcsComponent,
  tilemapLayerId,
} from '../components/tilemap-layer-component.js';
import {
  TilemapChunkMesh,
  TilemapRenderStateEcsComponent,
  tilemapRenderStateId,
} from '../components/tilemap-render-state-component.js';
import {
  createTileSet,
  TileDataOptions,
  TileSet,
} from '../tile-set/tile-set.js';
import { packTile } from '../tiles/packed-tile.js';
import { createTilemapRenderEcsSystem } from './tilemap-render-system.js';

/**
 * A WebGL context whose every method is a mock returning an empty object,
 * apart from the queries the render context, shaders and textures check.
 */
const createMockGl = (isContextLost: () => boolean): WebGL2RenderingContext => {
  const overrides: Record<string, unknown> = {
    getShaderParameter: vi.fn(() => true),
    getProgramParameter: vi.fn(
      (_program: unknown, parameter: unknown): unknown =>
        parameter === overrides.ACTIVE_UNIFORMS ? 0 : true,
    ),
    ACTIVE_UNIFORMS: 'ACTIVE_UNIFORMS',
    getActiveUniform: vi.fn(() => null),
    getExtension: vi.fn(() => null),
    isContextLost: vi.fn(isContextLost),
  };

  return new Proxy(overrides, {
    get: (target, property: string): unknown => {
      target[property] ??= vi.fn(() => ({}));

      return target[property];
    },
  }) as unknown as WebGL2RenderingContext;
};

const grass = packTile({ source: 0, tile: 0 });
const dirt = packTile({ source: 0, tile: 1 });
const rock = packTile({ source: 1, tile: 0 });

describe('createTilemapRenderEcsSystem', () => {
  let gl: WebGL2RenderingContext;
  let contextLost: boolean;
  let canvas: HTMLCanvasElement;
  let renderContext: RenderContext;
  let world: EcsWorld;
  let system: ReturnType<typeof createTilemapRenderEcsSystem>;
  let terrainTexture: Texture;
  let rockTexture: Texture;
  let tileSet: TileSet;
  let time: Time;
  let now: number;

  const createTexture = (width: number, height: number): Texture => {
    const texture = new Texture(renderContext);
    const image = document.createElement('canvas');

    image.width = width;
    image.height = height;
    texture.update(image);

    return texture;
  };

  const createTwoSourceTileSet = (
    terrain: Texture,
    rocks: Texture,
    terrainTiles?: ReadonlyMap<number, TileDataOptions>,
  ): TileSet =>
    createTileSet({
      layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
      sources: [
        {
          atlas: createGridTextureAtlas(terrain, {
            cellWidth: 16,
            cellHeight: 16,
          }),
          tiles: terrainTiles,
        },
        {
          atlas: createGridTextureAtlas(rocks, {
            cellWidth: 16,
            cellHeight: 16,
          }),
        },
      ],
    });

  const addLayer = (): {
    entity: number;
    layer: TilemapLayerEcsComponent;
  } => {
    const entity = world.createEntity();

    addPositionComponent(world, entity);

    return {
      entity,
      layer: addTilemapLayerComponent(world, entity, { tileSet }),
    };
  };

  const getState = (entity: number): TilemapRenderStateEcsComponent =>
    world.getComponentRequired(entity, tilemapRenderStateId);

  const getMeshes = (entity: number): readonly TilemapChunkMesh[] =>
    getState(entity).chunkMeshes;

  const describeMeshes = (
    entity: number,
  ): { chunk: [number, number]; source: number; tiles: number }[] =>
    getMeshes(entity).map((mesh) => ({
      chunk: [mesh.chunkColumn, mesh.chunkRow],
      source: mesh.source,
      tiles: mesh.tileCount,
    }));

  const getMeshComponent = (mesh: TilemapChunkMesh): MeshEcsComponent =>
    world.getComponentRequired(mesh.entity, meshId);

  /** The last value stored for a uniform on a material, through `setUniform`. */
  const lastUniform = (
    setUniform: Mock,
    material: MeshMaterial,
    name: string,
  ): unknown =>
    setUniform.mock.calls.findLast(
      (call, index) =>
        setUniform.mock.contexts[index] === material && call[0] === name,
    )?.[1];

  beforeEach(() => {
    contextLost = false;
    gl = createMockGl(() => contextLost);
    canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(gl);
    renderContext = createRenderContext(canvas);
    world = new EcsWorld();
    // `Time.update` clamps each step, so the tests set the time directly.
    now = 0;
    time = new Time();
    vi.spyOn(time, 'timeInMilliseconds', 'get').mockImplementation(() => now);
    system = createTilemapRenderEcsSystem(renderContext, time);
    world.addSystem(system);
    terrainTexture = createTexture(32, 32);
    rockTexture = createTexture(32, 16);
    tileSet = createTwoSourceTileSet(terrainTexture, rockTexture);
  });

  it('builds one mesh entity per chunk and source, as children of the layer', () => {
    const { entity, layer } = addLayer();

    fillTiles(layer, 0, 0, 3, 2, grass);
    setTile(layer, 5, 5, rock);
    setTile(layer, 40, 0, dirt);
    world.update();

    expect(describeMeshes(entity)).toEqual([
      { chunk: [0, 0], source: 0, tiles: 6 },
      { chunk: [0, 0], source: 1, tiles: 1 },
      { chunk: [1, 0], source: 0, tiles: 1 },
    ]);

    const meshes = getMeshes(entity);

    expect(world.getChildren(entity)).toEqual(
      meshes.map((mesh) => mesh.entity),
    );

    for (const mesh of meshes) {
      const meshComponent = getMeshComponent(mesh);

      expect(meshComponent.geometry).toBe(mesh.geometry);
      expect(meshComponent.material).toBe(
        getState(entity).materials.get(mesh.source),
      );
      expect(mesh.geometry.vertexCount).toBe(mesh.tileCount * 4);
      expect(mesh.geometry.elementCount).toBe(mesh.tileCount * 6);
      expect(world.getComponentRequired(mesh.entity, positionId).local).toEqual(
        { x: 0, y: 0 },
      );
      expect(world.getComponentRequired(mesh.entity, rotationId).local).toBe(0);
      expect(world.getComponentRequired(mesh.entity, scaleId).local).toEqual({
        x: 1,
        y: 1,
      });
    }

    expect(getState(entity).materials.size).toBe(2);
  });

  it('bounds each chunk mesh by its tiles, in the layer space', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 33, 2, grass);
    setTile(layer, 35, 4, grass);
    world.update();

    expect(getMeshes(entity)[0].geometry.bounds).toEqual({
      min: { x: 33 * 16, y: 2 * 16 },
      max: { x: 36 * 16, y: 5 * 16 },
    });
  });

  it('gives chunk entities the layer’s world transform once the transform system runs', () => {
    world.addSystem(createTransformEcsSystem(time));

    const { entity, layer } = addLayer();

    world.getComponentRequired(entity, positionId).local = { x: 100, y: 50 };
    addRotationComponent(world, entity, { local: 0.5 });
    addScaleComponent(world, entity, { local: { x: 2, y: 3 } });
    setTile(layer, 0, 0, grass);
    world.update();

    const [mesh] = getMeshes(entity);

    expect(world.getComponentRequired(mesh.entity, positionId).world).toEqual({
      x: 100,
      y: 50,
    });
    expect(world.getComponentRequired(mesh.entity, rotationId).world).toBe(0.5);
    expect(world.getComponentRequired(mesh.entity, scaleId).world).toEqual({
      x: 2,
      y: 3,
    });
  });

  it('rebuilds only the edited chunk, in place', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    setTile(layer, 40, 0, grass);
    world.update();

    const [first, second] = getMeshes(entity);
    const update = vi.spyOn(Geometry.prototype, 'update');
    const createBuffer = gl.createBuffer as Mock;
    const buffersBefore = createBuffer.mock.calls.length;

    setTile(layer, 1, 0, dirt);
    world.update();

    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.contexts[0]).toBe(first.geometry);
    expect(createBuffer.mock.calls).toHaveLength(buffersBefore);
    expect(getMeshes(entity)).toEqual([first, second]);
    expect(first.tileCount).toBe(2);
    expect(first.geometry.vertexCount).toBe(8);

    update.mockClear();
    world.update();

    expect(update).not.toHaveBeenCalled();
  });

  it('adds one mesh when an edit brings a new source into a chunk', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    world.update();
    setTile(layer, 1, 0, rock);
    world.update();

    expect(describeMeshes(entity)).toEqual([
      { chunk: [0, 0], source: 0, tiles: 1 },
      { chunk: [0, 0], source: 1, tiles: 1 },
    ]);
  });

  it('removes the entities of an emptied chunk and disposes their geometries', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    setTile(layer, 1, 0, rock);
    setTile(layer, 40, 0, grass);
    world.update();

    const [grassMesh, rockMesh, otherChunk] = getMeshes(entity);
    const disposeGrass = vi.spyOn(grassMesh.geometry, 'dispose');
    const disposeRock = vi.spyOn(rockMesh.geometry, 'dispose');

    clearTile(layer, 1, 0);
    world.update();

    expect(world.isAlive(rockMesh.entity)).toBe(false);
    expect(disposeRock).toHaveBeenCalledOnce();
    expect(getMeshes(entity)).toEqual([grassMesh, otherChunk]);
    expect(getState(entity).materials.has(1)).toBe(false);

    clearTile(layer, 0, 0);
    world.update();

    expect(world.isAlive(grassMesh.entity)).toBe(false);
    expect(disposeGrass).toHaveBeenCalledOnce();
    expect(getMeshes(entity)).toEqual([otherChunk]);
    expect(world.getChildren(entity)).toEqual([otherChunk.entity]);
  });

  it('keeps chunk meshes in row-major order among the layer’s children', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    setTile(layer, 40, 0, grass);
    world.update();

    // A new chunk up and to the left of both.
    setTile(layer, -1, -1, grass);
    world.update();

    const chunkOrder = (): [number, number][] =>
      world.getChildren(entity).flatMap((child) => {
        const mesh = getMeshes(entity).find(
          (candidate) => candidate.entity === child,
        );

        return mesh ? [[mesh.chunkColumn, mesh.chunkRow]] : [];
      });

    expect(chunkOrder()).toEqual([
      [-1, -1],
      [0, 0],
      [1, 0],
    ]);

    // The game's own child comes after the meshes, and stays where the game
    // moves it.
    const prop = world.createEntity();

    world.setParent(prop, entity);
    world.setSiblingIndex(prop, 0);

    // Between (-1, -1) and (0, 0) in row-major order.
    setTile(layer, 200, -1, grass);
    world.update();

    expect(world.getChildren(entity)[0]).toBe(prop);
    expect(chunkOrder()).toEqual([
      [-1, -1],
      [6, -1],
      [0, 0],
      [1, 0],
    ]);
    expect(getMeshes(entity).map((mesh) => mesh.entity)).toEqual(
      world.getChildren(entity).slice(1),
    );
  });

  it('builds a new entity in the same place for a chunk mesh game code removed', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    setTile(layer, 40, 0, grass);
    world.update();

    const [first] = getMeshes(entity);
    const removed = first.entity;

    world.removeEntity(removed);
    setTile(layer, 1, 0, grass);
    world.update();

    expect(first.entity).not.toBe(removed);
    expect(world.getChildren(entity)).toEqual(
      getMeshes(entity).map((mesh) => mesh.entity),
    );
    expect(getMeshComponent(first).geometry).toBe(first.geometry);
  });

  it('rebuilds every chunk with the new sources after setTileSet', () => {
    const setUniform = vi.spyOn(MeshMaterial.prototype, 'setUniform');
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    world.update();

    const winterTexture = createTexture(32, 32);
    const update = vi.spyOn(Geometry.prototype, 'update');

    setTileSet(layer, createTwoSourceTileSet(winterTexture, rockTexture));
    world.update();

    const [mesh] = getMeshes(entity);

    expect(update.mock.contexts).toEqual([mesh.geometry]);
    expect(
      lastUniform(setUniform, getMeshComponent(mesh).material, 'u_texture'),
    ).toBe(winterTexture);
  });

  it('removes the meshes of sources a smaller replacement tile set lacks', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    setTile(layer, 1, 0, rock);
    world.update();

    const [grassMesh, rockMesh] = getMeshes(entity);
    const disposeRock = vi.spyOn(rockMesh.geometry, 'dispose');

    // The chunk keeps its source-0 tile, so only the source count drops.
    clearTile(layer, 1, 0);
    setTileSet(
      layer,
      createTileSet({
        layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
        sources: [
          {
            atlas: createGridTextureAtlas(terrainTexture, {
              cellWidth: 16,
              cellHeight: 16,
            }),
          },
        ],
      }),
    );
    world.update();

    expect(world.isAlive(rockMesh.entity)).toBe(false);
    expect(disposeRock).toHaveBeenCalledOnce();
    expect(getMeshes(entity)).toEqual([grassMesh]);
    expect(world.getChildren(entity)).toEqual([grassMesh.entity]);
    expect([...getState(entity).materials.keys()]).toEqual([0]);
  });

  it('replaces every mesh when the layer component is replaced', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    world.update();

    const [old] = getMeshes(entity);
    const dispose = vi.spyOn(old.geometry, 'dispose');
    const replacement = addTilemapLayerComponent(world, entity, { tileSet });

    setTile(replacement, 40, 0, rock);
    world.update();

    expect(dispose).toHaveBeenCalledOnce();
    expect(world.isAlive(old.entity)).toBe(false);
    expect(getState(entity).builtFrom).toBe(replacement);
    expect(describeMeshes(entity)).toEqual([
      { chunk: [1, 0], source: 1, tiles: 1 },
    ]);
  });

  it.each([
    [
      'the layer entity',
      (w: EcsWorld, e: number): void => {
        w.removeEntity(e);
      },
    ],
    [
      'the layer component',
      (w: EcsWorld, e: number): void => {
        w.removeComponent(e, tilemapLayerId);
      },
    ],
    [
      'the position',
      (w: EcsWorld, e: number): void => {
        w.removeComponent(e, positionId);
      },
    ],
    [
      'the render state',
      (w: EcsWorld, e: number): void => {
        w.removeComponent(e, tilemapRenderStateId);
      },
    ],
  ])('removes the chunk entities when %s is removed', (_, remove) => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    setTile(layer, 0, 1, rock);
    world.update();

    const meshes = getMeshes(entity);
    const disposes = meshes.map((mesh) => vi.spyOn(mesh.geometry, 'dispose'));

    remove(world, entity);
    world.update();

    for (const [index, mesh] of meshes.entries()) {
      expect(world.isAlive(mesh.entity)).toBe(false);
      expect(disposes[index]).toHaveBeenCalledOnce();
    }
  });

  it.each([
    [
      'the layer component',
      (w: EcsWorld, e: number): void => {
        w.removeComponent(e, tilemapLayerId);
      },
    ],
    [
      'the position',
      (w: EcsWorld, e: number): void => {
        w.removeComponent(e, positionId);
      },
    ],
  ])(
    'removes the render state of a live entity when %s is removed',
    (_, remove) => {
      const { entity, layer } = addLayer();

      setTile(layer, 0, 0, grass);
      world.update();
      remove(world, entity);
      world.update();

      expect(world.getComponent(entity, tilemapRenderStateId)).toBeNull();
      expect(world.getChildren(entity)).toEqual([]);
    },
  );

  it('builds the layer again after game code removed its render state', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    world.update();

    const [old] = getMeshes(entity);

    world.removeComponent(entity, tilemapRenderStateId);
    world.update();

    const [rebuilt] = getMeshes(entity);

    expect(rebuilt.entity).not.toBe(old.entity);
    expect(world.getChildren(entity)).toEqual([rebuilt.entity]);
  });

  it('copies the category and draw layer onto every mesh, on build and when they change', () => {
    const { entity, layer } = addLayer();

    layer.category = 4;
    layer.layer = 2;
    setTile(layer, 0, 0, grass);
    setTile(layer, 0, 1, rock);
    world.update();

    for (const mesh of getMeshes(entity)) {
      expect(getMeshComponent(mesh)).toMatchObject({ category: 4, layer: 2 });
    }

    layer.category = 8;
    layer.layer = -1;
    world.update();

    for (const mesh of getMeshes(entity)) {
      expect(getMeshComponent(mesh)).toMatchObject({ category: 8, layer: -1 });
    }
  });

  it('gives every material the layer’s tint and its source’s texture and current region inset', () => {
    const setUniform = vi.spyOn(MeshMaterial.prototype, 'setUniform');
    const { entity, layer } = addLayer();

    layer.tintColor = new Color(1, 0.5, 0.25, 0.5);
    setTile(layer, 0, 0, grass);
    setTile(layer, 0, 1, rock);
    world.update();

    const [terrain, rocks] = getMeshes(entity).map(
      (mesh) => getMeshComponent(mesh).material,
    );

    expect(lastUniform(setUniform, terrain, 'u_texture')).toBe(terrainTexture);
    expect(lastUniform(setUniform, rocks, 'u_texture')).toBe(rockTexture);
    expect(lastUniform(setUniform, terrain, 'u_tint')).toEqual(
      new Float32Array([1, 0.5, 0.25, 0.5]),
    );
    expect(lastUniform(setUniform, rocks, 'u_regionInset')).toEqual(
      new Float32Array([0.5 / 32, 0.5 / 16]),
    );

    // The texture's image changes size: the inset follows on the next tick.
    const larger = document.createElement('canvas');

    larger.width = 64;
    larger.height = 64;
    rockTexture.update(larger);
    world.update();

    expect(lastUniform(setUniform, rocks, 'u_regionInset')).toEqual(
      new Float32Array([0.5 / 64, 0.5 / 64]),
    );
  });

  it('adopts the state of a layer another system built, without rebuilding', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    world.update();

    const meshes = getMeshes(entity);

    // Systems hold no state: a new system over the same components carries
    // on from what is recorded on the layer.
    world.removeSystem(system);
    world.addSystem(createTilemapRenderEcsSystem(renderContext, time));

    const update = vi.spyOn(Geometry.prototype, 'update');

    world.update();

    expect(update).not.toHaveBeenCalled();
    expect(getMeshes(entity)).toBe(meshes);
    expect(world.isAlive(meshes[0].entity)).toBe(true);
  });

  it('draws the latest tiles after a context lost while they were edited is restored', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    world.update();

    const [mesh] = getMeshes(entity);

    contextLost = true;
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    setTile(layer, 3, 0, grass);
    world.update();

    const bufferSubData = gl.bufferSubData as Mock;

    bufferSubData.mockClear();
    contextLost = false;
    canvas.dispatchEvent(new Event('webglcontextrestored'));

    const positionUpload = bufferSubData.mock.calls.find(
      (call) => call[2] === mesh.positions,
    );

    expect(positionUpload?.[4]).toBe(2 * 4 * 2);
    // The second tile's top-left corner, at cell (3, 0).
    expect([...mesh.positions.subarray(8, 10)]).toEqual([48, 0]);
    expect(mesh.geometry.vertexCount).toBe(8);
  });

  it('keys meshes by chunk', () => {
    const { entity, layer } = addLayer();

    setTile(layer, -33, 70, grass);
    world.update();

    const [mesh] = getMeshes(entity);

    expect(layer.chunks.has(getChunkKey(mesh.chunkColumn, mesh.chunkRow))).toBe(
      true,
    );
    expect([mesh.chunkColumn, mesh.chunkRow]).toEqual([-2, 2]);
  });

  describe('animated tiles', () => {
    // Terrain tile 3 animates: 100 ms of its own image (the atlas's
    // bottom-right quarter), then 100 ms of tile 1's (its top-right).
    const water = packTile({ source: 0, tile: 3 });
    const waterFrames = new Map<number, TileDataOptions>([
      [
        3,
        {
          animation: [
            { tile: 3, durationMilliseconds: 100 },
            { tile: 1, durationMilliseconds: 100 },
          ],
        },
      ],
    ]);
    const ownImage = { x: 0.5, y: 0.5 };
    const secondFrame = { x: 0.5, y: 0 };

    let update: MockInstance<Geometry['update']>;

    beforeEach(() => {
      tileSet = createTwoSourceTileSet(
        terrainTexture,
        rockTexture,
        waterFrames,
      );
      update = vi.spyOn(Geometry.prototype, 'update');
    });

    /** The texture coordinate of a quad's top-left corner. */
    const topLeftTexCoord = (
      mesh: TilemapChunkMesh,
      quad: number,
    ): { x: number; y: number } => ({
      x: mesh.texCoords[quad * 8],
      y: mesh.texCoords[quad * 8 + 1],
    });

    const tick = (milliseconds: number): void => {
      now = milliseconds;
      world.update();
    };

    it('never updates a layer without animated tiles, however much time passes', () => {
      const { entity, layer } = addLayer();

      fillTiles(layer, 0, 0, 4, 4, grass);
      tick(0);
      update.mockClear();

      for (const milliseconds of [100, 250, 1e6]) {
        tick(milliseconds);
      }

      expect(update).not.toHaveBeenCalled();
      expect(getState(entity).nextFrameChangeTime).toBe(Infinity);
    });

    it('rewrites the quads of an animated tile, in only the meshes that hold it, when its frame changes', () => {
      const { entity, layer } = addLayer();

      setTile(layer, 0, 0, grass);
      setTile(layer, 1, 0, water);
      setTile(layer, 2, 0, rock);
      setTile(layer, 40, 0, water);
      setTile(layer, 80, 0, grass);
      tick(0);

      const [terrain, rocks, second, staticChunk] = getMeshes(entity);

      expect(topLeftTexCoord(terrain, 1)).toEqual(ownImage);
      expect([...terrain.animatedQuads]).toEqual([1]);
      expect(rocks.animatedTiles).toEqual([]);
      expect(staticChunk.animatedTiles).toEqual([]);
      expect(getState(entity).nextFrameChangeTime).toBe(100);

      update.mockClear();
      tick(99);

      expect(update).not.toHaveBeenCalled();

      const grassBefore = [...terrain.texCoords.subarray(0, 8)];

      tick(100);

      expect(update.mock.contexts).toEqual([terrain.geometry, second.geometry]);

      for (const [{ attributes }] of update.mock.calls) {
        expect(Object.keys(attributes ?? {})).toEqual([
          'a_texCoord',
          'a_texRect',
        ]);
      }

      expect(topLeftTexCoord(terrain, 1)).toEqual(secondFrame);
      expect(topLeftTexCoord(second, 0)).toEqual(secondFrame);
      expect([...terrain.texCoords.subarray(0, 8)]).toEqual(grassBefore);
      expect(getState(entity)).toMatchObject({
        animationTime: 100,
        nextFrameChangeTime: 200,
      });
      expect(layer.version).toBe(5);
    });

    it('leaves the meshes whose animated tiles kept their frame when another tile’s frame changes', () => {
      // Terrain tile 2 changes frame every 50 ms, water every 100 ms.
      const ripple = packTile({ source: 0, tile: 2 });

      tileSet = createTwoSourceTileSet(
        terrainTexture,
        rockTexture,
        new Map([
          ...waterFrames,
          [
            2,
            {
              animation: [
                { tile: 2, durationMilliseconds: 50 },
                { tile: 0, durationMilliseconds: 50 },
              ],
            },
          ],
        ]),
      );

      const { entity, layer } = addLayer();

      setTile(layer, 0, 0, water);
      setTile(layer, 1, 0, ripple);
      setTile(layer, 40, 0, water);
      tick(0);

      const [both, waterOnly] = getMeshes(entity);

      expect(getState(entity).nextFrameChangeTime).toBe(50);

      update.mockClear();
      tick(50);

      expect(update.mock.contexts).toEqual([both.geometry]);
      expect(topLeftTexCoord(both, 0)).toEqual(ownImage);
      expect(topLeftTexCoord(both, 1)).toEqual({ x: 0, y: 0 });
      expect(topLeftTexCoord(waterOnly, 0)).toEqual(ownImage);
      expect(getState(entity).nextFrameChangeTime).toBe(100);
    });

    it('throws, naming the tile, for a mesh that lists a tile its layer’s tile set doesn’t animate', () => {
      const { entity, layer } = addLayer();

      setTile(layer, 0, 0, water);
      tick(0);

      // A render state that no longer matches its layer, which only code
      // other than the system could leave behind.
      Object.assign(getMeshes(entity)[0], { animatedTiles: [grass] });

      expect(() => {
        tick(100);
      }).toThrow(
        `Unable to animate the tile ${grass} of a tilemap layer: it has no animation in the layer's tile set.`,
      );
    });

    it('uploads nothing on a tick whose delta is a whole number of cycles', () => {
      const { entity, layer } = addLayer();

      setTile(layer, 0, 0, water);
      tick(50);
      update.mockClear();
      tick(250);

      expect(update).not.toHaveBeenCalled();
      expect(topLeftTexCoord(getMeshes(entity)[0], 0)).toEqual(ownImage);
      expect(getState(entity).nextFrameChangeTime).toBe(300);
    });

    it('lands on the right frame after a large delta', () => {
      const { entity, layer } = addLayer();

      setTile(layer, 0, 0, water);
      tick(0);
      tick(200 * 1000 + 150);

      expect(topLeftTexCoord(getMeshes(entity)[0], 0)).toEqual(secondFrame);

      tick(200 * 5000 + 10);

      expect(topLeftTexCoord(getMeshes(entity)[0], 0)).toEqual(ownImage);
    });

    it('keeps two layers sharing a tile set on the same frame, even when added at different times', () => {
      const first = addLayer();

      setTile(first.layer, 0, 0, water);
      tick(0);
      tick(120);

      const second = addLayer();

      setTile(
        second.layer,
        5,
        5,
        packTile({ source: 0, tile: 3, flipX: true }),
      );

      const shown = (): unknown[] =>
        [first.entity, second.entity].map((entity) =>
          topLeftTexCoord(getMeshes(entity)[0], 0),
        );

      for (const milliseconds of [130, 199, 200, 260, 310, 1e5 + 101]) {
        tick(milliseconds);

        const frame =
          Math.floor(milliseconds / 100) % 2 === 0 ? ownImage : secondFrame;

        // The second layer's tile is flipped, so its top-left samples the
        // top-right of the same frame.
        expect(shown()).toEqual([frame, { x: frame.x + 0.5, y: frame.y }]);
      }
    });

    it('rebuilds a chunk edited on the tick its frame changes once, with the current frame', () => {
      const { entity, layer } = addLayer();

      setTile(layer, 0, 0, water);
      tick(0);
      update.mockClear();
      setTile(layer, 1, 0, grass);
      tick(100);

      const [mesh] = getMeshes(entity);

      expect(update).toHaveBeenCalledOnce();
      expect(update.mock.calls[0][0].indices).toBeDefined();
      expect(topLeftTexCoord(mesh, 0)).toEqual(secondFrame);
    });

    it('starts animating a static chunk an animated tile is painted into, and stops when the last is cleared', () => {
      const { entity, layer } = addLayer();

      setTile(layer, 0, 0, grass);
      tick(0);

      expect(getState(entity).nextFrameChangeTime).toBe(Infinity);

      setTile(layer, 1, 0, water);
      tick(10);

      expect(getState(entity).nextFrameChangeTime).toBe(100);

      update.mockClear();
      tick(100);

      expect(update).toHaveBeenCalledOnce();
      expect(topLeftTexCoord(getMeshes(entity)[0], 1)).toEqual(secondFrame);

      clearTile(layer, 1, 0);
      tick(150);
      update.mockClear();
      tick(200);
      tick(1000);

      expect(update).not.toHaveBeenCalled();
      expect(getState(entity).nextFrameChangeTime).toBe(Infinity);
    });

    it('moves the quad, and the mesh’s bounds, for a frame trimmed differently', () => {
      tileSet = createTileSet({
        layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
        sources: [
          {
            atlas: createTextureAtlas(terrainTexture, [
              { name: 'full', x: 0, y: 0, width: 16, height: 16 },
              {
                name: 'trimmed',
                x: 16,
                y: 0,
                width: 8,
                height: 4,
                sourceWidth: 16,
                sourceHeight: 16,
                trimX: 4,
                trimY: 2,
              },
            ]),
            tiles: new Map([
              [
                0,
                {
                  animation: [
                    { tile: 0, durationMilliseconds: 100 },
                    { tile: 1, durationMilliseconds: 100 },
                  ],
                },
              ],
            ]),
          },
        ],
      });

      const { entity, layer } = addLayer();

      setTile(layer, 0, 0, packTile({ source: 0, tile: 0 }));
      tick(0);

      const [mesh] = getMeshes(entity);

      expect(mesh.geometry.bounds).toEqual({
        min: { x: 0, y: 0 },
        max: { x: 16, y: 16 },
      });

      update.mockClear();
      tick(100);

      expect(Object.keys(update.mock.calls[0][0].attributes ?? {})).toContain(
        'a_position',
      );
      expect(mesh.geometry.bounds).toEqual({
        min: { x: 4, y: 2 },
        max: { x: 12, y: 6 },
      });
    });

    it('uses the new tile set’s animations after setTileSet', () => {
      const { entity, layer } = addLayer();

      setTile(layer, 0, 0, water);
      tick(0);
      setTileSet(
        layer,
        createTwoSourceTileSet(
          terrainTexture,
          rockTexture,
          new Map([
            [
              3,
              {
                animation: [
                  { tile: 0, durationMilliseconds: 30 },
                  { tile: 2, durationMilliseconds: 30 },
                ],
              },
            ],
          ]),
        ),
      );
      tick(40);

      expect(topLeftTexCoord(getMeshes(entity)[0], 0)).toEqual({
        x: 0,
        y: 0.5,
      });
      expect(getState(entity).nextFrameChangeTime).toBe(60);
    });

    it.each([
      [
        'setTileSet to a tile set where the tile has no animation',
        (layer: TilemapLayerEcsComponent): void => {
          setTileSet(
            layer,
            createTwoSourceTileSet(terrainTexture, rockTexture),
          );
        },
        ownImage,
      ],
      [
        'replacing the tile with setTile',
        (layer: TilemapLayerEcsComponent): void => {
          setTile(layer, 0, 0, dirt);
        },
        secondFrame,
      ],
    ])(
      'draws the cell’s new tile after %s on a tick its old frame changes',
      (_, edit, image) => {
        const { entity, layer } = addLayer();

        setTile(layer, 0, 0, water);
        tick(0);
        edit(layer);

        expect(() => {
          tick(100);
        }).not.toThrow();
        expect(topLeftTexCoord(getMeshes(entity)[0], 0)).toEqual(image);
        expect(getState(entity).nextFrameChangeTime).toBe(Infinity);
      },
    );

    it('releases the mesh after clearTiles on a tick a frame changes', () => {
      const { entity, layer } = addLayer();

      setTile(layer, 0, 0, water);
      tick(0);

      const [mesh] = getMeshes(entity);

      clearTiles(layer);

      expect(() => {
        tick(100);
      }).not.toThrow();
      expect(world.isAlive(mesh.entity)).toBe(false);
      expect(getState(entity)).toMatchObject({
        chunkMeshes: [],
        nextFrameChangeTime: Infinity,
      });
    });

    it('updates nothing while time stands still', () => {
      const { layer } = addLayer();

      setTile(layer, 0, 0, water);
      tick(60);
      update.mockClear();

      for (let i = 0; i < 10; i++) {
        tick(60);
      }

      expect(update).not.toHaveBeenCalled();
    });

    it('shows the frame written while the context was lost once it is restored', () => {
      const { entity, layer } = addLayer();

      setTile(layer, 0, 0, water);
      tick(0);

      const [mesh] = getMeshes(entity);

      contextLost = true;
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      tick(100);

      const bufferSubData = gl.bufferSubData as Mock;

      bufferSubData.mockClear();
      contextLost = false;
      canvas.dispatchEvent(new Event('webglcontextrestored'));

      expect(topLeftTexCoord(mesh, 0)).toEqual(secondFrame);
      expect(
        bufferSubData.mock.calls.some((call) => call[2] === mesh.texCoords),
      ).toBe(true);
    });
  });
});
