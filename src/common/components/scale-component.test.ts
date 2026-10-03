import { describe, expect, it } from 'vitest';
import { addScaleComponent, scaleId } from './scale-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vec2 } from '../../math/index.js';

describe('addScaleComponent', () => {
  it('attaches a component with default local and world vectors', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addScaleComponent(world, entity);

    expect(world.getComponent(entity, scaleId)).toEqual({
      local: Vec2.one,
      world: Vec2.one,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const local = { x: 2, y: 3 };
    addScaleComponent(world, entity, { local });

    expect(world.getComponent(entity, scaleId)).toEqual({
      local,
      world: local,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const local = { x: 2, y: 3 };
    const component = addScaleComponent(world, entity, { local });

    expect(component).toEqual({ local, world: local });
    expect(world.getComponent(entity, scaleId)).toBe(component);
  });

  it('gives each entity its own local and world vector instances', () => {
    const world = new EcsWorld();
    const first = world.createEntity();
    const second = world.createEntity();

    addScaleComponent(world, first);
    addScaleComponent(world, second);

    expect(world.getComponent(first, scaleId)?.local).not.toBe(
      world.getComponent(second, scaleId)?.local,
    );
  });

  it('starts world as a copy of local, not the same vector', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addScaleComponent(world, entity, {
      local: { x: 2, y: 3 },
    });

    expect(component.world).toEqual(component.local);
    expect(component.world).not.toBe(component.local);
  });
});
