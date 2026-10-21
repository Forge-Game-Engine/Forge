import { beforeEach, describe, expect, it } from 'vitest';
import { createComponentId, EcsWorld } from '../../ecs/index.js';
import { createOrthogonalGridLayout } from '../../math/index.js';
import {
  addTilemapLayerComponent,
  TilemapLayerEcsComponent,
  tilemapLayerId,
} from '../components/tilemap-layer-component.js';
import {
  createTestSource,
  createTestTileSet,
} from '../test-helpers/create-test-tile-set.js';
import { createTileSet } from '../tile-set/tile-set.js';
import { emptyTile, packTile } from '../tiles/packed-tile.js';
import {
  clearTile,
  clearTiles,
  fillTiles,
  setTile,
  setTileBlock,
  setTileSet,
} from './edit-tiles.js';
import { forEachTile, getTile } from './read-tiles.js';

const grass = packTile({ source: 0, tile: 1 });
const water = packTile({ source: 1, tile: 0, flipX: true });

/** Every stored tile, as `"column,row" -> tile`. */
const contentsOf = (layer: TilemapLayerEcsComponent): Map<string, number> => {
  const contents = new Map<string, number>();

  forEachTile(layer, (column, row, tile) => {
    contents.set(`${column},${row}`, tile);
  });

  return contents;
};

