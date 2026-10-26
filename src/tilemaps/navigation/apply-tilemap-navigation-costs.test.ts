import { describe, expect, it } from 'vitest';
import { addPositionComponent } from '../../common/components/position-component.js';
import { addRotationComponent } from '../../common/components/rotation-component.js';
import { addScaleComponent } from '../../common/components/scale-component.js';
import { createTransformEcsSystem } from '../../common/systems/transform-system.js';
import { Time } from '../../common/time/Time.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  createIsometricGridLayout,
  createOrthogonalGridLayout,
  GridCellRange,
  GridLayout,
  Vector2,
} from '../../math/index.js';
import { createNavigationGrid } from '../../navigation/grid/create-navigation-grid.js';
import { findGridPath } from '../../navigation/grid/find-grid-path.js';
import { NavigationGrid } from '../../navigation/grid/navigation-grid.js';
import { fillTiles, setTile } from '../cells/edit-tiles.js';
import { getTile, getUsedRect } from '../cells/read-tiles.js';
import {
  addTilemapLayerComponent,
  TilemapLayerEcsComponent,
} from '../components/tilemap-layer-component.js';
import { worldToCell } from '../conversions/cell-conversions.js';
import { createTestSource } from '../test-helpers/create-test-tile-set.js';
import { createTileSet, getTileData, TileSet } from '../tile-set/tile-set.js';
import { emptyTile, packTile } from '../tiles/packed-tile.js';
import { applyTilemapNavigationCosts } from './apply-tilemap-navigation-costs.js';

const mudTile = packTile({ source: 0, tile: 0 });
const roadTile = packTile({ source: 0, tile: 1 });
const wallTile = packTile({ source: 0, tile: 2 });
const plainTile = packTile({ source: 0, tile: 3 });
const animatedTile = packTile({ source: 0, tile: 4 });

/**
 * A tile set of mud (cost `mudCost`), road (`0.5`), a wall with no cost, a
 * tile with no data and an animated tile (`2`) whose frames show mud and
 * road.
 */
const createCostTileSet = (layout: GridLayout, mudCost: number): TileSet =>
  createTileSet({
    layout,
    sources: [
      createTestSource(3, 2, {
        tiles: new Map([
          [0, { navigationCost: mudCost }],
          [1, { navigationCost: 0.5 }],
          [2, { collision: 'cell' }],
          [
            4,
            {
              navigationCost: 2,
              animation: [
                { tile: 0, durationMilliseconds: 100 },
                { tile: 1, durationMilliseconds: 100 },
              ],
            },
          ],
        ]),
      }),
    ],
  });

const layouts: readonly [name: string, layout: GridLayout, half: GridLayout][] =
  [
    [
      'orthogonal',
      createOrthogonalGridLayout({ cellWidth: 32, cellHeight: 16 }),
      createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 8 }),
    ],
    [
      'isometric',
      createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
      createIsometricGridLayout({ cellWidth: 32, cellHeight: 16 }),
    ],
  ];

// A sum of powers of two, so moving a point by it and back is exact.
const layerPosition = { x: 130.5, y: -70 };

interface TestLayer {
  entity: number;
  layer: TilemapLayerEcsComponent;
}

const addLayer = (
  world: EcsWorld,
  layout: GridLayout,
  position: Vector2 = layerPosition,
  mudCost = 3,
): TestLayer => {
  const entity = world.createEntity();
  const layer = addTilemapLayerComponent(world, entity, {
    tileSet: createCostTileSet(layout, mudCost),
  });

  addPositionComponent(world, entity, { local: position });

  return { entity, layer };
};

/**
 * Paints a 6 x 4 block from (-2, -1): a road along the top row, 2 x 2 mud
 * below its left end, a wall, an animated tile, an empty cell, and plain
 * tiles elsewhere.
 */
const paintLevel = (layer: TilemapLayerEcsComponent): void => {
  fillTiles(layer, -2, -1, 6, 4, plainTile);
  fillTiles(layer, -2, -1, 6, 1, roadTile);
  fillTiles(layer, -2, 0, 2, 2, mudTile);
  setTile(layer, 1, 1, wallTile);
  setTile(layer, 2, 2, animatedTile);
  setTile(layer, 3, 2, emptyTile);
};

