import { describe, expect, it } from 'vitest';
import { addTimerComponent, TimerId } from './timer-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addTimerComponent', () => {
  it('attaches a component with an empty tasks array by default', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addTimerComponent(world, entity);

    expect(world.getComponent(entity, TimerId)).toEqual({ tasks: [] });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const tasks = [{ callback: (): void => undefined, delay: 100, elapsed: 0 }];

    addTimerComponent(world, entity, { tasks });

    expect(world.getComponent(entity, TimerId)).toEqual({ tasks });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addTimerComponent(world, entity);

    expect(world.getComponent(entity, TimerId)).toBe(component);
  });

  it('gives each entity its own tasks array instance', () => {
    const world = new EcsWorld();
    const first = world.createEntity();
    const second = world.createEntity();

    addTimerComponent(world, first);
    addTimerComponent(world, second);

    expect(world.getComponent(first, TimerId)?.tasks).not.toBe(
      world.getComponent(second, TimerId)?.tasks,
    );
  });
});
