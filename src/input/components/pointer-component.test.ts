import { describe, expect, it } from 'vitest';
import { addPointerComponent, pointerId } from './pointer-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addPointerComponent', () => {
  it('attaches a zeroed-out component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addPointerComponent(world, entity);

    expect(world.getComponent(entity, pointerId)).toEqual({
      position: { x: 0, y: 0 },
      delta: { x: 0, y: 0 },
      scroll: 0,
      buttonsDown: new Set(),
      buttonsHeld: new Set(),
      buttonsUp: new Set(),
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addPointerComponent(world, entity);

    expect(world.getComponent(entity, pointerId)).toBe(component);
  });

  it('gives each entity its own position and delta vector instances', () => {
    const world = new EcsWorld();
    const first = world.createEntity();
    const second = world.createEntity();

    addPointerComponent(world, first);
    addPointerComponent(world, second);

    expect(world.getComponent(first, pointerId)?.position).not.toBe(
      world.getComponent(second, pointerId)?.position,
    );
    expect(world.getComponent(first, pointerId)?.delta).not.toBe(
      world.getComponent(second, pointerId)?.delta,
    );
  });
});
