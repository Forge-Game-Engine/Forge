/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  positionId,
  rotationId,
  scaleId,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  createIsometricGridLayout,
  createOrthogonalGridLayout,
  GridLayout,
} from '../../math/index.js';
import { addCameraComponent } from '../../rendering/components/camera-component.js';
import {
  addDrawOrderComponent,
  DrawOrderEcsComponent,
  drawOrderId,
} from '../../rendering/components/draw-order-component.js';
import {
  addMeshComponent,
  MeshEcsComponent,
  meshId,
} from '../../rendering/components/mesh-component.js';
import { Geometry } from '../../rendering/geometry/geometry.js';
import { createMeshMaterial } from '../../rendering/materials/mesh-material.js';
import {
  createRenderContext,
  RenderContext,
} from '../../rendering/render-context.js';
import { createRenderEcsSystem } from '../../rendering/systems/render-system.js';
import { createGridTextureAtlas } from '../../rendering/texture-atlas/index.js';
import { Texture } from '../../rendering/texture.js';
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
  TilemapRenderStateEcsComponent,
  tilemapRenderStateId,
  TilemapYSortMesh,
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
    getAttribLocation: vi.fn(() => 0),
    getExtension: vi.fn(() => null),
    checkFramebufferStatus: vi.fn(() => 'FRAMEBUFFER_COMPLETE'),
    FRAMEBUFFER_COMPLETE: 'FRAMEBUFFER_COMPLETE',
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

