import { describe, expect, it } from 'vitest';
import {
  addRectTransformComponent,
  rectTransformId,
} from './rect-transform-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Rects } from '../../math/index.js';
import { UiAnchor } from '../types/ui-anchor.js';

describe('addRectTransformComponent', () => {
  it('attaches a component with default values for unspecified options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addRectTransformComponent(world, entity);

    expect(world.getComponent(entity, rectTransformId)).toEqual({
      anchorMin: { x: 0.5, y: 0.5 },
      anchorMax: { x: 0.5, y: 0.5 },
      pivot: { x: 0.5, y: 0.5 },
      anchoredPosition: { x: 0, y: 0 },
      sizeDelta: { x: 100, y: 100 },
      rect: Rects.zero,
      sortDepth: 0,
    });
    expect(world.getComponent(entity, rectTransformId)).toBe(component);
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addRectTransformComponent(world, entity, {
      sizeDelta: { x: 240, y: 64 },
      anchoredPosition: { x: 10, y: -10 },
    });

    expect(component.sizeDelta).toEqual({ x: 240, y: 64 });
    expect(component.anchoredPosition).toEqual({ x: 10, y: -10 });
    expect(component.anchorMin).toEqual({ x: 0.5, y: 0.5 });
    expect(component.pivot).toEqual({ x: 0.5, y: 0.5 });
  });

  it('clones Vector2 options rather than aliasing them', () => {
    const world = new EcsWorld();
    const entityA = world.createEntity();
    const entityB = world.createEntity();

    const componentA = addRectTransformComponent(world, entityA, {
      ...UiAnchor.topLeft,
    });
    const componentB = addRectTransformComponent(world, entityB, {
      ...UiAnchor.topLeft,
    });

    componentA.anchorMin.x = 0.9;

    expect(componentB.anchorMin.x).toBe(0);
    expect(UiAnchor.topLeft.anchorMin.x).toBe(0);
  });
});
