import { describe, expect, it } from 'vitest';
import {
  addCanvasGroupComponent,
  canvasGroupId,
} from './canvas-group-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addCanvasGroupComponent', () => {
  it('defaults alpha, interactable, blocksRaycasts, and ignoreParentGroups', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addCanvasGroupComponent(world, entity);

    expect(component.alpha).toBe(1);
    expect(component.interactable).toBe(true);
    expect(component.blocksRaycasts).toBe(true);
    expect(component.ignoreParentGroups).toBe(false);
    expect(world.getComponent(entity, canvasGroupId)).toBe(component);
  });

  it('accepts overrides', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addCanvasGroupComponent(world, entity, {
      alpha: 0.5,
      interactable: false,
      blocksRaycasts: false,
      ignoreParentGroups: true,
    });

    expect(component.alpha).toBe(0.5);
    expect(component.interactable).toBe(false);
    expect(component.blocksRaycasts).toBe(false);
    expect(component.ignoreParentGroups).toBe(true);
  });
});