describe('createTilemapRenderEcsSystem, y-sorted layers', () => {
  let gl: WebGL2RenderingContext;
  let contextLost: boolean;
  let canvas: HTMLCanvasElement;
  let renderContext: RenderContext;
  let world: EcsWorld;
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
    options: {
      layout?: GridLayout;
      terrainTiles?: ReadonlyMap<number, TileDataOptions>;
      rockTileHeight?: number;
    } = {},
  ): TileSet =>
    createTileSet({
      layout:
        options.layout ??
        createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
      sources: [
        {
          atlas: createGridTextureAtlas(terrainTexture, {
            cellWidth: 16,
            cellHeight: 16,
          }),
          tiles: options.terrainTiles,
        },
        {
          atlas: createGridTextureAtlas(rockTexture, {
            cellWidth: 16,
            cellHeight: options.rockTileHeight ?? 16,
          }),
          tileHeight: options.rockTileHeight,
        },
      ],
    });

  const addLayer = (
    drawOrder: Partial<DrawOrderEcsComponent> | null = { ySortChildren: true },
  ): { entity: number; layer: TilemapLayerEcsComponent } => {
    const entity = world.createEntity();

    addPositionComponent(world, entity);

    if (drawOrder) {
      addDrawOrderComponent(world, entity, drawOrder);
    }

    return {
      entity,
      layer: addTilemapLayerComponent(world, entity, { tileSet }),
    };
  };

  const getState = (entity: number): TilemapRenderStateEcsComponent =>
    world.getComponentRequired(entity, tilemapRenderStateId);

  const getMeshes = (entity: number): readonly TilemapYSortMesh[] =>
    getState(entity).ySortMeshes;

  const getMesh = (entity: number, source: number): TilemapYSortMesh => {
    const mesh = getMeshes(entity).find(
      (candidate) => candidate.source === source,
    );

    if (!mesh) {
      throw new Error(`No y-sort mesh of source ${source}.`);
    }

    return mesh;
  };

  const getMeshComponent = (entity: number): MeshEcsComponent =>
    world.getComponentRequired(entity, meshId);

  /**
   * The layer's children in order: each row as `sortY/source`, and any
   * other child as `other`.
   */
  const describeChildren = (entity: number): string[] =>
    world.getChildren(entity).map((child) => {
      for (const mesh of getMeshes(entity)) {
        const row = mesh.rows.find((candidate) => candidate.entity === child);

        if (row) {
          return `${row.sortY}/${mesh.source}`;
        }
      }

      return 'other';
    });

  /** Each section's element range. */
  const describeSections = (
    mesh: TilemapYSortMesh,
  ): { start: number; count: number }[] =>
    mesh.geometry.sections.map(({ start, count }) => ({ start, count }));

  beforeEach(() => {
    contextLost = false;
    gl = createMockGl(() => contextLost);
    canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(gl);
    renderContext = createRenderContext(canvas);
    world = new EcsWorld();
    now = 0;
    time = new Time();
    vi.spyOn(time, 'timeInMilliseconds', 'get').mockImplementation(() => now);
    world.addSystem(createTilemapRenderEcsSystem(renderContext, time));
    terrainTexture = createTexture(32, 32);
    rockTexture = createTexture(32, 32);
    tileSet = createTwoSourceTileSet();
  });

  it('builds one geometry per source, with one section and one child entity per sort row', () => {
    const { entity, layer } = addLayer();

    fillTiles(layer, 0, 0, 3, 2, grass);
    setTile(layer, 40, 0, grass);
    setTile(layer, 5, 3, rock);
    world.update();

    const state = getState(entity);

    expect(state.ySorted).toBe(true);
    expect(state.chunkMeshes).toEqual([]);
    expect(getMeshes(entity).map((mesh) => mesh.source)).toEqual([0, 1]);

    const terrain = getMesh(entity, 0);

    expect(terrain.tileCount).toBe(7);
    expect(terrain.rows.map((row) => row.sortY)).toEqual([8, 24]);
    expect(describeSections(terrain)).toEqual([
      { start: 0, count: 24 },
      { start: 24, count: 18 },
    ]);
    expect(getMesh(entity, 1).rows.map((row) => row.sortY)).toEqual([56]);

    for (const mesh of getMeshes(entity)) {
      for (const [section, row] of mesh.rows.entries()) {
        const meshComponent = getMeshComponent(row.entity);

        expect(world.getParent(row.entity)).toBe(entity);
        expect(meshComponent.geometry).toBe(mesh.geometry);
        expect(meshComponent.material).toBe(state.materials.get(mesh.source));
        expect(meshComponent.section).toBe(section);
        expect(world.getComponentRequired(row.entity, drawOrderId)).toEqual({
          order: 0,
          behindParent: false,
          ySortChildren: false,
          ySortOrigin: row.sortY,
        });
        expect(
          world.getComponentRequired(row.entity, positionId).local,
        ).toEqual({ x: 0, y: 0 });
        expect(world.getComponentRequired(row.entity, rotationId).local).toBe(
          0,
        );
        expect(world.getComponentRequired(row.entity, scaleId).local).toEqual({
          x: 1,
          y: 1,
        });
      }
    }
  });

  it('gives every row entity the layer’s world transform once the transform system runs', () => {
    world.addSystem(createTransformEcsSystem(time));

    const { entity, layer } = addLayer();

    world.getComponentRequired(entity, positionId).local = { x: 10, y: 20 };
    addRotationComponent(world, entity, { local: 0.5 });
    setTile(layer, 0, 0, grass);
    setTile(layer, 0, 4, grass);
    world.update();

    for (const { entity: row } of getMesh(entity, 0).rows) {
      expect(world.getComponentRequired(row, positionId).world).toEqual({
        x: 10,
        y: 20,
      });
      expect(world.getComponentRequired(row, rotationId).world).toBe(0.5);
    }
  });

  it('puts isometric cells with the same column + row in one row', () => {
    tileSet = createTwoSourceTileSet({
      layout: createIsometricGridLayout({ cellWidth: 32, cellHeight: 16 }),
    });

    const { entity, layer } = addLayer();

    fillTiles(layer, 0, 0, 3, 3, grass);
    world.update();

    const mesh = getMesh(entity, 0);

    // Diagonals of 1, 2, 3, 2 and 1 cells.
    expect(mesh.rows.map((row) => row.sortY)).toEqual([8, 16, 24, 32, 40]);
    expect(describeSections(mesh).map((section) => section.count)).toEqual([
      6, 12, 18, 12, 6,
    ]);
  });

  it('sorts a row at its tiles’ ySortOrigin', () => {
    tileSet = createTwoSourceTileSet({
      terrainTiles: new Map([[1, { ySortOrigin: 8 }]]),
    });

    const { entity, layer } = addLayer();

    fillTiles(layer, 0, 0, 3, 1, grass);
    setTile(layer, 1, 0, dirt);
    world.update();

    const { rows } = getMesh(entity, 0);

    expect(rows.map((row) => row.sortY)).toEqual([8, 16]);
    expect(
      world.getComponentRequired(rows[1].entity, drawOrderId).ySortOrigin,
    ).toBe(16);
  });

  it('bounds a row’s section by its tiles, including a tall tile’s overhang', () => {
    tileSet = createTwoSourceTileSet({ rockTileHeight: 32 });

    const { entity, layer } = addLayer();

    setTile(layer, 2, 3, rock);
    setTile(layer, 4, 3, rock);
    world.update();

    // The 16 x 32 image stands on its cell's footprint and reaches a cell
    // above it.
    expect(getMesh(entity, 1).geometry.sections[0].bounds).toEqual({
      min: { x: 32, y: 32 },
      max: { x: 80, y: 64 },
    });
  });

  it('keeps row entities in ascending sort Y, then source, among the layer’s children', () => {
    const { entity, layer } = addLayer();

    // Both sources share both rows, so every row of both is new at once.
    setTile(layer, 0, 0, grass);
    setTile(layer, 1, 0, rock);
    setTile(layer, 0, 2, grass);
    setTile(layer, 1, 2, rock);
    world.update();

    expect(describeChildren(entity)).toEqual(['8/0', '8/1', '40/0', '40/1']);

    // The game's own child stays where the game moves it.
    const prop = world.createEntity();

    world.setParent(prop, entity);
    world.setSiblingIndex(prop, 0);

    setTile(layer, 0, 1, rock);
    setTile(layer, 0, 3, grass);
    world.update();

    expect(describeChildren(entity)).toEqual([
      'other',
      '8/0',
      '8/1',
      '24/1',
      '40/0',
      '40/1',
      '56/0',
    ]);
  });

  it('adds and removes row entities as rows appear and empty, and keeps the rest', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    setTile(layer, 0, 2, grass);
    world.update();

    const mesh = getMesh(entity, 0);
    const [first, last] = mesh.rows;
    const update = vi.spyOn(Geometry.prototype, 'update');
    const createBuffer = gl.createBuffer as Mock;
    const buffersBefore = createBuffer.mock.calls.length;

    setTile(layer, 3, 1, grass);
    world.update();

    expect(mesh.rows).toHaveLength(3);
    expect(mesh.rows[0]).toBe(first);
    expect(mesh.rows[2]).toBe(last);
    expect(getMeshComponent(last.entity).section).toBe(2);
    expect(update.mock.contexts).toEqual([mesh.geometry]);
    expect(createBuffer.mock.calls).toHaveLength(buffersBefore);

    clearTile(layer, 0, 0);
    world.update();

    expect(world.isAlive(first.entity)).toBe(false);
    expect(mesh.rows.map((row) => row.sortY)).toEqual([24, 40]);
    expect(getMeshComponent(last.entity).section).toBe(1);
    expect(describeSections(mesh)).toEqual([
      { start: 0, count: 6 },
      { start: 6, count: 6 },
    ]);

    // An edit that keeps every row keeps every entity.
    const entities = mesh.rows.map((row) => row.entity);

    update.mockClear();
    setTile(layer, 1, 2, grass);
    world.update();

    expect(mesh.rows.map((row) => row.entity)).toEqual(entities);
    expect(update).toHaveBeenCalledOnce();
  });

  it('rebuilds only the sources held by the chunks an edit touched', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    setTile(layer, 40, 0, rock);
    world.update();

    const update = vi.spyOn(Geometry.prototype, 'update');

    setTile(layer, 41, 1, rock);
    world.update();

    expect(update.mock.contexts).toEqual([getMesh(entity, 1).geometry]);

    // Emptying a chunk rebuilds the sources it held.
    setTile(layer, 80, 0, grass);
    world.update();
    clearTile(layer, 80, 0);
    update.mockClear();
    world.update();

    expect(update.mock.contexts).toEqual([getMesh(entity, 0).geometry]);
  });

  it('uses 32-bit indices once a source has more than 16,384 tiles', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    world.update();

    const mesh = getMesh(entity, 0);

    expect(mesh.indices).toBeInstanceOf(Uint16Array);

    fillTiles(layer, 0, 0, 129, 128, grass);
    world.update();

    expect(mesh.tileCount).toBe(129 * 128);
    expect(mesh.indices).toBeInstanceOf(Uint32Array);
    expect(mesh.geometry.elementCount).toBe(129 * 128 * 6);
  });

  it('builds a new row entity in the same place for one game code removed', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    setTile(layer, 0, 1, grass);
    world.update();

    const mesh = getMesh(entity, 0);
    const removed = mesh.rows[0].entity;

    world.removeEntity(removed);
    setTile(layer, 1, 1, grass);
    world.update();

    expect(mesh.rows[0].entity).not.toBe(removed);
    expect(world.getChildren(entity)).toEqual(
      mesh.rows.map((row) => row.entity),
    );
    expect(getMeshComponent(mesh.rows[0].entity).section).toBe(0);
  });

  it('switches between chunk meshes and rows on the tick after ySortChildren changes', () => {
    const { entity, layer } = addLayer(null);

    setTile(layer, 0, 0, grass);
    setTile(layer, 0, 1, rock);
    world.update();

    const chunkEntities = getState(entity).chunkMeshes.map(
      (mesh) => mesh.entity,
    );

    expect(chunkEntities).toHaveLength(2);
    expect(getMeshes(entity)).toEqual([]);

    const drawOrder = addDrawOrderComponent(world, entity, {
      ySortChildren: true,
    });

    world.update();

    expect(getState(entity).chunkMeshes).toEqual([]);
    expect(getMeshes(entity)).toHaveLength(2);

    for (const chunkEntity of chunkEntities) {
      expect(world.isAlive(chunkEntity)).toBe(false);
    }

    const [terrain] = getMeshes(entity);
    const dispose = vi.spyOn(terrain.geometry, 'dispose');

    drawOrder.ySortChildren = false;
    world.update();

    expect(dispose).toHaveBeenCalledOnce();
    expect(world.isAlive(terrain.rows[0].entity)).toBe(false);
    expect(getState(entity).chunkMeshes).toHaveLength(2);
    expect(getMeshes(entity)).toEqual([]);

    drawOrder.ySortChildren = true;
    world.update();

    expect(getMeshes(entity)).toHaveLength(2);
    expect(getState(entity).chunkMeshes).toEqual([]);

    world.removeComponent(entity, drawOrderId);
    world.update();

    expect(getState(entity).chunkMeshes).toHaveLength(2);
    expect(getMeshes(entity)).toEqual([]);
    expect(world.getChildren(entity)).toHaveLength(2);
  });

  it('removes the meshes and materials of sources a smaller replacement tile set lacks', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    setTile(layer, 1, 0, rock);
    world.update();

    const rocks = getMesh(entity, 1);
    const dispose = vi.spyOn(rocks.geometry, 'dispose');

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

    expect(dispose).toHaveBeenCalledOnce();
    expect(world.isAlive(rocks.rows[0].entity)).toBe(false);
    expect(getMeshes(entity).map((mesh) => mesh.source)).toEqual([0]);
    expect([...getState(entity).materials.keys()]).toEqual([0]);
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
  ])('removes the row entities when %s is removed', (_, remove) => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    setTile(layer, 0, 1, grass);
    setTile(layer, 0, 2, rock);
    world.update();

    const meshes = getMeshes(entity);
    const disposes = meshes.map((mesh) => vi.spyOn(mesh.geometry, 'dispose'));

    remove(world, entity);
    world.update();

    for (const [index, mesh] of meshes.entries()) {
      for (const row of mesh.rows) {
        expect(world.isAlive(row.entity)).toBe(false);
      }

      expect(disposes[index]).toHaveBeenCalledOnce();
    }
  });

  it('copies the category and draw layer onto every row, on build and when they change', () => {
    const { entity, layer } = addLayer();

    layer.category = 4;
    layer.layer = 2;
    setTile(layer, 0, 0, grass);
    setTile(layer, 0, 1, rock);
    world.update();

    const rows = getMeshes(entity).flatMap((mesh) => mesh.rows);

    for (const row of rows) {
      expect(getMeshComponent(row.entity)).toMatchObject({
        category: 4,
        layer: 2,
      });
    }

    layer.category = 8;
    layer.layer = -1;
    world.update();

    for (const row of rows) {
      expect(getMeshComponent(row.entity)).toMatchObject({
        category: 8,
        layer: -1,
      });
    }
  });

  it('draws the latest tiles after a context lost while they were edited is restored', () => {
    const { entity, layer } = addLayer();

    setTile(layer, 0, 0, grass);
    world.update();

    const mesh = getMesh(entity, 0);

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
    expect([...mesh.positions.subarray(8, 10)]).toEqual([48, 0]);
    expect(mesh.geometry.vertexCount).toBe(8);
  });

  describe('animated tiles', () => {
    // Terrain tile 3 animates: 100 ms of its own image (the atlas's
    // bottom-right quarter), then 100 ms of tile 1's (its top-right).
    const water = packTile({ source: 0, tile: 3 });

    beforeEach(() => {
      tileSet = createTwoSourceTileSet({
        terrainTiles: new Map([
          [
            3,
            {
              animation: [
                { tile: 3, durationMilliseconds: 100 },
                { tile: 1, durationMilliseconds: 100 },
              ],
            },
          ],
        ]),
      });
    });

    const topLeftTexCoord = (
      mesh: TilemapYSortMesh,
      quad: number,
    ): { x: number; y: number } => ({
      x: mesh.texCoords[quad * 8],
      y: mesh.texCoords[quad * 8 + 1],
    });

    const tick = (milliseconds: number): void => {
      now = milliseconds;
      world.update();
    };

    it('rewrites the animated quads of only the meshes holding the tile', () => {
      const { entity, layer } = addLayer();

      setTile(layer, 0, 0, grass);
      setTile(layer, 0, 1, water);
      setTile(layer, 1, 1, rock);
      tick(0);

      const terrain = getMesh(entity, 0);

      expect(topLeftTexCoord(terrain, 1)).toEqual({ x: 0.5, y: 0.5 });

      const update = vi.spyOn(Geometry.prototype, 'update');

      tick(50);

      expect(update).not.toHaveBeenCalled();

      tick(100);

      expect(update.mock.contexts).toEqual([terrain.geometry]);
      expect(update.mock.calls[0][0].attributes).not.toHaveProperty(
        'a_position',
      );
      expect(topLeftTexCoord(terrain, 0)).toEqual({ x: 0, y: 0 });
      expect(topLeftTexCoord(terrain, 1)).toEqual({ x: 0.5, y: 0 });
    });

    it('updates a mesh once on a tick that both edits its source and changes a frame', () => {
      const { entity, layer } = addLayer();

      setTile(layer, 0, 0, water);
      tick(0);

      const update = vi.spyOn(Geometry.prototype, 'update');

      setTile(layer, 0, 1, water);
      tick(100);

      const mesh = getMesh(entity, 0);

      expect(update.mock.contexts).toEqual([mesh.geometry]);
      expect(topLeftTexCoord(mesh, 0)).toEqual({ x: 0.5, y: 0 });
      expect(topLeftTexCoord(mesh, 1)).toEqual({ x: 0.5, y: 0 });
    });

    it('stops animating a mesh once its animated tiles are cleared', () => {
      const { entity, layer } = addLayer();

      setTile(layer, 0, 0, water);
      tick(0);
      clearTiles(layer);

      expect(() => {
        tick(100);
      }).not.toThrow();
      expect(getState(entity)).toMatchObject({
        ySortMeshes: [],
        nextFrameChangeTime: Infinity,
      });
    });
  });

  describe('with the render system', () => {
    let drawElements: Mock;
    let material: ReturnType<typeof createMeshMaterial>;

    beforeEach(() => {
      world.addSystem(createTransformEcsSystem(time));
      world.addSystem(createRenderEcsSystem(renderContext));
      drawElements = gl.drawElements as Mock;
      material = createMeshMaterial(
        renderContext,
        'tilemap.vert',
        'tilemap.frag',
      );
    });

    /** A y-sorting camera that sees every tile the tests place. */
    const addCamera = (ySort: boolean): void => {
      const camera = world.createEntity();

      addPositionComponent(world, camera, { local: { x: 64, y: 64 } });
      addCameraComponent(world, camera, { ySort, verticalWorldUnits: 1000 });
    };

    /** A root mesh (a stand-in for a character) sorted at `y`. */
    const addCharacter = (y: number): number => {
      const character = world.createEntity();

      addPositionComponent(world, character, { local: { x: 0, y } });
      addMeshComponent(world, character, {
        geometry: new Geometry(renderContext, {
          attributes: [
            {
              name: 'a_position',
              data: new Float32Array([0, 0, 1, 0, 1, 1]),
              size: 2,
            },
          ],
        }),
        material,
      });

      return character;
    };

    /** A map root that hands its layer to the y-sort. */
    const addYSortedMap = (): {
      entity: number;
      layer: TilemapLayerEcsComponent;
    } => {
      const root = world.createEntity();

      addPositionComponent(world, root);
      addDrawOrderComponent(world, root, { ySortChildren: true });

      const added = addLayer();

      world.setParent(added.entity, root);

      return added;
    };

    const drawCount = (): number => {
      drawElements.mockClear();
      world.update();

      return drawElements.mock.calls.length;
    };

    it('draws every row of a source in one call when nothing sorts between them', () => {
      addCamera(true);

      const { layer } = addYSortedMap();

      fillTiles(layer, 0, 0, 4, 4, grass);

      expect(drawCount()).toBe(1);
    });

    it('splits the layer’s draw where a sort unit sorts between its rows', () => {
      addCamera(true);

      const { layer } = addYSortedMap();

      fillTiles(layer, 0, 0, 4, 4, grass);
      addCharacter(30);

      // Rows 8 and 24, the character, then rows 40 and 56. The character's
      // geometry has no indices, so it draws with drawArrays.
      expect(drawCount()).toBe(2);
    });

    it('splits the layer’s draw around a culled row between two visible ones', () => {
      addCamera(true);

      const { layer } = addYSortedMap();

      fillTiles(layer, 0, 0, 4, 1, grass);
      fillTiles(layer, 0, 2, 4, 1, grass);
      // The middle row's only tile is in view.
      setTile(layer, 3, 1, grass);

      expect(drawCount()).toBe(1);

      // Now it's far to the right of the view, so its row is culled.
      clearTile(layer, 3, 1);
      setTile(layer, 200, 1, grass);

      expect(drawCount()).toBe(2);
    });

    it('draws a layer whose map root doesn’t y-sort as one unit, in one call', () => {
      addCamera(true);

      const root = world.createEntity();

      addPositionComponent(world, root);

      const { entity, layer } = addLayer();

      world.setParent(entity, root);
      fillTiles(layer, 0, 0, 4, 4, grass);
      addCharacter(30);

      expect(drawCount()).toBe(1);
    });

    it('draws the rows back to front, in one call, under a camera without ySort', () => {
      addCamera(false);

      const { layer } = addYSortedMap();

      fillTiles(layer, 0, 0, 4, 4, grass);

      expect(drawCount()).toBe(1);
      expect(drawElements.mock.calls[0][1]).toBe(16 * 6);
    });
  });
});
