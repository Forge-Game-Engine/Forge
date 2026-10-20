import { describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import {
  createIsometricGridLayout,
  createOrthogonalGridLayout,
  GridLayout,
  Random,
  Vector2,
} from '../../math/index.js';
import { ChainCollider } from '../../physics/colliders/chain-collider.js';
import { calculateSignedArea } from '../../physics/colliders/polygon-math.js';
import { maxCellCoordinate, minCellCoordinate } from '../cells/chunk-key.js';
import { fillTiles, setTile } from '../cells/edit-tiles.js';
import { forEachTile } from '../cells/read-tiles.js';
import {
  addTilemapLayerComponent,
  TilemapLayerEcsComponent,
} from '../components/tilemap-layer-component.js';
import {
  collisionTestTile,
  createCollisionTestTileSet,
  fullTileIndex,
  openTileIndex,
  slopeTileIndex,
  stepTileIndex,
} from '../test-helpers/create-collision-test-tile-set.js';
import { createTestSource } from '../test-helpers/create-test-tile-set.js';
import { createTileSet, getTileData, TileSet } from '../tile-set/tile-set.js';
import { getTileImageRect } from '../tiles/get-tile-image-rect.js';
import { packTile } from '../tiles/packed-tile.js';
import { getTileTransformBits } from '../tiles/packed-tile-bits.js';
import { applyTileTransform } from '../tiles/tile-transform.js';
import { buildTilemapCollisionLoops } from './build-tilemap-collision-loops.js';

const orthogonal = createOrthogonalGridLayout({
  cellWidth: 16,
  cellHeight: 16,
});
const isometric = createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 });

const full = collisionTestTile(fullTileIndex);
const slope = collisionTestTile(slopeTileIndex);
const step = collisionTestTile(stepTileIndex);

const transformFields = (
  bits: number,
): { flipX: boolean; flipY: boolean; transpose: boolean } => ({
  flipX: (bits & 4) !== 0,
  flipY: (bits & 2) !== 0,
  transpose: (bits & 1) !== 0,
});

const createLayer = (layout: GridLayout): TilemapLayerEcsComponent => {
  const world = new EcsWorld();

  return addTilemapLayerComponent(world, world.createEntity(), {
    tileSet: createCollisionTestTileSet(layout),
  });
};

const expectLoopsClose = (actual: Vector2[][], expected: Vector2[][]): void => {
  expect(actual.map((loop) => loop.length)).toEqual(
    expected.map((loop) => loop.length),
  );

  actual.forEach((loop, loopIndex) => {
    loop.forEach((point, pointIndex) => {
      expect(point.x).toBeCloseTo(expected[loopIndex][pointIndex].x, 6);
      expect(point.y).toBeCloseTo(expected[loopIndex][pointIndex].y, 6);
    });
  });
};

const sortPoints = (points: readonly Vector2[]): Vector2[] =>
  [...points].sort((a, b) => a.y - b.y || a.x - b.x);

const expectSamePoints = (
  actual: readonly Vector2[],
  expected: readonly Vector2[],
): void => {
  const sortedActual = sortPoints(actual);
  const sortedExpected = sortPoints(expected);

  expect(sortedActual).toHaveLength(sortedExpected.length);
  sortedActual.forEach((point, index) => {
    expect(point.x).toBeCloseTo(sortedExpected[index].x, 6);
    expect(point.y).toBeCloseTo(sortedExpected[index].y, 6);
  });
};

/**
 * A cell's collision shape in layer-local space, found the way its image
 * moves: each point is normalized in the image's rect (the cell's
 * footprint bounds, for these tiles), moved with `applyTileTransform`, and
 * put back in the rect. Wound with positive signed area.
 */
