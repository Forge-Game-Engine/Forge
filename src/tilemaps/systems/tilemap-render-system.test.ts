/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  createTransformEcsSystem,
  positionId,
  rotationId,
  scaleId,
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
import { createGridTextureAtlas } from '../../rendering/texture-atlas/index.js';
import { Texture } from '../../rendering/texture.js';
import { getChunkKey } from '../cells/chunk-key.js';
import {
  clearTile,
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
import { createTileSet, TileSet } from '../tile-set/tile-set.js';
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

  const createTexture = (width: number, height: number): Texture => {
    const texture = new Texture(renderContext);
    const image = document.createElement('canvas');

    image.width = width;
    image.height = height;
    texture.update(image);

    return texture;
  };

  const createTwoSourceTileSet = (terrain: Texture, rocks: Texture): TileSet =>
    createTileSet({
      layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
      sources: [
        {
          atlas: createGridTextureAtlas(terrain, {
            cellWidth: 16,
            cellHeight: 16,
          }),
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
    getState(entity).meshes;

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
    system = createTilemapRenderEcsSystem(renderContext);
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
    world.addSystem(createTransformEcsSystem());

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
    world.addSystem(createTilemapRenderEcsSystem(renderContext));

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
});