describe('cell functions', () => {
  let world: EcsWorld;
  let entity: number;
  let layer: TilemapLayerEcsComponent;

  beforeEach(() => {
    world = new EcsWorld();
    entity = world.createEntity();
    layer = addTilemapLayerComponent(world, entity, {
      tileSet: createTestTileSet(),
    });
  });

  describe('storage', () => {
    it.each([
      [0, 0],
      [31, 31],
      [32, 32],
      [-1, -1],
      [-32, -33],
      [31, -32],
      [-33, 32],
    ])('sets, gets and clears the cell (%i, %i)', (column, row) => {
      setTile(layer, column, row, water);

      expect(getTile(layer, column, row)).toBe(water);
      expect(contentsOf(layer)).toEqual(new Map([[`${column},${row}`, water]]));

      clearTile(layer, column, row);

      expect(getTile(layer, column, row)).toBe(emptyTile);
      expect(layer.chunks.size).toBe(0);
    });

    it('keeps the cells on each side of every chunk boundary around the origin apart', () => {
      const cells = [-33, -32, -1, 0, 31, 32];
      let index = 0;

      for (const row of cells) {
        for (const column of cells) {
          setTile(layer, column, row, packTile({ source: 0, tile: index % 4 }));
          index++;
        }
      }

      index = 0;

      for (const row of cells) {
        for (const column of cells) {
          expect(getTile(layer, column, row)).toBe(
            packTile({ source: 0, tile: index % 4 }),
          );
          index++;
        }
      }

      expect(layer.chunks.size).toBe(16);
    });

    it('reads an untouched cell as empty without creating a chunk', () => {
      expect(getTile(layer, 5, -7)).toBe(emptyTile);
      expect(layer.chunks.size).toBe(0);
    });

    it('stores cells at the edges of the supported range', () => {
      const edge = 2 ** 30 - 1;

      setTile(layer, edge, -edge - 1, grass);
      setTile(layer, -edge - 1, edge, water);

      expect(getTile(layer, edge, -edge - 1)).toBe(grass);
      expect(getTile(layer, -edge - 1, edge)).toBe(water);
    });

    it.each([
      [2 ** 30, 0],
      [0, -(2 ** 30) - 1],
      [0.5, 0],
      [0, Number.NaN],
    ])('throws for the cell (%s, %s)', (column, row) => {
      expect(() => setTile(layer, column, row, grass)).toThrow(
        /must be whole numbers/,
      );
      expect(() => getTile(layer, column, row)).toThrow(
        /must be whole numbers/,
      );
      expect(() => clearTile(layer, column, row)).toThrow(
        /must be whole numbers/,
      );
    });
  });

  describe('chunks', () => {
    it('counts the tiles of a chunk through writes, overwrites and clears', () => {
      setTile(layer, 0, 0, grass);
      setTile(layer, 1, 0, grass);
      setTile(layer, 1, 0, water);

      const [chunk] = layer.chunks.values();

      expect(chunk.tileCount).toBe(2);

      clearTile(layer, 0, 0);

      expect(chunk.tileCount).toBe(1);

      clearTile(layer, 1, 0);

      expect(layer.chunks.size).toBe(0);
    });

    it('creates exactly the chunks a fill overlaps, and a fill with the empty tile removes them', () => {
      // Columns -40 to 29 and rows -40 to 29 span chunks -2 to 0 on each axis.
      fillTiles(layer, -40, -40, 70, 70, grass);

      const chunkCoordinates = [...layer.chunks.values()].map(
        ({ column, row }) => `${column},${row}`,
      );

      expect(new Set(chunkCoordinates)).toEqual(
        new Set(
          [-2, -1, 0].flatMap((row) =>
            [-2, -1, 0].map((column) => `${column},${row}`),
          ),
        ),
      );
      expect(chunkCoordinates).toHaveLength(9);
      expect(contentsOf(layer).size).toBe(70 * 70);
      expect(getTile(layer, -40, -40)).toBe(grass);
      expect(getTile(layer, 29, 29)).toBe(grass);
      expect(getTile(layer, 30, 29)).toBe(emptyTile);
      expect(getTile(layer, -41, 0)).toBe(emptyTile);

      fillTiles(layer, -40, -40, 70, 70, emptyTile);

      expect(layer.chunks.size).toBe(0);
    });

    it('writes nothing for a fill with no columns or rows', () => {
      fillTiles(layer, 0, 0, 0, 5, grass);
      fillTiles(layer, 0, 0, 5, 0, grass);

      expect(layer.chunks.size).toBe(0);
      expect(layer.version).toBe(0);
    });

    it('clearTiles removes every chunk', () => {
      fillTiles(layer, -10, -10, 50, 50, grass);
      clearTiles(layer);

      expect(layer.chunks.size).toBe(0);
      expect(getTile(layer, 0, 0)).toBe(emptyTile);
    });
  });

  describe('change tracking', () => {
    it('adds one to version per changing call and stamps only the chunks it changed', () => {
      setTile(layer, 0, 0, grass);

      expect(layer.version).toBe(1);

      setTile(layer, 40, 0, grass);

      expect(layer.version).toBe(2);

      const chunkAt = (column: number): number =>
        [...layer.chunks.values()].find((chunk) => chunk.column === column)
          ?.changedAt ?? -1;

      expect(chunkAt(0)).toBe(1);
      expect(chunkAt(1)).toBe(2);

      fillTiles(layer, 0, 0, 64, 1, water);

      expect(layer.version).toBe(3);
      expect(chunkAt(0)).toBe(3);
      expect(chunkAt(1)).toBe(3);
    });

    it('leaves version alone for a call that changes nothing', () => {
      setTile(layer, 3, 3, grass);
      setTile(layer, 3, 3, grass);
      fillTiles(layer, 3, 3, 1, 1, grass);
      clearTile(layer, 50, 50);
      fillTiles(layer, 100, 100, 5, 5, emptyTile);
      setTileSet(layer, layer.tileSet);

      expect(layer.version).toBe(1);

      clearTiles(layer);
      clearTiles(layer);

      expect(layer.version).toBe(2);
    });

    it('stamps every chunk when the tile set changes', () => {
      setTile(layer, 0, 0, grass);
      setTile(layer, 100, 0, grass);
      setTileSet(layer, createTestTileSet());

      expect(layer.version).toBe(3);

      for (const chunk of layer.chunks.values()) {
        expect(chunk.changedAt).toBe(3);
      }
    });
  });

  describe('consumers', () => {
    // What a consumer such as a renderer keeps in its own component on the
    // layer entity: the layer it built from, the version it last processed
    // and a copy of each chunk, standing in for a mesh.
    interface ConsumerState {
      layer: TilemapLayerEcsComponent | null;
      lastVersion: number;
      built: Map<number, Uint32Array>;
    }

    const createConsumer = (
      checksIdentity: boolean,
    ): {
      look: () => void;
      state: () => ConsumerState;
    } => {
      const id = createComponentId<ConsumerState>('testConsumer');

      return {
        state: () => world.getComponentRequired(entity, id),
        look: (): void => {
          const current = world.getComponent(entity, tilemapLayerId);

          if (!current) {
            return;
          }

          const state =
            world.getComponent(entity, id) ??
            world.addComponent(entity, id, {
              layer: null,
              lastVersion: -1,
              built: new Map(),
            });

          if (checksIdentity && current !== state.layer) {
            state.built.clear();
            state.layer = current;
            state.lastVersion = -1;
          }

          if (current.version === state.lastVersion) {
            return;
          }

          for (const [key, chunk] of current.chunks) {
            if (chunk.changedAt > state.lastVersion) {
              state.built.set(key, chunk.tiles.slice());
            }
          }

          for (const key of state.built.keys()) {
            if (!current.chunks.has(key)) {
              state.built.delete(key);
            }
          }

          state.lastVersion = current.version;
        },
      };
    };

    const expectInStep = (
      consumer: ReturnType<typeof createConsumer>,
      current: TilemapLayerEcsComponent,
    ): void => {
      const { built } = consumer.state();

      expect(new Set(built.keys())).toEqual(new Set(current.chunks.keys()));

      for (const [key, chunk] of current.chunks) {
        expect(built.get(key)).toEqual(chunk.tiles);
      }
    };

    it('each see every change without hiding it from the other', () => {
      const eager = createConsumer(true);
      const lazy = createConsumer(true);
      const writes: (() => void)[] = [
        () => setTile(layer, 0, 0, grass),
        () => setTile(layer, 40, 40, water),
        () => fillTiles(layer, -5, -5, 10, 10, grass),
        () => clearTile(layer, 40, 40),
        () => setTile(layer, 40, 40, grass),
        () => setTile(layer, -100, 3, water),
        () => fillTiles(layer, -5, -5, 10, 10, emptyTile),
        () => clearTile(layer, 0, 0),
        () => setTile(layer, 0, 0, water),
      ];

      writes.forEach((write, index) => {
        write();
        eager.look();

        if (index % 3 === 2) {
          lazy.look();
        }
      });

      lazy.look();

      expectInStep(eager, layer);
      expectInStep(lazy, layer);
    });

    it('rebuild a layer replaced on the same entity, which a version-only consumer misses', () => {
      const eager = createConsumer(true);
      const lazy = createConsumer(true);
      const versionOnly = createConsumer(false);
      const consumers = [eager, lazy, versionOnly];

      for (let column = 0; column < 10; column++) {
        setTile(layer, column * 20, 0, grass);
        eager.look();

        if (column % 3 === 0) {
          lazy.look();
        }
      }

      consumers.forEach((consumer) => consumer.look());

      expect(layer.version).toBe(10);

      const replaced = layer;
      const replacement = addTilemapLayerComponent(world, entity, {
        tileSet: createTestTileSet(),
      });

      // Fewer writes than before, so the replacement stays below version
      // 10, in one chunk the old layer used and one it didn't.
      setTile(replacement, 1, 1, water);
      setTile(replacement, 0, 200, water);

      expect(replacement.version).toBeLessThan(replaced.version);

      consumers.forEach((consumer) => consumer.look());

      expectInStep(eager, replacement);
      expectInStep(lazy, replacement);
      expect(eager.state().layer).toBe(replacement);
      expect(lazy.state().layer).toBe(replacement);
      expect(() => expectInStep(versionOnly, replacement)).toThrow();

      world.removeComponent(entity, tilemapLayerId);
      consumers.forEach((consumer) => consumer.look());

      const addedAgain = addTilemapLayerComponent(world, entity, {
        tileSet: createTestTileSet(),
      });

      setTile(addedAgain, 5, 5, grass);
      consumers.forEach((consumer) => consumer.look());

      expectInStep(eager, addedAgain);
      expectInStep(lazy, addedAgain);
    });
  });

  describe('validation', () => {
    it('throws for a tile whose source the tile set does not have, leaving the layer unchanged', () => {
      expect(() =>
        setTile(layer, 3, -2, packTile({ source: 4, tile: 0 })),
      ).toThrow(
        "Unable to set the tile at (3, -2): its source 4 doesn't exist, the tile set has 2 sources.",
      );
      expect(layer.chunks.size).toBe(0);
      expect(layer.version).toBe(0);
    });

    it('throws for a tile index the source does not have', () => {
      expect(() =>
        fillTiles(layer, 0, 0, 2, 2, packTile({ source: 0, tile: 4 })),
      ).toThrow(
        "its tile 4 doesn't exist, source 0 of the tile set has 4 tiles.",
      );
      expect(layer.chunks.size).toBe(0);
    });

    it('throws for a malformed tile', () => {
      expect(() => setTile(layer, 0, 0, 12)).toThrow(/bit 28/);
      expect(() => setTile(layer, 0, 0, -1)).toThrow(/isn't a packed tile/);
    });

    it.each([
      [-1, 1],
      [1, -1],
      [1.5, 1],
    ])('throws for a fill of %s x %s', (columns, rows) => {
      expect(() => fillTiles(layer, 0, 0, columns, rows, grass)).toThrow(
        /whole numbers of 0 or more/,
      );
    });

    it('throws for a fill that reaches past the supported range, without writing', () => {
      expect(() => fillTiles(layer, 2 ** 30 - 2, 0, 5, 1, grass)).toThrow(
        /must be whole numbers/,
      );
      expect(layer.chunks.size).toBe(0);
    });

    it('setTileSet throws for a tile set missing a stored tile, leaving the layer unchanged', () => {
      const original = layer.tileSet;
      const smaller = createTileSet({
        layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
        sources: [createTestSource(2, 2)],
      });

      setTile(layer, 0, 0, grass);
      setTile(layer, -3, 7, water);

      expect(() => setTileSet(layer, smaller)).toThrow(
        "Unable to set the tile set of a tilemap layer: the tile at (-3, 7) isn't in it: its source 1 doesn't exist, the tile set has 1 source.",
      );
      expect(layer.tileSet).toBe(original);
      expect(layer.version).toBe(2);
    });

    it('setTileSet replaces the tile set when every stored tile fits', () => {
      const smaller = createTileSet({
        layout: createOrthogonalGridLayout({ cellWidth: 32, cellHeight: 32 }),
        sources: [createTestSource(2, 2)],
      });

      setTile(layer, 0, 0, grass);
      setTileSet(layer, smaller);

      expect(layer.tileSet).toBe(smaller);
      expect(getTile(layer, 0, 0)).toBe(grass);
    });
  });

  describe('setTileBlock', () => {
    it('writes a row-major block across chunk boundaries at negative cells', () => {
      // A 3 x 2 block straddling the chunks around the origin.
      const tiles = [grass, emptyTile, water, water, grass, emptyTile];

      setTileBlock(layer, -2, -1, 3, 2, tiles);

      expect(contentsOf(layer)).toEqual(
        new Map([
          ['-2,-1', grass],
          ['0,-1', water],
          ['-2,0', water],
          ['-1,0', grass],
        ]),
      );
      // The block's only cell in chunk (0, 0) is empty, so that chunk isn't
      // created.
      expect(layer.chunks.size).toBe(3);
    });

    it('clears the cells of empty entries, removing the chunks it empties', () => {
      fillTiles(layer, 0, 0, 2, 2, grass);
      setTileBlock(layer, 0, 0, 2, 2, [emptyTile, emptyTile, emptyTile, water]);

      expect(contentsOf(layer)).toEqual(new Map([['1,1', water]]));

      setTileBlock(layer, 1, 1, 1, 1, new Uint32Array([emptyTile]));

      expect(layer.chunks.size).toBe(0);
    });

    it('adds one to version and stamps exactly the chunks it changed', () => {
      setTile(layer, 40, 0, grass);
      setTileBlock(layer, 0, 0, 2, 1, [grass, water]);

      expect(layer.version).toBe(2);

      const chunkAt = (column: number): number =>
        [...layer.chunks.values()].find((chunk) => chunk.column === column)
          ?.changedAt ?? -1;

      expect(chunkAt(0)).toBe(2);
      expect(chunkAt(1)).toBe(1);

      // The block reaches into chunk 1, but writes what's already there.
      setTileBlock(layer, 30, 0, 11, 1, [
        water,
        ...new Array<number>(9).fill(emptyTile),
        grass,
      ]);

      expect(layer.version).toBe(3);
      expect(chunkAt(0)).toBe(3);
      expect(chunkAt(1)).toBe(1);
    });

    it('changes nothing for a block equal to what the cells hold', () => {
      setTileBlock(layer, 5, 5, 2, 1, [grass, water]);
      setTileBlock(layer, 5, 5, 2, 1, [grass, water]);
      setTileBlock(layer, 100, 100, 2, 1, [emptyTile, emptyTile]);
      setTileBlock(layer, 0, 0, 0, 3, []);

      expect(layer.version).toBe(1);
      expect(layer.chunks.size).toBe(1);
    });

    it('throws for a bad tile without changing the layer, naming its cell', () => {
      expect(() =>
        setTileBlock(layer, 10, 20, 2, 2, [
          grass,
          grass,
          grass,
          packTile({ source: 3, tile: 0 }),
        ]),
      ).toThrow(
        "Unable to set a block of tiles: the tile for (11, 21) is wrong: its source 3 doesn't exist, the tile set has 2 sources.",
      );
      expect(layer.chunks.size).toBe(0);
      expect(layer.version).toBe(0);
    });

    it('throws for a length that is not columns * rows', () => {
      expect(() => setTileBlock(layer, 0, 0, 2, 2, [grass])).toThrow(
        'Unable to set a block of tiles at (0, 0): a 2 x 2 block needs 4 tiles, but 1 were given.',
      );
    });

    it('throws for a negative size or a block past the supported range', () => {
      expect(() => setTileBlock(layer, 0, 0, -1, 0, [])).toThrow(
        /whole numbers of 0 or more/,
      );
      expect(() =>
        setTileBlock(layer, 2 ** 30 - 1, 0, 2, 1, [grass, grass]),
      ).toThrow(/must be whole numbers from/);
      expect(layer.chunks.size).toBe(0);
    });
  });
});