const expectedShape = (
  tileSet: TileSet,
  column: number,
  row: number,
  tile: number,
): Vector2[] | null => {
  const { collision } = getTileData(tileSet, tile);
  const { layout } = tileSet;

  if (collision === null) {
    return null;
  }

  if (collision === 'cell') {
    return layout.getCellPolygon(column, row);
  }

  const rect = getTileImageRect(tileSet, column, row, tile);
  const width = rect.max.x - rect.min.x;
  const height = rect.max.y - rect.min.y;
  const center = layout.getCellCenter(column, row);
  const shape = collision.map((point) => {
    const moved = applyTileTransform(
      getTileTransformBits(tile),
      {
        x: (center.x + point.x - rect.min.x) / width,
        y: (center.y + point.y - rect.min.y) / height,
      },
      { x: 0, y: 0 },
    );

    return {
      x: rect.min.x + moved.x * width,
      y: rect.min.y + moved.y * height,
    };
  });

  return calculateSignedArea(shape) < 0 ? shape.reverse() : shape;
};

describe('buildTilemapCollisionLoops, orthogonal', () => {
  it('gives no loops for an empty layer or one without solid tiles', () => {
    const layer = createLayer(orthogonal);

    expect(buildTilemapCollisionLoops(layer)).toEqual([]);

    setTile(layer, 0, 0, collisionTestTile(openTileIndex));

    expect(buildTilemapCollisionLoops(layer)).toEqual([]);
  });

  it('gives a single tile one 4-edge loop at its cell’s corners', () => {
    const layer = createLayer(orthogonal);

    setTile(layer, 2, 3, full);

    expectLoopsClose(buildTilemapCollisionLoops(layer), [
      orthogonal.getCellPolygon(2, 3),
    ]);
  });

  it.each([
    ['last', maxCellCoordinate],
    ['first', minCellCoordinate],
  ])('outlines a tile in the layer’s %s cell', (_name, cell) => {
    const layer = createLayer(orthogonal);

    setTile(layer, cell, cell, full);

    expectLoopsClose(buildTilemapCollisionLoops(layer), [
      orthogonal.getCellPolygon(cell, cell),
    ]);
  });

  it('gives a row of tiles one loop of 4 edges', () => {
    const layer = createLayer(orthogonal);

    fillTiles(layer, 0, 0, 5, 1, full);

    expectLoopsClose(buildTilemapCollisionLoops(layer), [
      [
        { x: 0, y: 0 },
        { x: 80, y: 0 },
        { x: 80, y: 16 },
        { x: 0, y: 16 },
      ],
    ]);
  });

  it('gives a ring of tiles an outer loop and a hole', () => {
    const layer = createLayer(orthogonal);

    fillTiles(layer, 0, 0, 3, 3, full);
    setTile(layer, 1, 1, 0);

    const loops = buildTilemapCollisionLoops(layer);

    expectLoopsClose(loops, [
      [
        { x: 0, y: 0 },
        { x: 48, y: 0 },
        { x: 48, y: 48 },
        { x: 0, y: 48 },
      ],
      [
        { x: 16, y: 16 },
        { x: 16, y: 32 },
        { x: 32, y: 32 },
        { x: 32, y: 16 },
      ],
    ]);
    expect(calculateSignedArea(loops[0])).toBeGreaterThan(0);
    expect(calculateSignedArea(loops[1])).toBeLessThan(0);
  });

  it('shares a slope’s side with the full tile next to it', () => {
    const layer = createLayer(orthogonal);

    setTile(layer, 0, 0, slope);
    setTile(layer, 1, 0, full);

    expectLoopsClose(buildTilemapCollisionLoops(layer), [
      [
        { x: 16, y: 0 },
        { x: 32, y: 0 },
        { x: 32, y: 16 },
        { x: 0, y: 16 },
      ],
    ]);
  });

  it('keeps the part of a full tile’s side a half-height step doesn’t cover', () => {
    const layer = createLayer(orthogonal);

    setTile(layer, 0, 0, full);
    setTile(layer, 1, 0, step);

    expectLoopsClose(buildTilemapCollisionLoops(layer), [
      [
        { x: 0, y: 0 },
        { x: 16, y: 0 },
        { x: 16, y: 8 },
        { x: 32, y: 8 },
        { x: 32, y: 16 },
        { x: 0, y: 16 },
      ],
    ]);
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 7])(
    'turns a slope with transform bits %s the way its image turns',
    (bits) => {
      const layer = createLayer(orthogonal);
      const tile = collisionTestTile(slopeTileIndex, transformFields(bits));

      setTile(layer, 3, -2, tile);

      const loops = buildTilemapCollisionLoops(layer);
      const expected = expectedShape(layer.tileSet, 3, -2, tile);

      expect(loops).toHaveLength(1);
      expectSamePoints(loops[0], expected ?? []);
      expect(calculateSignedArea(loops[0])).toBeGreaterThan(0);
    },
  );

  it('merges a turned slope with the full tile its long side meets', () => {
    const layer = createLayer(orthogonal);

    // Mirrored left to right, the slope is solid in its bottom-left half,
    // so its left side meets the full tile's right side.
    setTile(layer, 0, 0, full);
    setTile(layer, 1, 0, collisionTestTile(slopeTileIndex, { flipX: true }));

    expectLoopsClose(buildTilemapCollisionLoops(layer), [
      [
        { x: 0, y: 0 },
        { x: 16, y: 0 },
        { x: 32, y: 16 },
        { x: 0, y: 16 },
      ],
    ]);
  });

  it('gives two tiles meeting at a corner two loops sharing that vertex', () => {
    const layer = createLayer(orthogonal);

    setTile(layer, 0, 0, full);
    setTile(layer, 1, 1, full);

    const loops = buildTilemapCollisionLoops(layer);

    expectLoopsClose(loops, [
      orthogonal.getCellPolygon(0, 0),
      orthogonal.getCellPolygon(1, 1),
    ]);
    expect(() => new ChainCollider(loops)).not.toThrow();
  });

  it('orders two loops starting at the same vertex by their next vertex', () => {
    const layer = createLayer(orthogonal);

    // The slope fills its cell's bottom-right half and, flipped vertically,
    // the top-right half of the next cell, so the two only touch at the
    // top of their shared side.
    setTile(layer, 0, 0, slope);
    setTile(layer, 1, 0, collisionTestTile(slopeTileIndex, { flipY: true }));

    const loops = buildTilemapCollisionLoops(layer);

    expectLoopsClose(loops, [
      [
        { x: 16, y: 0 },
        { x: 32, y: 0 },
        { x: 32, y: 16 },
      ],
      [
        { x: 16, y: 0 },
        { x: 16, y: 16 },
        { x: 0, y: 16 },
      ],
    ]);
    expect(() => new ChainCollider(loops)).not.toThrow();
  });

  it('splits a side where a neighbor’s tip touches its middle', () => {
    const world = new EcsWorld();
    const layer = addTilemapLayerComponent(world, world.createEntity(), {
      tileSet: createTileSet({
        layout: orthogonal,
        sources: [
          createTestSource(2, 1, {
            tiles: new Map([
              [0, { collision: 'cell' }],
              // A triangle pointing down, its tip on the middle of its
              // bottom side.
              [
                1,
                {
                  collision: [
                    { x: -8, y: -8 },
                    { x: 8, y: -8 },
                    { x: 0, y: 8 },
                  ],
                },
              ],
            ]),
          }),
        ],
      }),
    });

    setTile(layer, 0, -1, packTile({ source: 0, tile: 1 }));
    setTile(layer, 0, 0, packTile({ source: 0, tile: 0 }));

    const loops = buildTilemapCollisionLoops(layer);

    expectLoopsClose(loops, [
      [
        { x: 0, y: -16 },
        { x: 16, y: -16 },
        { x: 8, y: 0 },
      ],
      [
        { x: 0, y: 0 },
        { x: 8, y: 0 },
        { x: 16, y: 0 },
        { x: 16, y: 16 },
        { x: 0, y: 16 },
      ],
    ]);
    expect(() => new ChainCollider(loops)).not.toThrow();
  });

  it('gives the same loops however the tiles were painted', () => {
    const cells: [number, number, number][] = [];
    const random = new Random('paint order');

    for (let row = 28; row < 36; row++) {
      for (let column = -36; column < -28; column++) {
        const kind = random.randomInt(0, 3);

        if (kind < 3) {
          cells.push([
            column,
            row,
            collisionTestTile(
              [fullTileIndex, slopeTileIndex, stepTileIndex][kind],
              transformFields(random.randomInt(0, 7)),
            ),
          ]);
        }
      }
    }

    const forwards = createLayer(orthogonal);
    const backwards = createLayer(orthogonal);

    for (const [column, row, tile] of cells) {
      setTile(forwards, column, row, tile);
    }

    for (const [column, row, tile] of [...cells].reverse()) {
      setTile(backwards, column, row, tile);
    }

    // Painting over a cell and clearing it again leaves the same tiles.
    setTile(backwards, -40, 40, full);
    setTile(backwards, -40, 40, 0);

    expect(buildTilemapCollisionLoops(backwards)).toEqual(
      buildTilemapCollisionLoops(forwards),
    );
  });
});

