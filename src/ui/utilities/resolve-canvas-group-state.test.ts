import { describe, expect, it } from 'vitest';
import { resolveCanvasGroupState } from './resolve-canvas-group-state.js';
import { addParentComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { addCanvasGroupComponent } from '../components/canvas-group-component.js';

describe('resolveCanvasGroupState', () => {
  it('returns the identity state when no ancestor has a CanvasGroupEcsComponent', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    expect(resolveCanvasGroupState(world, entity)).toEqual({
      alpha: 1,
      interactable: true,
      blocksRaycasts: true,
    });
  });

  it("combines the entity's own CanvasGroupEcsComponent", () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addCanvasGroupComponent(world, entity, {
      alpha: 0.5,
      interactable: false,
      blocksRaycasts: false,
    });

    expect(resolveCanvasGroupState(world, entity)).toEqual({
      alpha: 0.5,
      interactable: false,
      blocksRaycasts: false,
    });
  });

  it('multiplies alpha and ANDs interactable/blocksRaycasts up the parent chain', () => {
    const world = new EcsWorld();
    const grandparent = world.createEntity();
    const parent = world.createEntity();
    const child = world.createEntity();

    addCanvasGroupComponent(world, grandparent, {
      alpha: 0.5,
      interactable: true,
      blocksRaycasts: true,
    });
    addCanvasGroupComponent(world, parent, {
      alpha: 0.5,
      interactable: false,
      blocksRaycasts: true,
    });
    addParentComponent(world, parent, { parent: grandparent });
    addParentComponent(world, child, { parent });

    const state = resolveCanvasGroupState(world, child);

    expect(state.alpha).toBeCloseTo(0.25);
    expect(state.interactable).toBe(false);
    expect(state.blocksRaycasts).toBe(true);
  });

  it('stops combining further ancestors once a group sets ignoreParentGroups', () => {
    const world = new EcsWorld();
    const grandparent = world.createEntity();
    const parent = world.createEntity();
    const child = world.createEntity();

    addCanvasGroupComponent(world, grandparent, { alpha: 0.2 });
    addCanvasGroupComponent(world, parent, {
      alpha: 0.5,
      ignoreParentGroups: true,
    });
    addParentComponent(world, parent, { parent: grandparent });
    addParentComponent(world, child, { parent });

    expect(resolveCanvasGroupState(world, child).alpha).toBeCloseTo(0.5);
  });
});
