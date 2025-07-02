import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InputSystem } from './input-system';
import { InputsComponent } from '../components';
import type { Entity } from '../../ecs';

describe('InputSystem', () => {
  let inputSystem: InputSystem;
  let mockEntity: Entity;
  let mockInputsComponent: InputsComponent;
  let mockAction1: { reset: () => void };
  let mockAction2: { reset: () => void };

  beforeEach(() => {
    inputSystem = new InputSystem();

    mockAction1 = { reset: vi.fn() };
    mockAction2 = { reset: vi.fn() };

    mockInputsComponent = {
      inputActions: new Map([
        ['jump', mockAction1],
        ['run', mockAction2],
      ]),
    } as unknown as InputsComponent;

    mockEntity = {
      getComponentRequired: vi.fn().mockImplementation((symbol) => {
        if (symbol === InputsComponent.symbol) {
          return mockInputsComponent;
        }

        throw new Error('Component not found');
      }),
    } as unknown as Entity;
  });

  it('should call reset on all input actions', () => {
    inputSystem.run(mockEntity);

    expect(mockAction1.reset).toHaveBeenCalledTimes(1);
    expect(mockAction2.reset).toHaveBeenCalledTimes(1);
  });

  it('should get InputsComponent using the correct symbol', () => {
    inputSystem.run(mockEntity);

    expect(mockEntity.getComponentRequired).toHaveBeenCalledWith(
      InputsComponent.symbol,
    );
  });
});
