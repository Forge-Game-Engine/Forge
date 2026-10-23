import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { degreesToRadians, Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import { getTileData, type TileSet } from '../tile-set/tile-set.js';
import { emptyTile, packTile } from '../tiles/packed-tile.js';
import {
  createFakeTiledRenderContext,
  editFixture,
  fixtureFiles,
  fixturesUrl,
  getJsonAt,
  JsonPath,
  serveFiles,
} from './test-helpers/fake-tiled-files.js';
import { TiledMapCache } from './tiled-map-cache.js';
import type {
  TiledGroupLayer,
  TiledLayer,
  TiledMap,
  TiledObject,
  TiledObjectLayer,
  TiledTileLayer,
} from './tiled-map.js';

const orthogonalUrl = `${fixturesUrl}maps/orthogonal.tmj`;
const isometricUrl = `${fixturesUrl}maps/isometric.tmj`;
const infiniteUrl = `${fixturesUrl}maps/infinite.tmj`;
const badUrl = `${fixturesUrl}maps/bad.tmj`;

const terrain = (
  tile: number,
  fields: { flipX?: boolean; flipY?: boolean; transpose?: boolean } = {},
): number => packTile({ source: 0, tile, ...fields });

const props = (tile: number, flipX = false, flipY = false): number =>
  packTile({ source: 1, tile, flipX, flipY });

const load = async (
  url: string = orthogonalUrl,
): Promise<{ map: TiledMap; cache: TiledMapCache }> => {
  const cache = new TiledMapCache(createFakeTiledRenderContext().renderContext);

  return { map: await cache.getOrLoad(url), cache };
};

type JsonEdit = readonly [JsonPath, unknown];

/** Loads a fixture map, served from `maps/bad.tmj`, with some of its fields changed. */
const loadEditedFixture = (
  path: string,
  ...edits: readonly JsonEdit[]
): Promise<TiledMap> => {
  serveFiles({ ...fixtureFiles, [badUrl]: editFixture(path, ...edits) });

  return new TiledMapCache(
    createFakeTiledRenderContext().renderContext,
  ).getOrLoad(badUrl);
};

/** Loads the orthogonal fixture map with some of its fields changed. */
const loadEdited = (...edits: readonly JsonEdit[]): Promise<TiledMap> =>
  loadEditedFixture('maps/orthogonal.tmj', ...edits);

const tileLayer = (
  layers: readonly TiledLayer[],
  index: number,
): TiledTileLayer => {
  const layer = layers[index];

  if (layer.kind !== 'tiles') {
    throw new Error(`Layer ${index} isn't a tile layer.`);
  }

  return layer;
};

const groupLayer = (
  layers: readonly TiledLayer[],
  index: number,
): TiledGroupLayer => {
  const layer = layers[index];

  if (layer.kind !== 'group') {
    throw new Error(`Layer ${index} isn't a group layer.`);
  }

  return layer;
};

const objectLayer = (
  layers: readonly TiledLayer[],
  index: number,
): TiledObjectLayer => {
  const layer = layers[index];

  if (layer.kind !== 'objects') {
    throw new Error(`Layer ${index} isn't an object layer.`);
  }

  return layer;
};

const objectNamed = (layer: TiledObjectLayer, name: string): TiledObject => {
  const object = layer.objects.find((candidate) => candidate.name === name);

  if (!object) {
    throw new Error(`No object "${name}".`);
  }

  return object;
};

const expectPointsClose = (
  actual: readonly Vector2[],
  expected: readonly Vector2[],
): void => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((point, index) => {
    expect(point.x).toBeCloseTo(expected[index].x, 9);
    expect(point.y).toBeCloseTo(expected[index].y, 9);
  });
};

/** Sorts points top to bottom, then left to right, ignoring rounding errors. */
const sortPoints = (points: readonly Vector2[]): Vector2[] => {
  const round = (value: number): number => Math.round(value * 1e6);

  return [...points].sort(
    (a, b) => round(a.y) - round(b.y) || round(a.x) - round(b.x),
  );
};

const collisionPolygon = (
  tileSet: TileSet,
  tile: number,
): readonly Readonly<Vector2>[] => {
  const { collision } = getTileData(tileSet, tile);

  if (collision === null || collision === 'cell') {
    throw new Error(`Expected a collision polygon, got ${String(collision)}.`);
  }

  return collision;
};

/** The gids of the orthogonal fixture's Ground layer. */
const groundGids = (): number[] => {
  const data = getJsonAt(JSON.parse(fixtureFiles[orthogonalUrl]), [
    'layers',
    0,
    'data',
  ]);

  if (!Array.isArray(data)) {
    throw new Error('No Ground data.');
  }

  return data.map(Number);
};

const toBase64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));

const gidBytes = (gids: readonly number[]): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(gids.length * 4);
  const view = new DataView(bytes.buffer);

  gids.forEach((gid, index) => {
    view.setUint32(index * 4, gid, true);
  });

  return bytes;
};