describe('buildTilemapCollisionLoops, isometric', () => {
  it('gives a single cell tile one diamond loop', () => {
    const layer = createLayer(isometric);

    setTile(layer, 1, 2, full);

    expectLoopsClose(buildTilemapCollisionLoops(layer), [
      isometric.getCellPolygon(1, 2),
    ]);
  });

  it('gives a row along one column axis one 4-edge parallelogram', () => {
    const layer = createLayer(isometric);

    fillTiles(layer, 0, 0, 4, 1, full);

    expectLoopsClose(buildTilemapCollisionLoops(layer), [
      [
        isometric.cellSpaceToLocal({ x: 0, y: 0 }),
        isometric.cellSpaceToLocal({ x: 4, y: 0 }),
        isometric.cellSpaceToLocal({ x: 4, y: 1 }),
        isometric.cellSpaceToLocal({ x: 0, y: 1 }),
      ],
    ]);
  });

  it('gives an L of tiles one 6-edge loop', () => {
    const layer = createLayer(isometric);

    fillTiles(layer, 0, 0, 3, 1, full);
    fillTiles(layer, 0, 1, 1, 2, full);

    const loops = buildTilemapCollisionLoops(layer);

    expect(loops).toHaveLength(1);
    expectSamePoints(loops[0], [
      isometric.cellSpaceToLocal({ x: 0, y: 0 }),
      isometric.cellSpaceToLocal({ x: 3, y: 0 }),
      isometric.cellSpaceToLocal({ x: 3, y: 1 }),
      isometric.cellSpaceToLocal({ x: 1, y: 1 }),
      isometric.cellSpaceToLocal({ x: 1, y: 3 }),
      isometric.cellSpaceToLocal({ x: 0, y: 3 }),
    ]);
    expect(calculateSignedArea(loops[0])).toBeGreaterThan(0);
  });

  it('gives a ring of tiles an outer loop and a hole', () => {
    const layer = createLayer(isometric);

    fillTiles(layer, 0, 0, 3, 3, full);
    setTile(layer, 1, 1, 0);

    const loops = buildTilemapCollisionLoops(layer);

    expect(loops).toHaveLength(2);
    expectSamePoints(loops[0], [
      isometric.cellSpaceToLocal({ x: 0, y: 0 }),
      isometric.cellSpaceToLocal({ x: 3, y: 0 }),
      isometric.cellSpaceToLocal({ x: 3, y: 3 }),
      isometric.cellSpaceToLocal({ x: 0, y: 3 }),
    ]);
    expectSamePoints(loops[1], isometric.getCellPolygon(1, 1));
    expect(calculateSignedArea(loops[0])).toBeGreaterThan(0);
    expect(calculateSignedArea(loops[1])).toBeLessThan(0);
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 7])(
    'puts a half-cell slope with transform bits %s where the same tile draws',
    (bits) => {
      const layer = createLayer(isometric);
      const tile = collisionTestTile(slopeTileIndex, transformFields(bits));

      setTile(layer, -1, 2, tile);

      const loops = buildTilemapCollisionLoops(layer);

      expect(loops).toHaveLength(1);
      expectSamePoints(
        loops[0],
        expectedShape(layer.tileSet, -1, 2, tile) ?? [],
      );
      expect(calculateSignedArea(loops[0])).toBeGreaterThan(0);
    },
  );
});