/** The used cells of a painted level. */
const levelCells: GridCellRange = {
  minColumn: -2,
  minRow: -1,
  maxColumn: 3,
  maxRow: 2,
};

/** The cost a cell of a painted level holds, or `null` for none. */
const getLevelCost = (column: number, row: number): number | null => {
  if (row === -1) {
    return 0.5;
  }

  if (column < 0 && row <= 1) {
    return 3;
  }

  return column === 2 && row === 2 ? 2 : null;
};

const getCosts = (grid: NavigationGrid): number[] => {
  const costs: number[] = [];

  for (let node = 0; node < grid.nodeCount; node++) {
    const { column, row } = grid.nodeToCell(node);

    costs.push(grid.getCost(column, row));
  }

  return costs;
};

/**
 * The cost each cell of a grid should have: that of the tile `worldToCell`
 * finds under its centre, or `previous` without one.
 */
const getExpectedCosts = (
  world: EcsWorld,
  { entity, layer }: TestLayer,
  grid: NavigationGrid,
  previous: number,
): number[] => {
  const costs: number[] = [];

  for (let node = 0; node < grid.nodeCount; node++) {
    const { column, row } = grid.nodeToCell(node);
    const cell = worldToCell(world, entity, grid.cellToWorld(column, row));
    const tile = getTile(layer, cell.column, cell.row);
    const cost =
      tile === emptyTile
        ? null
        : getTileData(layer.tileSet, tile).navigationCost;

    costs.push(cost ?? previous);
  }

  return costs;
};

/** Counts the entries of `costs` other than `previous`. */
const countChanged = (costs: readonly number[], previous: number): number =>
  costs.filter((cost) => cost !== previous).length;

