import { beforeEach, describe, expect, it } from 'vitest';
import { EcsWorld } from '../ecs/index.js';
import { addDrawOrderComponent } from './components/draw-order-component.js';
import { createDrawOrderResolver } from './draw-order.js';

describe('createDrawOrderResolver', () => {
  let world: EcsWorld;
  let parent: number;
  let a: number;
  let b: number;
  let c: number;

  const resolveHierarchyOrder = (): number[] => {
    const resolver = createDrawOrderResolver();
    const entities = [parent, a, b, c];

    resolver.resolve(world, entities);

    return [...entities].sort(
      (left, right) =>
        resolver.hierarchyIndex(left) - resolver.hierarchyIndex(right),
    );
  };

  beforeEach(() => {
    world = new EcsWorld();
    parent = world.createEntity();
    [a, b, c] = [
      world.createEntity(),
      world.createEntity(),
      world.createEntity(),
    ];

    world.setParent(a, parent);
    world.setParent(b, parent);
    world.setParent(c, parent);
  });

  it('numbers siblings in the order they were parented', () => {
    expect(resolveHierarchyOrder()).toEqual([parent, a, b, c]);
  });

  it('numbers a child moved with setSiblingIndex at its new place', () => {
    world.setSiblingIndex(c, 1);

    expect(resolveHierarchyOrder()).toEqual([parent, a, c, b]);

    world.setSiblingIndex(c, 0);

    expect(resolveHierarchyOrder()).toEqual([parent, c, a, b]);
  });

  it('keeps behindParent children in their new sibling order, before the parent', () => {
    addDrawOrderComponent(world, a, { behindParent: true });
    addDrawOrderComponent(world, b, { behindParent: true });

    world.setSiblingIndex(b, 0);

    expect(resolveHierarchyOrder()).toEqual([b, a, parent, c]);
  });
});
