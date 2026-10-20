import { beforeEach, describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import { Color } from '../../rendering/color.js';
import { createTestTileSet } from '../test-helpers/create-test-tile-set.js';
import {
  addTilemapLayerComponent,
  TilemapChunk,
  tilemapLayerId,
} from './tilemap-layer-component.js';

describe('addTilemapLayerComponent', () => {
  let world: EcsWorld;
  let entity: number;

  beforeEach(() => {
    world = new EcsWorld();
    entity = world.createEntity();
  });

  it('attaches an empty layer with the defaults', () => {
    const tileSet = createTestTileSet();
    const layer = addTilemapLayerComponent(world, entity, { tileSet });

    expect(layer).toEqual({
      tileSet,
      tintColor: Color.white,
      category: 1,
      layer: 0,
      chunks: new Map(),
      version: 0,
    });
  });

  it('keeps the options it is given', () => {
    const tintColor = new Color(1, 0, 0, 0.5);
    const layer = addTilemapLayerComponent(world, entity, {
      tileSet: createTestTileSet(),
      tintColor,
      category: 4,
      layer: 2,
    });

    expect(layer.tintColor).toBe(tintColor);
    expect(layer.category).toBe(4);
    expect(layer.layer).toBe(2);
  });

  it('returns the stored component', () => {
    const layer = addTilemapLayerComponent(world, entity, {
      tileSet: createTestTileSet(),
    });

    expect(world.getComponent(entity, tilemapLayerId)).toBe(layer);
  });

  it('gives every layer its own chunk storage', () => {
    const tileSet = createTestTileSet();
    const first = addTilemapLayerComponent(world, entity, { tileSet });
    const second = addTilemapLayerComponent(world, world.createEntity(), {
      tileSet,
    });

    expect(first.chunks).not.toBe(second.chunks);
  });

  it('keeps the outputs readonly and the rendering fields writable', () => {
    const layer = addTilemapLayerComponent(world, entity, {
      tileSet: createTestTileSet(),
    });
    const chunk: TilemapChunk = {
      column: 0,
      row: 0,
      tiles: new Uint32Array(1),
      tileCount: 1,
      changedAt: 1,
    };

    // Type-level checks: these assignments must not compile.
    const assignOutputs = (): void => {
      // @ts-expect-error `version` is written only by the cell functions.
      layer.version = 3;
      // @ts-expect-error `tileSet` is changed with `setTileSet`.
      layer.tileSet = createTestTileSet();
      // @ts-expect-error `tileCount` is written only by the cell functions.
      chunk.tileCount = 0;
      // @ts-expect-error `changedAt` is written only by the cell functions.
      chunk.changedAt = 0;
    };

    layer.tintColor = Color.black;
    layer.category = 2;
    layer.layer = 1;

    expect(assignOutputs).toBeTypeOf('function');
    expect(layer.layer).toBe(1);
  });
});