describe.each(layouts)(
  'applyTilemapNavigationCosts on a %s layer',
  (_, layout, half) => {
    it("gives each cell of a grid laid over the layer its own tile's cost", () => {
      const world = new EcsWorld();
      const testLayer = addLayer(world, layout);

      paintLevel(testLayer.layer);
      expect(getUsedRect(testLayer.layer)).toEqual(levelCells);

      const grid = createNavigationGrid({
        cells: levelCells,
        layout,
        origin: layerPosition,
      });

      applyTilemapNavigationCosts(world, testLayer.entity, grid);

      for (let row = levelCells.minRow; row <= levelCells.maxRow; row++) {
        for (
          let column = levelCells.minColumn;
          column <= levelCells.maxColumn;
          column++
        ) {
          expect(grid.getCost(column, row)).toBe(
            getLevelCost(column, row) ?? 1,
          );
        }
      }
    });

    it('leaves the cost of cells over empty cells and tiles without a cost alone', () => {
      const world = new EcsWorld();
      const testLayer = addLayer(world, layout);

      paintLevel(testLayer.layer);

      // A row and column past the level hang over empty cells.
      const grid = createNavigationGrid({
        cells: { ...levelCells, maxColumn: 4, maxRow: 3 },
        layout,
        origin: layerPosition,
      });

      grid.fillCost(grid.cells, 7);
      applyTilemapNavigationCosts(world, testLayer.entity, grid);

      expect(grid.getCost(1, 1)).toBe(7); // the wall
      expect(grid.getCost(0, 0)).toBe(7); // a plain tile
      expect(grid.getCost(3, 2)).toBe(7); // the empty cell
      expect(grid.getCost(4, 0)).toBe(7);
      expect(grid.getCost(0, 3)).toBe(7);
      expect(grid.getCost(-2, 0)).toBe(3);
    });

    it('gives the four cells of a grid at half the cell size their tile’s cost', () => {
      const world = new EcsWorld();
      const testLayer = addLayer(world, layout);

      paintLevel(testLayer.layer);

      const grid = createNavigationGrid({
        cells: {
          minColumn: levelCells.minColumn * 2,
          minRow: levelCells.minRow * 2,
          maxColumn: levelCells.maxColumn * 2 + 1,
          maxRow: levelCells.maxRow * 2 + 1,
        },
        layout: half,
        origin: layerPosition,
      });

      applyTilemapNavigationCosts(world, testLayer.entity, grid);

      for (let node = 0; node < grid.nodeCount; node++) {
        const { column, row } = grid.nodeToCell(node);

        expect(grid.getCost(column, row)).toBe(
          getLevelCost(Math.floor(column / 2), Math.floor(row / 2)) ?? 1,
        );
      }
    });

    it('takes the tile under the centre of each cell of a coarser grid', () => {
      const world = new EcsWorld();
      const testLayer = addLayer(world, layout);

      paintLevel(testLayer.layer);

      const grid = createNavigationGrid({
        cells: { minColumn: -2, minRow: -2, maxColumn: 2, maxRow: 2 },
        layout: createOrthogonalGridLayout({ cellWidth: 48, cellHeight: 40 }),
        origin: { x: layerPosition.x - 60, y: layerPosition.y - 30 },
      });

      applyTilemapNavigationCosts(world, testLayer.entity, grid);

      const expected = getExpectedCosts(world, testLayer, grid, 1);

      expect(getCosts(grid)).toEqual(expected);
      expect(countChanged(expected, 1)).toBeGreaterThan(2);
    });

    it('follows a parented layer offset from the grid', () => {
      const world = new EcsWorld();

      world.addSystem(createTransformEcsSystem(new Time()));

      const parent = world.createEntity();

      addPositionComponent(world, parent, { local: { x: 40, y: 25 } });

      const testLayer = addLayer(world, layout, { x: -13, y: 7.5 });

      world.setParent(testLayer.entity, parent);
      paintLevel(testLayer.layer);
      world.update();

      const grid = createNavigationGrid({
        cells: { minColumn: -6, minRow: -6, maxColumn: 6, maxRow: 6 },
        layout: createOrthogonalGridLayout({ cellWidth: 12, cellHeight: 12 }),
      });

      applyTilemapNavigationCosts(world, testLayer.entity, grid);

      const expected = getExpectedCosts(world, testLayer, grid, 1);

      expect(getCosts(grid)).toEqual(expected);
      expect(countChanged(expected, 1)).toBeGreaterThan(10);
    });

    // Physics ignores scale, so only the costs follow a scaled layer.
    it("follows a rotated and scaled layer's costs", () => {
      const world = new EcsWorld();

      world.addSystem(createTransformEcsSystem(new Time()));

      const testLayer = addLayer(world, layout, { x: 20, y: -10 });

      addRotationComponent(world, testLayer.entity, { local: 0.4 });
      addScaleComponent(world, testLayer.entity, {
        local: { x: 1.5, y: 0.75 },
      });
      paintLevel(testLayer.layer);
      world.update();

      const grid = createNavigationGrid({
        cells: { minColumn: -8, minRow: -8, maxColumn: 8, maxRow: 8 },
        layout: createOrthogonalGridLayout({ cellWidth: 10, cellHeight: 10 }),
      });

      applyTilemapNavigationCosts(world, testLayer.entity, grid);

      const expected = getExpectedCosts(world, testLayer, grid, 1);

      expect(getCosts(grid)).toEqual(expected);
      expect(countChanged(expected, 1)).toBeGreaterThan(10);
    });
  },
);

