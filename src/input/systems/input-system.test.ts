import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InputSystem } from './input-system';
import { InputsComponent } from '../components';
import { Entity, World } from '../../ecs';
import { InputManager } from '../input-manager';

describe('InputSystem', () => {
  let inputSystem: InputSystem;
  let inputManager: InputManager;
  let world: World;
  let mockEntity: Entity;

  beforeEach(() => {
    inputSystem = new InputSystem();
    inputManager = { reset: vi.fn() } as unknown as InputManager;
    world = new World('test');

    mockEntity = new Entity('test', world, [new InputsComponent(inputManager)]);
  });

  it('should call reset on all input actions', () => {
    inputSystem.run(mockEntity);
    expect(inputManager.reset).toHaveBeenCalled();
  });
});
