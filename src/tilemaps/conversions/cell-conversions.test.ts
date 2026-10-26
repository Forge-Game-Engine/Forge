import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '../../common/components/index.js';
import { createTransformEcsSystem } from '../../common/systems/transform-system.js';
import { Time } from '../../common/time/Time.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  createIsometricGridLayout,
  createOrthogonalGridLayout,
  GridLayout,
} from '../../math/index.js';
import { addTilemapLayerComponent } from '../components/tilemap-layer-component.js';
import { createTestTileSet } from '../test-helpers/create-test-tile-set.js';
import {
  cellToLocal,
  cellToWorld,
  localToCell,
  worldToCell,
} from './cell-conversions.js';

const layouts: [string, GridLayout][] = [
  ['orthogonal', createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 12 })],
  ['isometric', createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 })],
];

describe('cell conversions', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    world.addSystem(createTransformEcsSystem(new Time()));
  });

  describe.each(layouts)('with an %s tile set', (_name, layout) => {
    it('round-trips every cell from -40 to 40 through layer-local space', () => {
      const layer = addTilemapLayerComponent(world, world.createEntity(), {
        tileSet: createTestTileSet(layout),
      });

      for (let row = -40; row <= 40; row++) {
        for (let column = -40; column <= 40; column++) {
          expect(localToCell(layer, cellToLocal(layer, column, row))).toEqual({
            column,
            row,
          });
        }
      }
    });

    it('places cells through the layout, rows going down the screen', () => {
      const layer = addTilemapLayerComponent(world, world.createEntity(), {
        tileSet: createTestTileSet(layout),
      });

      expect(cellToLocal(layer, 3, -2)).toEqual(layout.getCellCenter(3, -2));
      expect(cellToLocal(layer, 0, 1).y).toBeGreaterThan(
        cellToLocal(layer, 0, 0).y,
      );
    });

    it('round-trips cells through world space on a rotated, scaled, parented layer', () => {
      const root = world.createEntity();
      const entity = world.createEntity();

      addPositionComponent(world, root, { local: { x: 300, y: -120 } });
      addPositionComponent(world, entity, { local: { x: 10, y: 5 } });
      addRotationComponent(world, entity, { local: 0.3 });
      addScaleComponent(world, entity, { local: { x: 2, y: 0.5 } });
      addTilemapLayerComponent(world, entity, {
        tileSet: createTestTileSet(layout),
      });
      world.setParent(entity, root);
      world.update();

      for (let row = -12; row <= 12; row += 3) {
        for (let column = -12; column <= 12; column += 3) {
          expect(
            worldToCell(world, entity, cellToWorld(world, entity, column, row)),
          ).toEqual({ column, row });
        }
      }
    });
  });

  it('places a cell in world space through the layer entity transform', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x: 100, y: 50 } });
    addRotationComponent(world, entity, { local: Math.PI / 2 });
    addTilemapLayerComponent(world, entity, {
      tileSet: createTestTileSet(),
    });
    world.update();

    // Cell (1, 0)'s center is (24, 8) in the layer; a quarter turn
    // clockwise takes it to (-8, 24).
    const center = cellToWorld(world, entity, 1, 0);

    expect(center.x).toBeCloseTo(92);
    expect(center.y).toBeCloseTo(74);
    expect(worldToCell(world, entity, { x: 99, y: 51 })).toEqual({
      column: 0,
      row: 0,
    });
    expect(worldToCell(world, entity, { x: 101, y: 51 })).toEqual({
      column: 0,
      row: -1,
    });
  });

  it('throws for an entity with no tilemap layer', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity);

    expect(() => cellToWorld(world, entity, 0, 0)).toThrow(
      /has no TilemapLayerEcsComponent/,
    );
    expect(() => worldToCell(world, entity, { x: 0, y: 0 })).toThrow(
      /has no TilemapLayerEcsComponent/,
    );
  });

  it('throws for a cell outside the supported range', () => {
    const layer = addTilemapLayerComponent(world, world.createEntity(), {
      tileSet: createTestTileSet(),
    });

    expect(() => cellToLocal(layer, 0.5, 0)).toThrow(/must be whole numbers/);
  });
});
