import { describe, expect, it } from 'vitest';
import { addInputsComponent, inputsId } from './inputs-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { InputManager } from '../input-manager.js';

describe('addInputsComponent', () => {
  it('attaches a component with the given input manager', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const inputManager = new InputManager();

    addInputsComponent(world, entity, { inputManager });

    expect(world.getComponent(entity, inputsId)).toEqual({ inputManager });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const inputManager = new InputManager();

    const component = addInputsComponent(world, entity, { inputManager });

    expect(world.getComponent(entity, inputsId)).toBe(component);
  });
});
