import { beforeEach, describe, expect, it } from 'vitest';
import { addPositionComponent } from '../../common/components/position-component.js';
import { createTransformEcsSystem } from '../../common/systems/transform-system.js';
import { Time } from '../../common/time/Time.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { createIsometricGridLayout } from '../../math/grid-layout/create-isometric-grid-layout.js';
import { createOrthogonalGridLayout } from '../../math/grid-layout/create-orthogonal-grid-layout.js';
import {
  GridCellRange,
  GridLayout,
} from '../../math/grid-layout/grid-layout.js';
import { Random } from '../../math/random.js';
import { Vector2 } from '../../math/vector2.js';
import { ChainCollider } from '../../physics/colliders/chain-collider.js';
import {
  addColliderComponent,
  colliderId,
} from '../../physics/components/collider-component.js';
import {
  clearTile,
  fillTiles,
  setTile,
} from '../../tilemaps/cells/edit-tiles.js';
import { getUsedRect } from '../../tilemaps/cells/read-tiles.js';
import { addTilemapColliderComponent } from '../../tilemaps/components/tilemap-collider-component.js';
import { addTilemapLayerComponent } from '../../tilemaps/components/tilemap-layer-component.js';
import {
  cellToWorld,
  worldToCell,
} from '../../tilemaps/conversions/cell-conversions.js';
import { createTilemapColliderEcsSystem } from '../../tilemaps/systems/tilemap-collider-system.js';
import {
  collisionTestTile,
  createCollisionTestTileSet,
  fullTileIndex,
  openTileIndex,
} from '../../tilemaps/test-helpers/create-collision-test-tile-set.js';
import {
  compareWithReference,
  getBlockedCells,
} from '../test-helpers/bake-reference.js';
import { createNavigationGrid } from './create-navigation-grid.js';
import { findGridPath } from './find-grid-path.js';
import { markGridFromColliders } from './mark-grid-from-colliders.js';
import { NavigationGrid } from './navigation-grid.js';

const layouts: readonly [name: string, layout: GridLayout][] = [
  ['isometric', createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 })],
  ['orthogonal', createOrthogonalGridLayout({ cellWidth: 32, cellHeight: 16 })],
];

// A sum of powers of two, so moving a point by it and back is exact and a
// point on a cell edge lands on that edge in both the grid and the layer.
const layerPosition = { x: 130.5, y: -70 };

// A wall down column 1, from row -2 to row 2, with open floor round it.
const wallCells = ['1,-2', '1,-1', '1,0', '1,1', '1,2'];

