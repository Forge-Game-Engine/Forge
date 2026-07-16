import { describe, expect, it } from 'vitest';
import { addFlipComponent, flipId } from './flip-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addFlipComponent', () => {
  it('attaches a component with default flipX and flipY', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addFlipComponent(world, entity);

    expect(world.getComponent(entity, flipId)).toEqual({
      flipX: false,
      flipY: false,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addFlipComponent(world, entity, { flipX: true });

    expect(world.getComponent(entity, flipId)).toEqual({
      flipX: true,
      flipY: false,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addFlipComponent(world, entity, {
      flipX: true,
      flipY: true,
    });

    expect(component).toEqual({ flipX: true, flipY: true });
    expect(world.getComponent(entity, flipId)).toBe(component);
  });
});
