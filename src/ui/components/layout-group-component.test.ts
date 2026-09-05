import { describe, expect, it } from 'vitest';
import {
  addGridLayoutGroupComponent,
  addHorizontalLayoutGroupComponent,
  addVerticalLayoutGroupComponent,
  gridLayoutGroupId,
  uiAxisLayoutGroupId,
} from './layout-group-component.js';
import { uiAlignments } from '../types/ui-alignment.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addHorizontalLayoutGroupComponent', () => {
  it('defaults its fields and sets direction to horizontal', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addHorizontalLayoutGroupComponent(world, entity);

    expect(component.direction).toBe('horizontal');
    expect(component.padding).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
    expect(component.spacing).toBe(0);
    expect(component.childAlignment).toEqual(uiAlignments.topLeft);
    expect(component.childControlWidth).toBe(true);
    expect(component.childControlHeight).toBe(true);
    expect(component.childForceExpandWidth).toBe(true);
    expect(component.childForceExpandHeight).toBe(true);
    expect(world.getComponent(entity, uiAxisLayoutGroupId)).toBe(component);
  });

  it('accepts overrides without mutating the shared alignment preset', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addHorizontalLayoutGroupComponent(world, entity, {
      spacing: 16,
      childAlignment: uiAlignments.center,
      childControlWidth: false,
    });

    component.childAlignment.x = 0.9;

    expect(component.spacing).toBe(16);
    expect(component.childControlWidth).toBe(false);
    expect(uiAlignments.center).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe('addVerticalLayoutGroupComponent', () => {
  it('sets direction to vertical', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addVerticalLayoutGroupComponent(world, entity);

    expect(component.direction).toBe('vertical');
    expect(world.getComponent(entity, uiAxisLayoutGroupId)).toBe(component);
  });

  it("doesn't share a padding object between two entities", () => {
    const world = new EcsWorld();
    const a = addVerticalLayoutGroupComponent(world, world.createEntity());
    const b = addVerticalLayoutGroupComponent(world, world.createEntity());

    a.padding.left = 42;

    expect(b.padding.left).toBe(0);
  });
});

describe('addGridLayoutGroupComponent', () => {
  it('defaults its fields', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addGridLayoutGroupComponent(world, entity);

    expect(component.padding).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
    expect(component.cellSize).toEqual({ x: 100, y: 100 });
    expect(component.spacing).toEqual({ x: 0, y: 0 });
    expect(component.childAlignment).toEqual(uiAlignments.topLeft);
    expect(component.startCorner).toBe('upperLeft');
    expect(component.startAxis).toBe('horizontal');
    expect(component.constraint).toBe('flexible');
    expect(component.constraintCount).toBe(1);
    expect(world.getComponent(entity, gridLayoutGroupId)).toBe(component);
  });

  it('accepts overrides and clones cellSize/spacing', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const cellSize = { x: 64, y: 32 };

    const component = addGridLayoutGroupComponent(world, entity, {
      cellSize,
      spacing: { x: 4, y: 8 },
      constraint: 'fixedColumnCount',
      constraintCount: 3,
    });

    component.cellSize.x = 999;

    expect(cellSize.x).toBe(64);
    expect(component.constraint).toBe('fixedColumnCount');
    expect(component.constraintCount).toBe(3);
    expect(component.spacing).toEqual({ x: 4, y: 8 });
  });
});
