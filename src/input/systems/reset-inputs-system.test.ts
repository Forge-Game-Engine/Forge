import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createResetInputsEcsSystem } from './reset-inputs-system';
import { EcsWorld } from '../../ecs';
import { addInputsComponent } from '../components/inputs-component';
import { InputManager } from '../input-manager';

describe('createResetInputsEcsSystem', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    world.addSystem(createResetInputsEcsSystem());
  });

  it('resets the input manager', () => {
    const entity = world.createEntity();
    const inputManager = new InputManager();

    addInputsComponent(world, entity, { inputManager });

    const resettable = { reset: vi.fn() };

    inputManager.addResettable(resettable);

    world.update();

    expect(resettable.reset).toHaveBeenCalledTimes(1);
  });

  it('resets every inputs component independently', () => {
    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const inputManager1 = new InputManager();
    const inputManager2 = new InputManager();

    addInputsComponent(world, entity1, { inputManager: inputManager1 });
    addInputsComponent(world, entity2, { inputManager: inputManager2 });

    const resettable1 = { reset: vi.fn() };
    const resettable2 = { reset: vi.fn() };

    inputManager1.addResettable(resettable1);
    inputManager2.addResettable(resettable2);

    world.update();

    expect(resettable1.reset).toHaveBeenCalledTimes(1);
    expect(resettable2.reset).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no entity has an inputs component', () => {
    expect(() => world.update()).not.toThrow();
  });
});