/**
 * Whether a point is inside a convex polygon with positive signed area, or
 * on its boundary: a point nudged off the middle of a long merged edge can
 * land exactly on the side two solid cells share.
 */
const isInside = (polygon: readonly Vector2[], point: Vector2): boolean =>
  polygon.every((start, index) => {
    const end = polygon[(index + 1) % polygon.length];

    return (
      (end.x - start.x) * (point.y - start.y) -
        (end.y - start.y) * (point.x - start.x) >=
      0
    );
  });

describe.each([
  [
    'orthogonal, 32-unit cells',
    createOrthogonalGridLayout({ cellWidth: 32, cellHeight: 32 }),
  ],
  [
    'orthogonal, 1-unit cells',
    createOrthogonalGridLayout({ cellWidth: 1, cellHeight: 1 }),
  ],
  [
    'isometric, 64 x 32 cells',
    createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
  ],
  [
    'isometric, 2 x 1 cells',
    createIsometricGridLayout({ cellWidth: 2, cellHeight: 1 }),
  ],
])('buildTilemapCollisionLoops on random layers, %s', (_name, layout) => {
  it.each(Array.from({ length: 12 }, (_, seed) => seed))(
    'outlines exactly the solid tiles (seed %s)',
    (seed) => {
      const random = new Random(`tilemap collision ${seed}`);
      const layer = createLayer(layout);
      const { tileSet } = layer;
      const tileIndices = [
        fullTileIndex,
        slopeTileIndex,
        stepTileIndex,
        openTileIndex,
      ];

      // Across the chunk borders at column -32 and row 32.
      for (let row = 28; row < 37; row++) {
        for (let column = -36; column < -27; column++) {
          if (random.randomInt(0, 9) < 6) {
            setTile(
              layer,
              column,
              row,
              collisionTestTile(
                tileIndices[random.randomInt(0, 3)],
                transformFields(random.randomInt(0, 7)),
              ),
            );
          }
        }
      }

      const shapes = new Map<string, Vector2[]>();

      forEachTile(layer, (column, row, tile) => {
        const shape = expectedShape(tileSet, column, row, tile);

        if (shape) {
          shapes.set(`${column},${row}`, shape);
        }
      });

      const loops = buildTilemapCollisionLoops(layer);

      expect(() => new ChainCollider(loops)).not.toThrow();

      const loopArea = loops.reduce(
        (sum, loop) => sum + calculateSignedArea(loop),
        0,
      );
      const shapeArea = [...shapes.values()].reduce(
        (sum, shape) => sum + calculateSignedArea(shape),
        0,
      );

      expect(loopArea).toBeCloseTo(shapeArea, 6);

      const isSolid = (point: Vector2): boolean => {
        const { column, row } = layout.localToCell(point);

        for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
          for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
            const shape = shapes.get(
              `${column + columnOffset},${row + rowOffset}`,
            );

            if (shape && isInside(shape, point)) {
              return true;
            }
          }
        }

        return false;
      };

      const nudge = 1e-4 * Math.min(layout.cellWidth, layout.cellHeight);

      for (const loop of loops) {
        loop.forEach((start, index) => {
          const end = loop[(index + 1) % loop.length];
          const length = Math.hypot(end.x - start.x, end.y - start.y);
          // Solid is on the right of each edge, on screen.
          const inwardX = -(end.y - start.y) / length;
          const inwardY = (end.x - start.x) / length;
          const middle = {
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2,
          };

          expect(
            isSolid({
              x: middle.x + inwardX * nudge,
              y: middle.y + inwardY * nudge,
            }),
          ).toBe(true);
          expect(
            isSolid({
              x: middle.x - inwardX * nudge,
              y: middle.y - inwardY * nudge,
            }),
          ).toBe(false);
        });
      }
    },
  );
});
