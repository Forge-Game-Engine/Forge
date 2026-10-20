import { beforeEach, describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import {
  addTilemapLayerComponent,
  TilemapLayerEcsComponent,
} from '../components/tilemap-layer-component.js';
import { createTestTileSet } from '../test-helpers/create-test-tile-set.js';
import { packTile } from '../tiles/packed-tile.js';
import { setTile } from './edit-tiles.js';
import { forEachTile, getUsedRect } from './read-tiles.js';

describe('forEachTile and getUsedRect', () => {
  let layer: TilemapLayerEcsComponent;

  beforeEach(() => {
    const world = new EcsWorld();

    layer = addTilemapLayerComponent(world, world.createEntity(), {
      tileSet: createTestTileSet(),
    });
  });

  it('visits chunks row-major, and cells row-major within each, whatever the write order', () => {
    const cells: [number, number][] = [
      [40, 40],
      [-5, 3],
      [3, -40],
      [0, 0],
      [-40, 40],
      [1, 0],
      [0, 1],
      [-1, -1],
    ];

    for (const [column, row] of cells) {
      setTile(layer, column, row, packTile({ source: 0, tile: 0 }));
    }

    const visited: string[] = [];

    forEachTile(layer, (column, row) => {
      visited.push(`${column},${row}`);
    });

    expect(visited).toEqual([
      // Chunk row -2.
      '3,-40',
      // Chunk row -1.
      '-1,-1',
      // Chunk row 0, chunk column -1 then 0.
      '-5,3',
      '0,0',
      '1,0',
      '0,1',
      // Chunk row 1, chunk column -2 then 1.
      '-40,40',
      '40,40',
    ]);
  });

  it('passes each cell tile', () => {
    const tile = packTile({ source: 1, tile: 1, transpose: true });
    const seen: number[] = [];

    setTile(layer, -7, 9, tile);
    forEachTile(layer, (_column, _row, visitedTile) => {
      seen.push(visitedTile);
    });

    expect(seen).toEqual([tile]);
  });

  it('finds no used rect for an empty layer', () => {
    expect(getUsedRect(layer)).toBeNull();
  });

  it('finds the used rect of a single negative cell', () => {
    setTile(layer, -70, -3, packTile({ source: 0, tile: 0 }));

    expect(getUsedRect(layer)).toEqual({
      minColumn: -70,
      minRow: -3,
      maxColumn: -70,
      maxRow: -3,
    });
  });

  it('finds the used rect of scattered cells', () => {
    for (const [column, row] of [
      [5, -2],
      [-33, 10],
      [100, 64],
      [0, -90],
    ]) {
      setTile(layer, column, row, packTile({ source: 0, tile: 0 }));
    }

    expect(getUsedRect(layer)).toEqual({
      minColumn: -33,
      minRow: -90,
      maxColumn: 100,
      maxRow: 64,
    });
  });
});
