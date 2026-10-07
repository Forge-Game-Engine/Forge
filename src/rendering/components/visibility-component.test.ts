import { describe, expect, it } from 'vitest';
import {
  addVisibilityComponent,
  isVisibleInHierarchy,
  visibilityId,
} from './visibility-component';
import { EcsWorld } from '../../ecs';
import { createDrawOrderResolver } from '../draw-order';

describe('addVisibilityComponent', () => {
  it('defaults visible to true', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    expect(addVisibilityComponent(world, entity).visible).toBe(true);
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    expect(
      addVisibilityComponent(world, entity, { visible: false }).visible,
    ).toBe(false);
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addVisibilityComponent(world, entity);

    expect(world.getComponent(entity, visibilityId)).toBe(component);
  });
});

describe('isVisibleInHierarchy', () => {
  /** A four-level chain, root to leaf, with no visibility components. */
  const createChain = (world: EcsWorld): number[] => {
    const chain = [world.createEntity()];

    for (let i = 1; i < 4; i++) {
      const entity = world.createEntity();

      world.setParent(entity, chain[i - 1]);
      chain.push(entity);
    }

    return chain;
  };

  it('is true for an entity without the component and no hidden ancestor', () => {
    const world = new EcsWorld();
    const chain = createChain(world);

    expect(isVisibleInHierarchy(world, chain[3])).toBe(true);
  });

  it('is false for an entity hidden by its own component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addVisibilityComponent(world, entity, { visible: false });

    expect(isVisibleInHierarchy(world, entity)).toBe(false);
  });

  it('is false for every descendant of a hidden ancestor, several levels down', () => {
    const world = new EcsWorld();
    const chain = createChain(world);

    addVisibilityComponent(world, chain[1], { visible: false });

    expect(isVisibleInHierarchy(world, chain[0])).toBe(true);
    expect(isVisibleInHierarchy(world, chain[1])).toBe(false);
    expect(isVisibleInHierarchy(world, chain[2])).toBe(false);
    expect(isVisibleInHierarchy(world, chain[3])).toBe(false);
  });

  it("can't be overridden by a visible descendant", () => {
    const world = new EcsWorld();
    const chain = createChain(world);

    addVisibilityComponent(world, chain[0], { visible: false });
    addVisibilityComponent(world, chain[3], { visible: true });

    expect(isVisibleInHierarchy(world, chain[3])).toBe(false);
  });

  it('follows a change to visible on the next call', () => {
    const world = new EcsWorld();
    const chain = createChain(world);
    const visibility = addVisibilityComponent(world, chain[0], {
      visible: false,
    });

    visibility.visible = true;

    expect(isVisibleInHierarchy(world, chain[3])).toBe(true);
  });

  it("agrees with the draw order resolver's isVisible over a branching tree", () => {
    const world = new EcsWorld();
    const entities: number[] = [];

    // A tree where every third entity is hidden and parents are spread
    // over earlier entities, so hidden and visible branches interleave.
    for (let i = 0; i < 30; i++) {
      const entity = world.createEntity();

      if (i > 0 && i % 5 !== 0) {
        world.setParent(entity, entities[Math.floor(i / 2)]);
      }

      if (i % 3 === 2) {
        addVisibilityComponent(world, entity, { visible: i % 2 === 0 });
      }

      entities.push(entity);
    }

    const resolver = createDrawOrderResolver();

    resolver.resolve(world, entities);

    for (const entity of entities) {
      expect(resolver.isVisible(entity)).toBe(
        isVisibleInHierarchy(world, entity),
      );
    }

    expect(entities.some((entity) => !resolver.isVisible(entity))).toBe(true);
  });
});
