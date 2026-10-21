import { describe, expect, it } from 'vitest';
import {
  createIsometricGridLayout,
  createOrthogonalGridLayout,
  GridLayout,
  Vector2,
} from '../../math/index.js';
import { createTextureAtlas } from '../../rendering/texture-atlas/index.js';
import { getChunkKey } from '../cells/chunk-key.js';
import { fillTiles, setTile } from '../cells/edit-tiles.js';
import {
  addTilemapLayerComponent,
  TilemapChunk,
  TilemapLayerEcsComponent,
} from '../components/tilemap-layer-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  createTestSource,
  textureOfSize,
} from '../test-helpers/create-test-tile-set.js';
import {
  createTileSet,
  TileSet,
  TileSetSourceOptions,
} from '../tile-set/tile-set.js';
import { getTileImageRect } from '../tiles/get-tile-image-rect.js';
import { packTile } from '../tiles/packed-tile.js';
import {
  applyTileTransform,
  invertTileTransform,
} from '../tiles/tile-transform.js';
import { quadIndices } from './quad-indices.js';
import {
  countChunkTilesBySource,
  createTilemapVertexArrays,
  TilemapVertexArrays,
  writeAnimatedQuads,
  writeChunkVertices,
  WrittenChunkVertices,
} from './write-chunk-vertices.js';

const orthogonal16 = (): GridLayout =>
  createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 });

const createLayer = (tileSet: TileSet): TilemapLayerEcsComponent => {
  const world = new EcsWorld();

  return addTilemapLayerComponent(world, world.createEntity(), { tileSet });
};

const getChunk = (
  layer: TilemapLayerEcsComponent,
  chunkColumn: number,
  chunkRow: number,
): TilemapChunk => {
  const chunk = layer.chunks.get(getChunkKey(chunkColumn, chunkRow));

  if (!chunk) {
    throw new Error(`No chunk (${chunkColumn}, ${chunkRow}).`);
  }

  return chunk;
};

/** Writes source `source` of a chunk and returns the arrays and count. */
const write = (
  layer: TilemapLayerEcsComponent,
  chunk: TilemapChunk,
  source: number = 0,
  timeInMilliseconds: number = 0,
): {
  arrays: TilemapVertexArrays;
  count: number;
  written: WrittenChunkVertices;
} => {
  const arrays = createTilemapVertexArrays(chunk.tileCount);
  const written = writeChunkVertices(
    layer.tileSet,
    chunk,
    source,
    arrays,
    timeInMilliseconds,
  );

  return { arrays, count: written.tileCount, written };
};

/** The four corners of quad `quad`, in the order they're written. */
const quadPositions = (arrays: TilemapVertexArrays, quad: number): Vector2[] =>
  [0, 1, 2, 3].map((corner) => ({
    x: arrays.positions[(quad * 4 + corner) * 2],
    y: arrays.positions[(quad * 4 + corner) * 2 + 1],
  }));

const quadTexCoords = (arrays: TilemapVertexArrays, quad: number): Vector2[] =>
  [0, 1, 2, 3].map((corner) => ({
    x: arrays.texCoords[(quad * 4 + corner) * 2],
    y: arrays.texCoords[(quad * 4 + corner) * 2 + 1],
  }));