describe('applyTilemapNavigationCosts', () => {
  const layout = createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 });

  const createLevel = (): {
    world: EcsWorld;
    testLayer: TestLayer;
    grid: NavigationGrid;
  } => {
    const world = new EcsWorld();
    const testLayer = addLayer(world, layout);

    paintLevel(testLayer.layer);

    const grid = createNavigationGrid({
      cells: levelCells,
      layout,
      origin: layerPosition,
    });

    return { world, testLayer, grid };
  };

  it('never changes walkability', () => {
    const { world, testLayer, grid } = createLevel();

    grid.setWalkable(-2, 0, false);
    grid.setWalkable(1, 1, false);
    applyTilemapNavigationCosts(world, testLayer.entity, grid);

    expect(grid.isWalkable(-2, 0)).toBe(false);
    expect(grid.getCost(-2, 0)).toBe(3);
    expect(grid.isWalkable(1, 1)).toBe(false);

    for (let node = 0; node < grid.nodeCount; node++) {
      const { column, row } = grid.nodeToCell(node);
      const blocked =
        (column === -2 && row === 0) || (column === 1 && row === 1);

      expect(grid.isWalkable(column, row)).toBe(!blocked);
    }
  });

  it('gives a cell holding an animated tile the placed tile’s cost', () => {
    const { world, testLayer, grid } = createLevel();

    applyTilemapNavigationCosts(world, testLayer.entity, grid);

    // Its frames show mud (3) and road (0.5).
    expect(grid.getCost(2, 2)).toBe(2);
  });

  it("replaces an earlier layer's costs with a later layer's", () => {
    const world = new EcsWorld();
    const ground = addLayer(world, layout);
    const roads = addLayer(world, layout);

    fillTiles(ground.layer, -2, -1, 6, 4, mudTile);
    fillTiles(roads.layer, -2, 1, 6, 1, roadTile);
    setTile(roads.layer, 0, 0, plainTile);

    const grid = createNavigationGrid({
      cells: levelCells,
      layout,
      origin: layerPosition,
    });

    applyTilemapNavigationCosts(world, ground.entity, grid);
    applyTilemapNavigationCosts(world, roads.entity, grid);

    for (let node = 0; node < grid.nodeCount; node++) {
      const { column, row } = grid.nodeToCell(node);

      expect(grid.getCost(column, row)).toBe(row === 1 ? 0.5 : 3);
    }
  });

  it('increases version once for a call that changes costs, and not for a repeat', () => {
    const { world, testLayer, grid } = createLevel();

    applyTilemapNavigationCosts(world, testLayer.entity, grid);
    expect(grid.version).toBe(1);

    applyTilemapNavigationCosts(world, testLayer.entity, grid);
    expect(grid.version).toBe(1);
  });

  it('throws for an entity without a TilemapLayerEcsComponent', () => {
    const { world, grid } = createLevel();
    const entity = world.createEntity();

    addPositionComponent(world, entity);

    expect(() => applyTilemapNavigationCosts(world, entity, grid)).toThrow(
      `entity ${entity} has no TilemapLayerEcsComponent`,
    );
  });

  it('throws for a layer without a PositionEcsComponent', () => {
    const { world, grid } = createLevel();
    const entity = world.createEntity();

    addTilemapLayerComponent(world, entity, {
      tileSet: createCostTileSet(layout, 3),
    });

    expect(() => applyTilemapNavigationCosts(world, entity, grid)).toThrow(
      'the entity has no PositionEcsComponent',
    );
  });

  it('throws for a layer whose world scale is 0 on an axis', () => {
    const { world, testLayer, grid } = createLevel();

    addScaleComponent(world, testLayer.entity, { local: { x: 0, y: 1 } });

    expect(() =>
      applyTilemapNavigationCosts(world, testLayer.entity, grid),
    ).toThrow('is 0 on an axis');
  });

  describe('paths', () => {
    // A 9 x 5 field with a mud wall down column 4, from row 0 to row 3. Going
    // straight across row 0 enters 7 grass cells and the mud; going round
    // through row 4 enters 16 grass cells.
    const findPathAcross = (mudCost: number): string[] => {
      const world = new EcsWorld();
      const field = addLayer(world, layout, { x: 0, y: 0 }, mudCost);

      fillTiles(field.layer, 0, 0, 9, 5, plainTile);
      fillTiles(field.layer, 4, 0, 1, 4, mudTile);

      const grid = createNavigationGrid({
        cells: { minColumn: 0, minRow: 0, maxColumn: 8, maxRow: 4 },
        layout,
        diagonals: 'never',
      });

      applyTilemapNavigationCosts(world, field.entity, grid);

      const result = findGridPath(
        grid,
        grid.cellToWorld(0, 0),
        grid.cellToWorld(8, 0),
      );

      expect(result.status).toBe('found');

      return result.nodes.map((node) => {
        const { column, row } = grid.nodeToCell(node);

        return `${column},${row}`;
      });
    };

    it('goes round mud that costs more than the way round', () => {
      const cells = findPathAcross(20);

      expect(cells).toContain('4,4');
      expect(cells).not.toContain('4,0');
    });

    it('goes through mud that costs less than the way round', () => {
      const cells = findPathAcross(3);

      expect(cells).toContain('4,0');
      expect(cells).toHaveLength(9);
    });
  });
});
