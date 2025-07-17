import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InputSystem } from './input-system';
import { InputsComponent } from '../components';
import type { Entity } from '../../ecs';
import { TriggerAction } from '../actions';

describe('InputSystem', () => {
  let inputSystem: InputSystem;
  let mockEntity: Entity;
  let mockAction1: TriggerAction;
  let mockAction2: TriggerAction;

  beforeEach(() => {
    inputSystem = new InputSystem();

    mockAction1 = new TriggerAction('action1');
    mockAction2 = new TriggerAction('action2');

    const inputComponent = new InputsComponent();

    inputComponent.inputActions.set('action1', mockAction1);
    inputComponent.inputActions.set('action2', mockAction2);

    mockEntity = {
      getComponentRequired: vi.fn().mockImplementation((symbol) => {
        if (symbol === InputsComponent.symbol) {
          return inputComponent;
        }

        throw new Error('Component not found');
      }),
    } as unknown as Entity;
  });

  it('should call reset on all input actions', () => {
    mockAction1.trigger();
    mockAction2.trigger();

    expect(mockAction1.lastBindingTriggered).toBe(true);
    expect(mockAction2.lastBindingTriggered).toBe(true);

    inputSystem.run(mockEntity);

    expect(mockAction1.lastBindingTriggered).toBe(false);
    expect(mockAction2.lastBindingTriggered).toBe(false);
  });
});