const unitCorners: Vector2[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

describe('writeChunkVertices', () => {
  it('writes an orthogonal tile as its image rect, top-left, top-right, bottom-right, bottom-left', () => {
    const tileSet = createTileSet({
      layout: orthogonal16(),
      sources: [createTestSource(2, 2)],
    });
    const layer = createLayer(tileSet);

    setTile(layer, 1, 2, packTile({ source: 0, tile: 3 }));

    const { arrays, count } = write(layer, getChunk(layer, 0, 0));

    expect(count).toBe(1);
    expect(quadPositions(arrays, 0)).toEqual([
      { x: 16, y: 32 },
      { x: 32, y: 32 },
      { x: 32, y: 48 },
      { x: 16, y: 48 },
    ]);
    // Tile 3 of a 2 x 2 grid atlas is its bottom-right quarter.
    expect(quadTexCoords(arrays, 0)).toEqual([
      { x: 0.5, y: 0.5 },
      { x: 1, y: 0.5 },
      { x: 1, y: 1 },
      { x: 0.5, y: 1 },
    ]);
    expect([...arrays.texRects.subarray(0, 16)]).toEqual([
      0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
      0.5,
    ]);
  });

  it('places isometric tiles on their footprint bounds', () => {
    const tileSet = createTileSet({
      layout: createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
      sources: [createTestSource(1, 1)],
    });
    const layer = createLayer(tileSet);
    const tile = packTile({ source: 0, tile: 0 });

    setTile(layer, 2, 1, tile);

    const { arrays } = write(layer, getChunk(layer, 0, 0));
    const { min, max } = tileSet.layout.getCellFootprintBounds(2, 1);

    expect(quadPositions(arrays, 0)).toEqual([
      { x: min.x, y: min.y },
      { x: max.x, y: min.y },
      { x: max.x, y: max.y },
      { x: min.x, y: max.y },
    ]);
  });

  it('reaches up from the footprint for a tall tile moved by its textureOrigin', () => {
    const tileSet = createTileSet({
      layout: createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
      sources: [
        createTestSource(1, 1, {
          tileHeight: 96,
          tiles: new Map([[0, { textureOrigin: { x: 0, y: -4 } }]]),
        }),
      ],
    });
    const layer = createLayer(tileSet);

    setTile(layer, 0, 0, packTile({ source: 0, tile: 0 }));

    const { arrays } = write(layer, getChunk(layer, 0, 0));

    // Cell (0, 0)'s diamond spans x -32 to 32 and y 0 to 32; the image is
    // 96 tall, its bottom 4 units above the footprint's.
    expect(quadPositions(arrays, 0)).toEqual([
      { x: -32, y: -68 },
      { x: 32, y: -68 },
      { x: 32, y: 28 },
      { x: -32, y: 28 },
    ]);
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 7])(
    'samples through the inverse transform for transform bits %i',
    (bits) => {
      const tileSet = createTileSet({
        layout: orthogonal16(),
        sources: [createTestSource(2, 2)],
      });
      const layer = createLayer(tileSet);

      setTile(
        layer,
        0,
        0,
        packTile({
          source: 0,
          tile: 1,
          flipX: (bits & 4) !== 0,
          flipY: (bits & 2) !== 0,
          transpose: (bits & 1) !== 0,
        }),
      );

      const { arrays } = write(layer, getChunk(layer, 0, 0));

      // The rect never changes.
      expect(quadPositions(arrays, 0)).toEqual([
        { x: 0, y: 0 },
        { x: 16, y: 0 },
        { x: 16, y: 16 },
        { x: 0, y: 16 },
      ]);

      // Tile 1 is the atlas's top-right quarter: offset (0.5, 0), scale 0.5.
      expect(quadTexCoords(arrays, 0)).toEqual(
        unitCorners.map((corner) => {
          const sampled = invertTileTransform(bits, corner, { x: 0, y: 0 });

          return { x: 0.5 + sampled.x * 0.5, y: sampled.y * 0.5 };
        }),
      );
    },
  );

  it('turns a tile clockwise with transpose and flip X, not counter-clockwise', () => {
    const tileSet = createTileSet({
      layout: orthogonal16(),
      sources: [createTestSource(1, 1)],
    });
    const layer = createLayer(tileSet);
    const bits = 5;

    setTile(
      layer,
      0,
      0,
      packTile({ source: 0, tile: 0, transpose: true, flipX: true }),
    );

    const { arrays } = write(layer, getChunk(layer, 0, 0));
    const [topLeft] = quadTexCoords(arrays, 0);

    // Turned clockwise, the image's bottom-left corner is at the top-left.
    expect(topLeft).toEqual({ x: 0, y: 1 });
    expect(topLeft).not.toEqual(
      applyTileTransform(bits, { x: 0, y: 0 }, { x: 0, y: 0 }),
    );
  });

  it('draws only the trimmed part of a trimmed region, moved by the transform', () => {
    // A 16 x 16 frame whose content is the 8 x 4 rect at (4, 2), packed at
    // the texture's top-left corner.
    const atlas = createTextureAtlas(textureOfSize(16, 16), [
      {
        name: 'trimmed',
        x: 0,
        y: 0,
        width: 8,
        height: 4,
        sourceWidth: 16,
        sourceHeight: 16,
        trimX: 4,
        trimY: 2,
      },
    ]);
    const source: TileSetSourceOptions = { atlas };
    const tileSet = createTileSet({
      layout: orthogonal16(),
      sources: [source],
    });
    const layer = createLayer(tileSet);

    setTile(layer, 0, 0, packTile({ source: 0, tile: 0 }));
    setTile(layer, 1, 0, packTile({ source: 0, tile: 0, flipX: true }));

    const { arrays } = write(layer, getChunk(layer, 0, 0));

    expect(quadPositions(arrays, 0)).toEqual([
      { x: 4, y: 2 },
      { x: 12, y: 2 },
      { x: 12, y: 6 },
      { x: 4, y: 6 },
    ]);
    expect(quadTexCoords(arrays, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 0.5, y: 0.25 },
      { x: 0, y: 0.25 },
    ]);

    // Mirrored, the content moves to x 4 to 12 of the cell from 16 (still
    // centered here), and samples right to left.
    expect(quadPositions(arrays, 1)).toEqual([
      { x: 20, y: 2 },
      { x: 28, y: 2 },
      { x: 28, y: 6 },
      { x: 20, y: 6 },
    ]);
    expect(quadTexCoords(arrays, 1)).toEqual([
      { x: 0.5, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0.25 },
      { x: 0.5, y: 0.25 },
    ]);
  });

  it('writes tiles in row-major cell order, and only those of the source', () => {
    const tileSet = createTileSet({
      layout: orthogonal16(),
      sources: [createTestSource(2, 2), createTestSource(2, 1)],
    });
    const layer = createLayer(tileSet);

    // Written out of order, and with a tile of source 1 in between.
    setTile(layer, 1, 1, packTile({ source: 0, tile: 0 }));
    setTile(layer, 3, 0, packTile({ source: 0, tile: 0 }));
    setTile(layer, 0, 1, packTile({ source: 1, tile: 0 }));
    setTile(layer, 0, 0, packTile({ source: 0, tile: 0 }));

    const chunk = getChunk(layer, 0, 0);
    const { arrays, count } = write(layer, chunk, 0);

    expect(count).toBe(3);
    expect([0, 1, 2].map((quad) => quadPositions(arrays, quad)[0])).toEqual([
      { x: 0, y: 0 },
      { x: 48, y: 0 },
      { x: 16, y: 16 },
    ]);

    const counts = new Uint16Array(2);

    countChunkTilesBySource(chunk, counts);
    expect([...counts]).toEqual([3, 1]);
  });

  it('shares bit-identical edges between neighbors, inside a chunk and across a chunk boundary', () => {
    const layout = createOrthogonalGridLayout({
      cellWidth: 0.1,
      cellHeight: 0.3,
    });
    const tileSet = createTileSet({
      layout,
      sources: [createTestSource(1, 1)],
    });
    const layer = createLayer(tileSet);
    const tile = packTile({ source: 0, tile: 0 });

    fillTiles(layer, 30, 30, 4, 4, tile);

    const imageRects = new Map<string, ReturnType<typeof getTileImageRect>>();

    for (const [chunkColumn, chunkRow] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]) {
      const chunk = getChunk(layer, chunkColumn, chunkRow);
      const { arrays, count } = write(layer, chunk);
      let quad = 0;

      chunk.tiles.forEach((cellTile, index) => {
        if (cellTile === 0) {
          return;
        }

        const column = chunkColumn * 32 + (index % 32);
        const row = chunkRow * 32 + Math.floor(index / 32);
        const [topLeft, , bottomRight] = quadPositions(arrays, quad);

        imageRects.set(`${column},${row}`, { min: topLeft, max: bottomRight });
        quad++;
      });

      expect(quad).toBe(count);
    }

    for (let column = 30; column < 33; column++) {
      for (let row = 30; row < 33; row++) {
        const rect = imageRects.get(`${column},${row}`);
        const right = imageRects.get(`${column + 1},${row}`);
        const below = imageRects.get(`${column},${row + 1}`);

        expect(right?.min.x).toBe(rect?.max.x);
        expect(below?.min.y).toBe(rect?.max.y);
      }
    }

    // The writer and getTileImageRect agree to the float32 they're stored in.
    const stored = imageRects.get('31,31');

    expect(stored?.max.x).toBe(
      Math.fround(getTileImageRect(tileSet, 31, 31, tile).max.x),
    );
  });
});

