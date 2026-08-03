import { describe, expect, it } from 'vitest';
import { addScaleComponent, scaleId } from './scale-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { createVector2, vector2One } from '../../math/index.js';

describe('addScaleComponent', () => {
  it('attaches a component with default local and world vectors', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addScaleComponent(world, entity);

    expect(world.getComponent(entity, scaleId)).toEqual({
      local: vector2One(),
      world: vector2One(),
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const local = createVector2(2, 3);
    addScaleComponent(world, entity, { local });

    expect(world.getComponent(entity, scaleId)).toEqual({
      local,
      world: vector2One(),
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const local = createVector2(2, 3);
    const component = addScaleComponent(world, entity, { local });

    expect(component).toEqual({ local, world: vector2One() });
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
});