/** Compresses bytes the way Tiled does, with the counterpart of what the loader decodes with. */
const compress = async (
  bytes: Uint8Array<ArrayBuffer>,
  format: CompressionFormat,
): Promise<Uint8Array> => {
  const reader = new ReadableStream<BufferSource>({
    start(controller): void {
      controller.enqueue(bytes);
      controller.close();
    },
  })
    .pipeThrough(new CompressionStream(format))
    .getReader();
  const parts: number[] = [];

  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();

    if (done) {
      return Uint8Array.from(parts);
    }

    parts.push(...value);
  }
};

describe('TiledMapCache', () => {
  beforeEach(() => {
    serveFiles();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('loading', () => {
    it('throws when getting a map that has not been loaded', () => {
      const cache = new TiledMapCache(
        createFakeTiledRenderContext().renderContext,
      );

      expect(() => cache.get('maps/orthogonal.tmj')).toThrow(
        `Tiled map "${orthogonalUrl}" not found in the cache.`,
      );
    });

    it('resolves the map URL against the page, so every form of it names one entry', async () => {
      const fetch = serveFiles();
      const cache = new TiledMapCache(
        createFakeTiledRenderContext().renderContext,
      );
      const map = await cache.getOrLoad('maps/orthogonal.tmj');

      expect(map.url).toBe(orthogonalUrl);
      expect(await cache.getOrLoad('/maps/orthogonal.tmj')).toBe(map);
      expect(await cache.getOrLoad(orthogonalUrl)).toBe(map);
      expect(cache.get('maps/orthogonal.tmj')).toBe(map);
      expect(
        fetch.mock.calls.filter(([url]) => url === orthogonalUrl),
      ).toHaveLength(1);
    });

    it('resolves tilesets, templates and images against the file that names them', async () => {
      const fetch = serveFiles();
      const { renderContext, getOrLoad } = createFakeTiledRenderContext();

      await new TiledMapCache(renderContext).getOrLoad(orthogonalUrl);

      expect(
        fetch.mock.calls
          .map(([url]) => String(url))
          .sort((a, b) => a.localeCompare(b)),
      ).toEqual([
        orthogonalUrl,
        `${fixturesUrl}templates/chest.tj`,
        `${fixturesUrl}tilesets/props.tsj`,
      ]);
      // The embedded tileset's image is beside the map, the external one's
      // beside its .tsj.
      expect(getOrLoad.mock.calls).toEqual([
        [`${fixturesUrl}maps/terrain.png`, { filter: 'nearest' }],
        [`${fixturesUrl}tilesets/props.png`, { filter: 'nearest' }],
      ]);
    });

    it('loads images with the filter it is given', async () => {
      const { renderContext, getOrLoad } = createFakeTiledRenderContext();

      await new TiledMapCache(renderContext).getOrLoad(infiniteUrl, {
        filter: 'linear',
      });

      expect(getOrLoad).toHaveBeenCalledWith(
        `${fixturesUrl}images/terrain.png`,
        { filter: 'linear' },
      );
    });

    it('shares one load between concurrent requests for the same map', async () => {
      const fetch = serveFiles();
      const cache = new TiledMapCache(
        createFakeTiledRenderContext().renderContext,
      );
      const [first, second] = await Promise.all([
        cache.getOrLoad(orthogonalUrl),
        cache.getOrLoad('maps/orthogonal.tmj', { filter: 'nearest' }),
      ]);

      expect(second).toBe(first);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('fetches a tileset two maps share once, and shares its atlas', async () => {
      const copyUrl = `${fixturesUrl}maps/copy.tmj`;
      const fetch = serveFiles({
        ...fixtureFiles,
        [copyUrl]: fixtureFiles[orthogonalUrl],
      });
      const cache = new TiledMapCache(
        createFakeTiledRenderContext().renderContext,
      );
      const [first, second] = await Promise.all([
        cache.getOrLoad(orthogonalUrl),
        cache.getOrLoad(copyUrl),
      ]);

      expect(
        fetch.mock.calls.filter(
          ([url]) => url === `${fixturesUrl}tilesets/props.tsj`,
        ),
      ).toHaveLength(1);
      expect(
        fetch.mock.calls.filter(
          ([url]) => url === `${fixturesUrl}templates/chest.tj`,
        ),
      ).toHaveLength(1);
      expect(second.tileSet).not.toBe(first.tileSet);
      expect(second.tileSet.sources[1].atlas).toBe(
        first.tileSet.sources[1].atlas,
      );
    });

    it('throws when a map is requested with a second filter', async () => {
      const cache = new TiledMapCache(
        createFakeTiledRenderContext().renderContext,
      );

      await cache.getOrLoad(orthogonalUrl);

      await expect(
        cache.getOrLoad(orthogonalUrl, { filter: 'linear' }),
      ).rejects.toThrow(
        `Tiled map "${orthogonalUrl}" was already requested with filter "nearest", so it can't also be loaded with filter "linear".`,
      );
    });

    it('loads again after a failed load', async () => {
      serveFiles({});

      const cache = new TiledMapCache(
        createFakeTiledRenderContext().renderContext,
      );

      await expect(cache.getOrLoad(orthogonalUrl)).rejects.toThrow(
        `Unable to load Tiled map "${orthogonalUrl}": failed to fetch "${orthogonalUrl}": 404 Not Found`,
      );

      serveFiles();

      const map = await cache.getOrLoad(orthogonalUrl, { filter: 'linear' });

      expect(cache.get(orthogonalUrl)).toBe(map);
    });

    it('names an external tileset that fails to fetch, and loads it once it can', async () => {
      const files: Record<string, string> = { ...fixtureFiles };

      delete files[`${fixturesUrl}tilesets/props.tsj`];
      serveFiles(files);

      const cache = new TiledMapCache(
        createFakeTiledRenderContext().renderContext,
      );

      await expect(cache.getOrLoad(orthogonalUrl)).rejects.toThrow(
        `failed to fetch "${fixturesUrl}tilesets/props.tsj": 404 Not Found`,
      );

      serveFiles();

      await expect(cache.getOrLoad(orthogonalUrl)).resolves.toBeDefined();
    });

    it('keeps the original error as the cause', async () => {
      serveFiles({ [orthogonalUrl]: { orientation: 'staggered' } });

      const error: unknown = await new TiledMapCache(
        createFakeTiledRenderContext().renderContext,
      )
        .getOrLoad(orthogonalUrl)
        .catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(Error);
      expect(((error as Error).cause as Error).message).toMatch(
        /^Invalid Tiled map JSON/,
      );
    });
  });

  describe('maps and tilesets', () => {
    it('lays out an orthogonal map with its tile size', async () => {
      const { map } = await load();

      expect(map.orientation).toBe('orthogonal');
      expect(map.tileSet.layout.cellWidth).toBe(16);
      expect(map.tileSet.layout.cellHeight).toBe(16);
      expect(map.tileSet.layout.getCellCenter(1, 0)).toEqual({ x: 24, y: 8 });
      expect(map.size).toEqual({ columns: 4, rows: 3 });
      expect(Object.isFrozen(map)).toBe(true);
    });

    it('lays out an isometric map with its tile size as the diamond', async () => {
      const { map } = await load(isometricUrl);

      expect(map.orientation).toBe('isometric');
      expect(map.tileSet.layout.cellWidth).toBe(64);
      expect(map.tileSet.layout.cellHeight).toBe(32);
      expect(map.tileSet.layout.getCellPolygon(0, 0)).toEqual([
        { x: 0, y: 0 },
        { x: 32, y: 16 },
        { x: 0, y: 32 },
        { x: -32, y: 16 },
      ]);
    });

    it('makes one source per tileset, in firstgid order', async () => {
      const { map } = await load();

      expect(map.tileSet.sources).toHaveLength(2);
      expect(map.tileSets).toEqual([
        {
          name: 'terrain',
          firstGid: 1,
          tileCount: 4,
          url: null,
          properties: {},
        },
        {
          name: 'props',
          firstGid: 10,
          tileCount: 3,
          url: `${fixturesUrl}tilesets/props.tsj`,
          properties: { theme: { type: 'string', value: 'castle' } },
        },
      ]);
    });

    it('cuts the image by tile size, margin, spacing and columns', async () => {
      const { map } = await load(infiniteUrl);
      const { atlas } = map.tileSet.sources[0];

      expect(atlas.regions).toHaveLength(4);
      expect(atlas.regions[1].uvOffset).toEqual({ x: 19 / 36, y: 1 / 36 });
      expect(atlas.regions[2].uvOffset).toEqual({ x: 1 / 36, y: 19 / 36 });
      expect(atlas.regions[3].uvScale).toEqual({ x: 16 / 36, y: 16 / 36 });
    });

    it('draws tiles at their tileset size, and tileoffset moves every tile', async () => {
      const { map } = await load();
      const [terrainSource, propsSource] = map.tileSet.sources;

      expect(terrainSource.tileWidth).toBe(16);
      expect(terrainSource.tileHeight).toBe(16);
      expect(propsSource.tileWidth).toBe(16);
      expect(propsSource.tileHeight).toBe(32);

      for (const tile of propsSource.tiles) {
        expect(tile.textureOrigin).toEqual({ x: -2, y: 4 });
      }

      expect(terrainSource.tiles[2].textureOrigin).toEqual({ x: 0, y: 0 });
    });

    it('draws tiles at the map tile size with tilerendersize "grid"', async () => {
      const tile = (await load(isometricUrl)).map.tileSet.sources[0];
      const grid = (
        await loadEditedFixture('maps/isometric.tmj', [
          ['tilesets', 0, 'tilerendersize'],
          'grid',
        ])
      ).tileSet.sources[0];

      expect([tile.tileWidth, tile.tileHeight]).toEqual([64, 96]);
      expect([grid.tileWidth, grid.tileHeight]).toEqual([64, 32]);
    });

    it('gives tiles their properties, animations and collision', async () => {
      const { map } = await load();

      expect(getTileData(map.tileSet, terrain(0)).properties).toEqual({
        kind: 'grass',
      });
      expect(getTileData(map.tileSet, terrain(1)).animation).toEqual([
        { tile: 1, durationMilliseconds: 200 },
        { tile: 2, durationMilliseconds: 300 },
      ]);
      expect(getTileData(map.tileSet, terrain(3)).collision).toBe('cell');
      expect(getTileData(map.tileSet, terrain(2)).collision).toBeNull();
    });

    it('clips a tall tile’s collision to its footprint, moved with the image by its tileoffset', async () => {
      const { map } = await load();
      const wall = collisionPolygon(map.tileSet, props(0));
      const base = collisionPolygon(map.tileSet, props(1));

      // The 16 x 32 image, moved (-2, 4), spans x -10 to 6 and y -20 to 12
      // around the cell's center, and its rectangle covers all of it.
      expect(sortPoints(wall)).toEqual([
        { x: -8, y: -8 },
        { x: 6, y: -8 },
        { x: -8, y: 8 },
        { x: 6, y: 8 },
      ]);
      expect(sortPoints(base)).toEqual([
        { x: 4, y: 0 },
        { x: -4, y: 8 },
        { x: 4, y: 8 },
      ]);
    });

    it('projects an isometric-grid tileset’s collision through the layout', async () => {
      const { map } = await load(isometricUrl);
      const { layout } = map.tileSet;
      const center = layout.getCellCenter(0, 0);
      const halfCell = collisionPolygon(
        map.tileSet,
        packTile({ source: 0, tile: 1 }),
      );

      expect(
        getTileData(map.tileSet, packTile({ source: 0, tile: 0 })).collision,
      ).toBe('cell');
      expectPointsClose(
        sortPoints(halfCell),
        sortPoints(
          [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 0.5 },
            { x: 1, y: 0.5 },
          ]
            .map((point) => layout.cellSpaceToLocal(point))
            .map((point) => ({ x: point.x - center.x, y: point.y - center.y })),
        ),
      );
    });

    it('gives a tile with no navigationCost property a null cost', async () => {
      const { map } = await load();

      expect(getTileData(map.tileSet, terrain(0)).navigationCost).toBeNull();
    });

    it.each([
      ['int', 3],
      ['float', 0.5],
    ])(
      'reads a %s navigationCost property into the tile’s cost, keeping the property',
      async (type, value) => {
        const map = await loadEdited([
          ['tilesets', 0, 'tiles', 0, 'properties', 1],
          { name: 'navigationCost', type, value },
        ]);
        const data = getTileData(map.tileSet, terrain(0));

        expect(data.navigationCost).toBe(value);
        expect(data.properties).toEqual({
          kind: 'grass',
          navigationCost: value,
        });
      },
    );

    it('throws for a navigationCost property that is not a number, naming the tile', async () => {
      await expect(
        loadEdited([
          ['tilesets', 0, 'tiles', 0, 'properties', 1],
          { name: 'navigationCost', type: 'string', value: 'slow' },
        ]),
      ).rejects.toThrow(
        `tile 0 of tileset tilesets[0] embedded in "${badUrl}" has a navigationCost property of type "string", and it must be an int or a float.`,
      );
    });

    it('throws for a navigationCost of 0, naming the tile', async () => {
      await expect(
        loadEdited([
          ['tilesets', 0, 'tiles', 0, 'properties', 1],
          { name: 'navigationCost', type: 'float', value: 0 },
        ]),
      ).rejects.toThrow(
        `Unable to create a tile set: tile 0 of tileset tilesets[0] embedded in "${badUrl}" has a navigationCost of 0, which must be finite and more than 0 as a 32-bit float, or null.`,
      );
    });

    it('flattens tile properties into the values a tile set stores', async () => {
      const { map } = await load();

      expect(getTileData(map.tileSet, props(2)).properties).toEqual({
        count: 7,
        glow: '#ffff0000',
        owner: 5,
        sound: `${fixturesUrl}sounds/step.ogg`,
        solid: true,
        tint: '#80ff0000',
        weight: 1.5,
      });
    });

    it('converts the map properties with their types, leaving class properties out', async () => {
      const { map } = await load();

      expect(map.properties).toEqual({
        boss: { type: 'object', value: 1 },
        empty: { type: 'color', value: null },
        gravity: { type: 'float', value: 9.5 },
        level: { type: 'int', value: 3 },
        music: { type: 'file', value: `${fixturesUrl}music/theme.ogg` },
        tint: {
          type: 'color',
          value: new Color(0x33 / 255, 0x66 / 255, 0x99 / 255, 1),
        },
        title: { type: 'string', value: 'Keep' },
      });
      expect(map.backgroundColor).toEqual(
        new Color(0x11 / 255, 0x22 / 255, 0x33 / 255, 0x80 / 255),
      );
    });
  });

  describe('tile layers', () => {
    it('copies a finite layer’s rows unchanged, with every flip bit', async () => {
      const { map } = await load();
      const ground = tileLayer(map.layers, 0);

      expect(ground.blocks).toHaveLength(1);
      expect(ground.blocks[0]).toMatchObject({
        column: 0,
        row: 0,
        columns: 4,
        rows: 3,
      });
      expect([...ground.blocks[0].tiles]).toEqual([
        terrain(0),
        terrain(1),
        terrain(0, { flipX: true }),
        terrain(2),
        terrain(0, { flipY: true }),
        terrain(0, { transpose: true }),
        emptyTile,
        terrain(3),
        emptyTile,
        props(0),
        props(1),
        emptyTile,
      ]);
    });

    it('copies an infinite layer’s chunks unchanged, at negative cells', async () => {
      const { map } = await load(infiniteUrl);
      const ground = tileLayer(map.layers, 0);

      expect(map.size).toBeNull();
      expect(ground.blocks.map((block) => [...block.tiles])).toEqual([
        [terrain(0), terrain(1), terrain(2), terrain(3)],
        [emptyTile, terrain(3, { flipX: true }), terrain(1), emptyTile],
      ]);
      expect(
        ground.blocks.map(({ column, row, columns, rows }) => ({
          column,
          row,
          columns,
          rows,
        })),
      ).toEqual([
        { column: -2, row: -2, columns: 2, rows: 2 },
        { column: 0, row: 0, columns: 2, rows: 2 },
      ]);
    });

    it.each([0, 1, 2, 3, 4, 5, 6, 7])(
      'copies the flip bits %i of a gid onto the packed tile',
      async (bits) => {
        const flags =
          (bits & 4 ? 0x8000_0000 : 0) |
          (bits & 2 ? 0x4000_0000 : 0) |
          (bits & 1 ? 0x2000_0000 : 0);
        const map = await loadEdited([
          ['layers', 0, 'data', 0],
          (flags | 2) >>> 0,
        ]);

        expect(tileLayer(map.layers, 0).blocks[0].tiles[0]).toBe(
          terrain(1, {
            flipX: (bits & 4) !== 0,
            flipY: (bits & 2) !== 0,
            transpose: (bits & 1) !== 0,
          }),
        );
      },
    );

    it.each([
      ['base64', '', null],
      ['base64', 'zlib', 'deflate'],
      ['base64', 'gzip', 'gzip'],
    ] as const)(
      'decodes %s data with compression "%s" to the same tiles as CSV',
      async (encoding, compression, format) => {
        const bytes = gidBytes(groundGids());
        const data = toBase64(
          format === null ? bytes : await compress(bytes, format),
        );
        const csv = (await load()).map;
        const map = await loadEdited(
          [['layers', 0, 'encoding'], encoding],
          [['layers', 0, 'compression'], compression],
          [['layers', 0, 'data'], data],
        );

        expect([...tileLayer(map.layers, 0).blocks[0].tiles]).toEqual([
          ...tileLayer(csv.layers, 0).blocks[0].tiles,
        ]);
      },
    );

    it('throws for compressed data that inflates past the layer’s cells', async () => {
      const bytes = gidBytes([...groundGids(), 1, 1]);

      await expect(
        loadEdited(
          [['layers', 0, 'encoding'], 'base64'],
          [['layers', 0, 'compression'], 'zlib'],
          [['layers', 0, 'data'], toBase64(await compress(bytes, 'deflate'))],
        ),
      ).rejects.toThrow(
        `layer "Ground" (layers[0])'s data decompresses to more than the 48 bytes its cells need.`,
      );
    });

    it('says which layers have collision tiles', async () => {
      const { map } = await load();
      const buildings = groupLayer(map.layers, 1);

      expect(tileLayer(map.layers, 0).collides).toBe(true);
      expect(tileLayer(buildings.layers, 0).collides).toBe(true);
      expect(tileLayer(buildings.layers, 1).collides).toBe(true);
      expect(tileLayer(map.layers, 2).collides).toBe(false);
    });

    it('keeps the layer tree, its offsets, visibility, opacity and tint, leaving image layers out', async () => {
      const { map } = await load();

      expect(map.layers.map(({ kind, path }) => [kind, path])).toEqual([
        ['tiles', 'Ground'],
        ['group', 'Buildings'],
        ['tiles', 'Ground'],
      ]);

      const buildings = groupLayer(map.layers, 1);

      expect(buildings).toMatchObject({
        id: 2,
        offset: { x: 8, y: -4 },
        opacity: 0.5,
        tintColor: new Color(1, 0, 0, 1),
      });
      expect(
        buildings.layers.map(({ path, offset, visible }) => ({
          path,
          offset,
          visible,
        })),
      ).toEqual([
        { path: 'Buildings/Walls', offset: { x: 0, y: 16 }, visible: true },
        { path: 'Buildings/Decor', offset: { x: 0, y: 0 }, visible: false },
        { path: 'Buildings/Objects', offset: { x: 2, y: 3 }, visible: true },
      ]);
      expect(tileLayer(map.layers, 0).tintColor).toEqual(Color.white);
      expect(tileLayer(map.layers, 0).properties).toEqual({
        speed: { type: 'float', value: 0.5 },
      });
    });
  });

  describe('objects', () => {
    const orthogonalObjects = async (): Promise<TiledObjectLayer> =>
      objectLayer(groupLayer((await load()).map.layers, 1).layers, 2);

    it('puts objects in map space, adding their layer’s and groups’ offsets', async () => {
      const objects = await orthogonalObjects();

      // The group's offset is (8, -4) and the object layer's (2, 3).
      expect(objectNamed(objects, 'Spawn')).toEqual({
        id: 2,
        name: 'Spawn',
        type: '',
        position: { x: 34, y: 39 },
        rotation: 0,
        visible: true,
        properties: {},
        shape: { kind: 'point' },
      });
    });

    it('converts rotation from degrees to radians, clockwise like Tiled', async () => {
      const objects = await orthogonalObjects();

      expect(objectNamed(objects, 'Door')).toMatchObject({
        type: 'door',
        position: { x: 42, y: 15 },
        rotation: Math.PI / 2,
        properties: { locked: { type: 'bool', value: true } },
        shape: { kind: 'rectangle', width: 16, height: 32 },
      });
      expect(objectNamed(objects, 'Zone').rotation).toBe(degreesToRadians(-30));
    });

    it('keeps each orthogonal shape', async () => {
      const objects = await orthogonalObjects();

      expect(objectNamed(objects, 'Zone')).toMatchObject({
        position: { x: 14, y: 5 },
        visible: false,
        shape: {
          kind: 'polygon',
          points: [
            { x: 0, y: 0 },
            { x: 16, y: 0 },
            { x: 8, y: 8 },
          ],
        },
      });
      expect(objectNamed(objects, 'Pond').shape).toEqual({
        kind: 'ellipse',
        width: 8,
        height: 6,
      });
      expect(objectNamed(objects, 'Pill').shape).toEqual({
        kind: 'capsule',
        width: 10,
        height: 4,
      });
      expect(objectNamed(objects, 'Path')).toMatchObject({
        position: { x: 11, y: 1 },
        shape: {
          kind: 'polyline',
          points: [
            { x: 0, y: 0 },
            { x: 4, y: 4 },
          ],
        },
      });
      expect(objectNamed(objects, 'Sign').shape).toEqual({
        kind: 'text',
        text: 'Hello',
        width: 64,
        height: 16,
        pixelSize: 16,
        color: new Color(0, 1, 0, 1),
        fontFamily: 'sans-serif',
        bold: false,
        italic: false,
        wrap: true,
        horizontalAlignment: 'center',
        verticalAlignment: 'top',
      });
    });

    it('gives a tile object its packed tile, flip bits and bottom-left pivot', async () => {
      const objects = await orthogonalObjects();

      expect(objectNamed(objects, 'Lamp')).toMatchObject({
        position: { x: 58, y: 47 },
        shape: {
          kind: 'tile',
          tile: props(0, true),
          width: 16,
          height: 32,
          pivot: { x: 0, y: 1 },
        },
      });
    });

    it('takes a pivot from the tileset’s object alignment', async () => {
      const map = await loadEdited(
        [['tilesets', 0, 'objectalignment'], 'center'],
        [['layers', 1, 'layers', 2, 'objects', 4, 'gid'], 1],
      );
      const objects = objectLayer(groupLayer(map.layers, 1).layers, 2);

      expect(objectNamed(objects, 'Lamp').shape).toMatchObject({
        tile: terrain(0),
        pivot: { x: 0.5, y: 0.5 },
      });
    });

    it('merges a template into its instance, the instance’s fields and properties winning', async () => {
      const objects = await orthogonalObjects();

      expect(objectNamed(objects, 'Chest')).toEqual({
        id: 7,
        name: 'Chest',
        type: 'chest',
        position: { x: 26, y: 47 },
        rotation: 0,
        visible: true,
        properties: {
          gold: { type: 'int', value: 50 },
          trapped: { type: 'bool', value: false },
        },
        // The template's gid is in its own tileset's numbering, with the
        // flip Y bit.
        shape: {
          kind: 'tile',
          tile: props(2, false, true),
          width: 16,
          height: 32,
          pivot: { x: 0, y: 1 },
        },
      });
    });

    it('throws for a template whose tileset the map does not use', async () => {
      const chestUrl = `${fixturesUrl}templates/chest.tj`;

      serveFiles({
        ...fixtureFiles,
        [chestUrl]: editFixture('templates/chest.tj', [
          ['tileset', 'source'],
          'other.tsj',
        ]),
      });

      await expect(
        new TiledMapCache(
          createFakeTiledRenderContext().renderContext,
        ).getOrLoad(orthogonalUrl),
      ).rejects.toThrow(
        `The object layers[1].layers[2].objects[6] uses the template "${chestUrl}", whose tile is from the tileset "${fixturesUrl}templates/other.tsj", which the map doesn't use.`,
      );
    });

    describe('in an isometric map', () => {
      // Tiled's IsometricRenderer::pixelToScreenCoords without its
      // `mapHeight * tilewidth / 2` shift, which the loader leaves out of
      // tiles and objects alike.
      const tiledScreen = (point: Vector2): Vector2 => ({
        x: (point.x / 32 - point.y / 32) * 32,
        y: (point.x / 32 + point.y / 32) * 16,
      });
      const layerOffset = { x: 4, y: -8 };

      const isometricObjects = async (): Promise<{
        objects: TiledObjectLayer;
        map: TiledMap;
      }> => {
        const { map } = await load(isometricUrl);

        return { objects: objectLayer(map.layers, 1), map };
      };

      it('puts a point on a cell’s center where the layout puts it', async () => {
        const { objects, map } = await isometricObjects();
        const center = map.tileSet.layout.getCellCenter(1, 2);

        expect(objectNamed(objects, 'Spawn').position).toEqual({
          x: center.x + layerOffset.x,
          y: center.y + layerOffset.y,
        });
        expect(center).toEqual(tiledScreen({ x: 48, y: 80 }));
      });

      it('turns a rectangle into the projected polygon Tiled draws', async () => {
        const { objects } = await isometricObjects();
        const room = objectNamed(objects, 'Room');
        const origin = tiledScreen({ x: 32, y: 0 });

        expect(room.position).toEqual({
          x: origin.x + layerOffset.x,
          y: origin.y + layerOffset.y,
        });
        expect(room.shape).toEqual({
          kind: 'polygon',
          points: [
            { x: 0, y: 0 },
            { x: 32, y: 0 },
            { x: 32, y: 32 },
            { x: 0, y: 32 },
          ].map(tiledScreen),
        });
      });

      it('projects a polygon’s points relative to its origin', async () => {
        const { objects } = await isometricObjects();
        const ramp = objectNamed(objects, 'Ramp');
        const origin = tiledScreen({ x: 0, y: 32 });

        expect(ramp.position).toEqual({
          x: origin.x + layerOffset.x,
          y: origin.y + layerOffset.y,
        });

        if (ramp.shape.kind !== 'polygon') {
          throw new Error('The ramp is not a polygon.');
        }

        expectPointsClose(
          ramp.shape.points,
          [
            { x: 0, y: 0 },
            { x: 32, y: 0 },
            { x: 0, y: 32 },
          ].map(tiledScreen),
        );
      });

      it('keeps a rotated object’s rotation, applied on screen about its projected origin', async () => {
        const { objects } = await isometricObjects();
        const turned = objectNamed(objects, 'Turned');

        expect(turned.rotation).toBe(Math.PI / 4);
        expect(turned.shape).toEqual({
          kind: 'polygon',
          points: [
            { x: 0, y: 0 },
            { x: 32, y: 0 },
            { x: 32, y: 16 },
            { x: 0, y: 16 },
          ].map(tiledScreen),
        });
      });

      it('samples an ellipse’s outline in pixels, then projects it', async () => {
        const { objects } = await isometricObjects();
        const well = objectNamed(objects, 'Well');

        if (well.shape.kind !== 'polygon') {
          throw new Error('The well is not a polygon.');
        }

        expect(well.shape.points).toHaveLength(32);
        expectPointsClose(
          [well.shape.points[0], well.shape.points[8]],
          [tiledScreen({ x: 32, y: 16 }), tiledScreen({ x: 16, y: 32 })],
        );
      });

      it('projects a tile object’s position and pivots it at its bottom center', async () => {
        const { objects } = await isometricObjects();
        const origin = tiledScreen({ x: 64, y: 64 });

        expect(objectNamed(objects, 'Statue')).toMatchObject({
          position: {
            x: origin.x + layerOffset.x,
            y: origin.y + layerOffset.y,
          },
          shape: {
            kind: 'tile',
            tile: packTile({ source: 0, tile: 0 }),
            width: 64,
            height: 64,
            pivot: { x: 0.5, y: 1 },
          },
        });
      });
    });
  });

  describe('validation', () => {
    const prefix = `Unable to load Tiled map "${badUrl}": Invalid Tiled map JSON at "${badUrl}": `;

    it.each(['staggered', 'hexagonal', 'oblique'])(
      'throws for a %s map',
      async (orientation) => {
        await expect(
          loadEdited([['orientation'], orientation]),
        ).rejects.toThrow(
          `${prefix}orientation is "${orientation}", and only "orthogonal" and "isometric" maps can be loaded.`,
        );
      },
    );

    it('throws for an image collection tileset', async () => {
      await expect(
        loadEdited([['tilesets', 0, 'image'], undefined]),
      ).rejects.toThrow(
        `${prefix}tilesets[0] has no image, so it's an image collection (one image per tile), which isn't supported.`,
      );
    });

    it('throws for the preserve-aspect-fit fill mode', async () => {
      await expect(
        loadEdited([['tilesets', 0, 'fillmode'], 'preserve-aspect-fit']),
      ).rejects.toThrow(
        `${prefix}tilesets[0].fillmode is "preserve-aspect-fit", which isn't supported. Use "stretch".`,
      );
    });

    it('throws for a transparent color', async () => {
      await expect(
        loadEdited([['tilesets', 0, 'transparentcolor'], '#ff00ff']),
      ).rejects.toThrow(
        `${prefix}tilesets[0].transparentcolor is set, and color-keyed tileset images aren't supported.`,
      );
    });

    it('throws for zstd compression', async () => {
      await expect(
        loadEdited(
          [['layers', 0, 'encoding'], 'base64'],
          [['layers', 0, 'compression'], 'zstd'],
          [['layers', 0, 'data'], ''],
        ),
      ).rejects.toThrow(
        `${prefix}layers[0].compression is "zstd", which browsers can't decompress. Save the map with zlib or gzip compression instead.`,
      );
    });

    it('throws for a missing field, naming its path', async () => {
      await expect(
        loadEdited([['layers', 1, 'layers', 0, 'width'], undefined]),
      ).rejects.toThrow(
        `${prefix}layers[1].layers[0].width is missing; it must be a whole number from 0 to 1073741824.`,
      );
    });

    it('throws for a field of the wrong type, naming its path', async () => {
      await expect(loadEdited([['layers', 0, 'name'], 5])).rejects.toThrow(
        `${prefix}layers[0].name must be a string, got 5.`,
      );
    });

    it('throws for a layer too large to load', async () => {
      await expect(
        loadEdited(
          [['layers', 0, 'width'], 5000],
          [['layers', 0, 'height'], 5000],
        ),
      ).rejects.toThrow(
        `${prefix}layers[0] has 25000000 cells, and a layer or chunk can have at most 16777216.`,
      );
    });

    it('throws for data with the wrong number of gids', async () => {
      await expect(
        loadEdited([
          ['layers', 0, 'data'],
          [1, 2],
        ]),
      ).rejects.toThrow(
        `layer "Ground" (layers[0])'s data has 2 gids, but it has 12 cells.`,
      );
    });

    it('throws for a gid with the hexagonal rotation bit, naming its cell', async () => {
      await expect(
        loadEdited([['layers', 0, 'data', 5], 0x1000_0001]),
      ).rejects.toThrow(
        `layer "Ground" (layers[0]) at cell (1, 1) has gid 268435457, whose bit 28 (a hexagonal tile's 120-degree rotation) is set, which isn't supported.`,
      );
    });

    it.each([5, 13])(
      'throws for gid %i, which is in no tileset',
      async (gid) => {
        await expect(
          loadEdited([['layers', 0, 'data', 0], gid]),
        ).rejects.toThrow(
          `layer "Ground" (layers[0]) at cell (0, 0) has gid ${gid}, whose tile id ${gid} isn't in any of the map's tilesets.`,
        );
      },
    );

    it('throws for an image whose size differs from the tileset’s', async () => {
      serveFiles();

      await expect(
        new TiledMapCache(
          createFakeTiledRenderContext({
            [`${fixturesUrl}maps/terrain.png`]: { width: 32, height: 16 },
            [`${fixturesUrl}tilesets/props.png`]: { width: 48, height: 32 },
          }).renderContext,
        ).getOrLoad(orthogonalUrl),
      ).rejects.toThrow(
        `tileset tilesets[0] embedded in "${orthogonalUrl}"'s image "terrain.png" is 32 x 16 pixels, but the tileset says it's 32 x 32.`,
      );
    });

    it('throws for an invalid tileset file, naming it', async () => {
      const propsUrl = `${fixturesUrl}tilesets/props.tsj`;

      serveFiles({
        ...fixtureFiles,
        [propsUrl]: editFixture('tilesets/props.tsj', [['columns'], 0]),
      });

      await expect(
        new TiledMapCache(
          createFakeTiledRenderContext().renderContext,
        ).getOrLoad(orthogonalUrl),
      ).rejects.toThrow(
        `Invalid Tiled tileset JSON at "${propsUrl}": columns must be a whole number greater than 0, got 0.`,
      );
    });

    it('throws for an animation frame with no duration', async () => {
      await expect(
        loadEdited([
          ['tilesets', 0, 'tiles', 1, 'animation', 0, 'duration'],
          0,
        ]),
      ).rejects.toThrow(
        `${prefix}tilesets[0].tiles[1].animation[0].duration must be a whole number greater than 0, got 0.`,
      );
    });

    it('names the Tiled tileset and tile in a tile set error', async () => {
      // A sliver that snapping flattens to nothing.
      await expect(
        loadEdited([
          ['tilesets', 0, 'tiles', 2, 'objectgroup', 'objects', 0, 'polygon'],
          [
            { x: 0, y: 8 },
            { x: 16, y: 8 },
            { x: 16, y: 8.0001 },
          ],
        ]),
      ).rejects.toThrow(
        `Unable to create a tile set: tile 3 of tileset tilesets[0] embedded in "${badUrl}" has a collision polygon that`,
      );
    });

    it('throws for tilesets starting at the same gid', async () => {
      await expect(
        loadEdited([['tilesets', 1, 'firstgid'], 1]),
      ).rejects.toThrow(
        `${prefix}tilesets[1].firstgid is 1, which another tileset of the map also starts at.`,
      );
    });
  });
});
