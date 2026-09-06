import { describe, expect, it } from 'vitest';
import {
  addRectTransformComponent,
  rectTransformId,
} from './rect-transform-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Rects } from '../../math/index.js';
import { UiAnchor } from '../types/ui-anchor.js';
import { UiAxis } from '../types/ui-axis.js';

describe('addRectTransformComponent', () => {
  it('attaches a component with default values for unspecified options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addRectTransformComponent(world, entity);

    expect(world.getComponent(entity, rectTransformId)).toEqual({
      x: { kind: 'point', anchor: 0.5, pivot: 0.5, size: 100 },
      y: { kind: 'point', anchor: 0.5, pivot: 0.5, size: 100 },
      anchoredPosition: { x: 0, y: 0 },
      rect: Rects.zero,
      sortDepth: 0,
    });
    expect(world.getComponent(entity, rectTransformId)).toBe(component);
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addRectTransformComponent(world, entity, {
      x: UiAxis.point(0.5, { size: 240 }),
      y: UiAxis.point(0.5, { size: 64 }),
      anchoredPosition: { x: 10, y: -10 },
    });

    expect(component.x).toEqual({
      kind: 'point',
      anchor: 0.5,
      pivot: 0.5,
      size: 240,
    });
    expect(component.y).toEqual({
      kind: 'point',
      anchor: 0.5,
      pivot: 0.5,
      size: 64,
    });
    expect(component.anchoredPosition).toEqual({ x: 10, y: -10 });
  });

  it('clones axis options rather than aliasing them', () => {
    const world = new EcsWorld();
    const entityA = world.createEntity();
    const entityB = world.createEntity();

    const topLeft = UiAnchor.topLeft();
    const componentA = addRectTransformComponent(world, entityA, topLeft);
    const componentB = addRectTransformComponent(world, entityB, topLeft);

    (componentA.x as { anchor: number }).anchor = 0.9;

    expect((componentB.x as { anchor: number }).anchor).toBe(0);
    expect((topLeft.x as { anchor: number }).anchor).toBe(0);
  });
});
