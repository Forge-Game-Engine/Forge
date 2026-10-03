import { describe, expect, it } from 'vitest';
import { addPositionComponent, positionId } from './position-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vec2 } from '../../math/index.js';

describe('addPositionComponent', () => {
  it('attaches a component with default local and world vectors', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addPositionComponent(world, entity);

    expect(world.getComponent(entity, positionId)).toEqual({
      local: Vec2.zero,
      world: Vec2.zero,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addPositionComponent(world, entity, { isStatic: true });

    expect(world.getComponent(entity, positionId)).toEqual({
      local: Vec2.zero,
      world: Vec2.zero,
      isStatic: true,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const local = { x: 1, y: 2 };
    const component = addPositionComponent(world, entity, { local });

    expect(component).toEqual({ local, world: local });
    expect(world.getComponent(entity, positionId)).toBe(component);
  });

  it('gives each entity its own local and world vector instances', () => {
    const world = new EcsWorld();
    const first = world.createEntity();
    const second = world.createEntity();

    addPositionComponent(world, first);
    addPositionComponent(world, second);

    expect(world.getComponent(first, positionId)?.local).not.toBe(
      world.getComponent(second, positionId)?.local,
    );
  });

  it('starts world as a copy of local, not the same vector', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addPositionComponent(world, entity, {
      local: { x: 2, y: 3 },
    });

    expect(component.world).toEqual(component.local);
    expect(component.world).not.toBe(component.local);
  });
});