describe.each(layouts)(
  'a navigation grid over a %s tile layer',
  (_, layout) => {
    let world: EcsWorld;
    let layerEntity: number;
    let used: GridCellRange;
    let grid: NavigationGrid;

    /** A world point at a cell-space position of the layer. */
    const at = (x: number, y: number): Vector2 => {
      const local = layout.cellSpaceToLocal({ x, y });

      return { x: local.x + layerPosition.x, y: local.y + layerPosition.y };
    };

    beforeEach(() => {
      world = new EcsWorld();
      world.addSystem(createTilemapColliderEcsSystem());
      world.addSystem(createTransformEcsSystem(new Time()));

      layerEntity = world.createEntity();

      const layer = addTilemapLayerComponent(world, layerEntity, {
        tileSet: createCollisionTestTileSet(layout),
      });

      addPositionComponent(world, layerEntity, { local: layerPosition });
      addColliderComponent(world, layerEntity, {
        collider: new ChainCollider([]),
      });
      addTilemapColliderComponent(world, layerEntity);

      // Floor from (-3, -2) to (4, 3), a hole at (0, 0) and the wall.
      fillTiles(layer, -3, -2, 8, 6, collisionTestTile(openTileIndex));
      clearTile(layer, 0, 0);

      for (let row = -2; row <= 2; row++) {
        setTile(layer, 1, row, collisionTestTile(fullTileIndex));
      }

      world.update();

      const rect = getUsedRect(layer);

      if (!rect) {
        throw new Error('The test layer has no tiles.');
      }

      used = rect;
      grid = createNavigationGrid({
        cells: used,
        layout,
        origin: layerPosition,
      });
    });

    it("has the layer's cells, by number and by position", () => {
      expect(grid.cells).toEqual({
        minColumn: -3,
        minRow: -2,
        maxColumn: 4,
        maxRow: 3,
      });

      for (let row = used.minRow; row <= used.maxRow; row++) {
        for (let column = used.minColumn; column <= used.maxColumn; column++) {
          expect(grid.cellToWorld(column, row)).toEqual(
            cellToWorld(world, layerEntity, column, row),
          );
        }
      }
    });

    it('puts every point in the same cell as the layer', () => {
      const random = new Random(`tile-layer-alignment-${layout.cellHeight}`);

      for (let i = 0; i < 200; i++) {
        const point = at(
          random.randomFloat(used.minColumn, used.maxColumn + 1),
          random.randomFloat(used.minRow, used.maxRow + 1),
        );

        expect(grid.worldToCell(point)).toEqual(
          worldToCell(world, layerEntity, point),
        );
      }
    });

    it("gives each cell's corners and edge midpoints to the same cell as the layer", () => {
      const offsets = [0, 0.5];

      for (let row = used.minRow; row <= used.maxRow; row++) {
        for (let column = used.minColumn; column <= used.maxColumn; column++) {
          for (const dx of offsets) {
            for (const dy of offsets) {
              const point = at(column + dx, row + dy);

              expect(grid.worldToCell(point)).toEqual(
                worldToCell(world, layerEntity, point),
              );
            }
          }
        }
      }
    });

    it("has no cell outside the layer's used cells", () => {
      const outside = [
        at(used.minColumn - 0.5, used.minRow + 0.5),
        at(used.maxColumn + 1.5, used.maxRow + 0.5),
        at(used.minColumn + 0.5, used.minRow - 0.5),
        at(used.maxColumn + 0.5, used.maxRow + 1.5),
      ];

      for (const point of outside) {
        const layerCell = worldToCell(world, layerEntity, point);

        expect(grid.hasCell(layerCell.column, layerCell.row)).toBe(false);
        expect(grid.worldToCell(point)).toBeNull();
      }
    });

    it("blocks exactly the layer's solid cells, and finds paths through its open ones", () => {
      markGridFromColliders(world, grid);

      expect(getBlockedCells(grid)).toEqual(wallCells);

      const result = findGridPath(
        grid,
        cellToWorld(world, layerEntity, -1, 0),
        cellToWorld(world, layerEntity, 3, 0),
      );

      expect(result.status).toBe('found');

      for (const point of result.points) {
        const { column, row } = worldToCell(world, layerEntity, point);

        expect(point).toEqual(cellToWorld(world, layerEntity, column, row));
        expect(wallCells).not.toContain(`${column},${row}`);
        expect(grid.hasCell(column, row)).toBe(true);
      }

      // The wall's only way round is through row 3, below its end.
      expect(result.points).toContainEqual(
        cellToWorld(world, layerEntity, 1, 3),
      );
    });

    it.each([0.25, 1])(
      "pads the layer's walls by an agentRadius of %s cell heights",
      (cellHeights) => {
        const agentRadius = cellHeights * layout.cellHeight;
        const collider = world.getComponent(layerEntity, colliderId);

        if (!(collider?.collider instanceof ChainCollider)) {
          throw new Error('The test layer has no chain collider.');
        }

        const loops = collider.collider.loops.map((loop) =>
          loop.map((point) => ({
            x: point.x + layerPosition.x,
            y: point.y + layerPosition.y,
          })),
        );

        markGridFromColliders(world, grid, { agentRadius });

        const blockedCells = getBlockedCells(grid);
        const { wrong } = compareWithReference(
          grid,
          [{ kind: 'loops', loops }],
          agentRadius,
        );

        expect(wrong).toEqual([]);
        expect(blockedCells).toEqual(expect.arrayContaining(wallCells));
        expect(blockedCells.length).toBeGreaterThan(wallCells.length);
      },
    );
  },
);
