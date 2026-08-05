import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createUpdateInputEcsSystem } from './update-inputs-system';
import { EcsWorld } from '../../ecs';
import { Time } from '../../common';
import { addInputsComponent } from '../components/inputs-component';
import { InputManager } from '../input-manager';

describe('createUpdateInputEcsSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    world.addSystem(createUpdateInputEcsSystem(time));
  });

  it('updates the input manager with the elapsed delta time', () => {
    const entity = world.createEntity();
    const inputManager = new InputManager();

    addInputsComponent(world, entity, { inputManager });

    const updatable = { update: vi.fn() };

    inputManager.addUpdatable(updatable);

    time.update(100);
    time.update(150);
    world.update();

    expect(updatable.update).toHaveBeenCalledWith(time.deltaTimeInMilliseconds);
  });

  it('updates every inputs component independently', () => {
    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const inputManager1 = new InputManager();
    const inputManager2 = new InputManager();

    addInputsComponent(world, entity1, { inputManager: inputManager1 });
    addInputsComponent(world, entity2, { inputManager: inputManager2 });

    const updatable1 = { update: vi.fn() };
    const updatable2 = { update: vi.fn() };

    inputManager1.addUpdatable(updatable1);
    inputManager2.addUpdatable(updatable2);

    time.update(100);
    world.update();

    expect(updatable1.update).toHaveBeenCalledTimes(1);
    expect(updatable2.update).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no entity has an inputs component', () => {
    expect(() => {
      time.update(100);
      world.update();
    }).not.toThrow();
  });
});