describe('writeChunkVertices with animated tiles', () => {
  // Source 0 is a 2 x 2 grid atlas: tile 1 is its top-right quarter, tile 3
  // its bottom-right. Tile 0 animates between them; tile 2 is static.
  const water = packTile({ source: 0, tile: 0 });
  const stone = packTile({ source: 0, tile: 2 });
  const createAnimatedTileSet = (): TileSet =>
    createTileSet({
      layout: orthogonal16(),
      sources: [
        createTestSource(2, 2, {
          tiles: new Map([
            [
              0,
              {
                textureOrigin: { x: 2, y: -3 },
                animation: [
                  { tile: 1, durationMilliseconds: 100 },
                  { tile: 3, durationMilliseconds: 50 },
                ],
              },
            ],
          ]),
        }),
        createTestSource(1, 1),
      ],
    });

  it('shows the frame at the time, placed by the placed tile’s textureOrigin', () => {
    const layer = createLayer(createAnimatedTileSet());

    setTile(layer, 1, 0, water);

    const chunk = getChunk(layer, 0, 0);
    const first = write(layer, chunk, 0, 0);
    const second = write(layer, chunk, 0, 120);

    expect(quadTexCoords(first.arrays, 0)[0]).toEqual({ x: 0.5, y: 0 });
    expect(quadTexCoords(second.arrays, 0)[0]).toEqual({ x: 0.5, y: 0.5 });
    expect([...second.arrays.texRects.subarray(0, 4)]).toEqual([
      0.5, 0.5, 0.5, 0.5,
    ]);

    for (const { arrays } of [first, second]) {
      expect(quadPositions(arrays, 0)[0]).toEqual({ x: 18, y: -3 });
    }
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 7])(
    'applies transform bits %i to every frame',
    (bits) => {
      const layer = createLayer(createAnimatedTileSet());

      setTile(
        layer,
        0,
        0,
        packTile({
          source: 0,
          tile: 0,
          flipX: (bits & 4) !== 0,
          flipY: (bits & 2) !== 0,
          transpose: (bits & 1) !== 0,
        }),
      );

      const { arrays } = write(layer, getChunk(layer, 0, 0), 0, 100);

      // Frame 1 is tile 3, the bottom-right quarter.
      expect(quadTexCoords(arrays, 0)).toEqual(
        unitCorners.map((corner) => {
          const sampled = invertTileTransform(bits, corner, { x: 0, y: 0 });

          return { x: 0.5 + sampled.x * 0.5, y: 0.5 + sampled.y * 0.5 };
        }),
      );
    },
  );

  it('lists the animated quads, their cells and their tiles in row-major order', () => {
    const layer = createLayer(createAnimatedTileSet());

    setTile(layer, 3, 1, water);
    setTile(layer, 0, 0, stone);
    setTile(layer, 1, 0, packTile({ source: 0, tile: 0, flipX: true }));
    setTile(layer, 0, 1, packTile({ source: 1, tile: 0 }));

    const chunk = getChunk(layer, 0, 0);
    const { written } = write(layer, chunk, 0);

    expect(written.tileCount).toBe(3);
    expect([...written.animatedQuads]).toEqual([1, 2]);
    expect([...written.animatedCells]).toEqual([1, 32 + 3]);
    expect(written.animatedTiles).toEqual([water]);

    // Source 1 holds no animated tiles.
    const rocks = write(layer, chunk, 1).written;

    expect(rocks.animatedQuads).toHaveLength(0);
    expect(rocks.animatedCells).toHaveLength(0);
    expect(rocks.animatedTiles).toEqual([]);
  });

  it('rewrites only the animated quads whose frame changed', () => {
    const tileSet = createTileSet({
      layout: orthogonal16(),
      sources: [
        createTestSource(2, 2, {
          tiles: new Map([
            [
              0,
              {
                animation: [
                  { tile: 1, durationMilliseconds: 100 },
                  { tile: 3, durationMilliseconds: 100 },
                ],
              },
            ],
            [
              2,
              {
                animation: [
                  { tile: 2, durationMilliseconds: 100 },
                  { tile: 1, durationMilliseconds: 100 },
                ],
              },
            ],
          ]),
        }),
      ],
    });
    const layer = createLayer(tileSet);

    setTile(layer, 0, 0, water);
    setTile(layer, 1, 0, stone);
    setTile(layer, 2, 0, packTile({ source: 0, tile: 1 }));

    const chunk = getChunk(layer, 0, 0);
    const { arrays, written } = write(layer, chunk, 0, 0);
    const before = [...arrays.texCoords];

    const moved = writeAnimatedQuads(
      tileSet,
      chunk,
      arrays,
      written,
      new Map([[water, 3]]),
    );

    expect(moved).toBe(false);
    expect(quadTexCoords(arrays, 0)[0]).toEqual({ x: 0.5, y: 0.5 });
    // The other animated tile and the static one keep their coordinates.
    expect([...arrays.texCoords.subarray(8)]).toEqual(before.slice(8));
  });

  it('moves the quad, and says so, for a frame trimmed differently', () => {
    const atlas = createTextureAtlas(textureOfSize(32, 16), [
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
    ]);
    const tileSet = createTileSet({
      layout: orthogonal16(),
      sources: [
        {
          atlas,
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
    const layer = createLayer(tileSet);

    setTile(layer, 0, 0, water);

    const chunk = getChunk(layer, 0, 0);
    const { arrays, written } = write(layer, chunk, 0, 0);

    expect(
      writeAnimatedQuads(
        tileSet,
        chunk,
        arrays,
        written,
        new Map([[water, 1]]),
      ),
    ).toBe(true);
    expect(quadPositions(arrays, 0)).toEqual([
      { x: 4, y: 2 },
      { x: 12, y: 2 },
      { x: 12, y: 6 },
      { x: 4, y: 6 },
    ]);
    expect(
      writeAnimatedQuads(
        tileSet,
        chunk,
        arrays,
        written,
        new Map([[water, 1]]),
      ),
    ).toBe(false);
  });
});

describe('quadIndices', () => {
  it('draws each quad as two triangles of its own four vertices', () => {
    expect([...quadIndices.subarray(0, 12)]).toEqual([
      0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7,
    ]);
    expect(quadIndices).toHaveLength(32 * 32 * 6);
    expect(quadIndices[quadIndices.length - 1]).toBe(32 * 32 * 4 - 1);
  });
});
