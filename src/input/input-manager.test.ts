import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InputManager } from './input-manager';
import { Axis1dAction, Axis2dAction, TriggerAction } from './actions';
import { actionResetTypes } from './constants';

describe('InputManager', () => {
  let manager: InputManager;
  const group1 = 'group1';
  const group2 = 'group2';

  beforeEach(() => {
    manager = new InputManager();
  });

  it('should set and get activeGroup', () => {
    expect(manager.activeGroup).toBe('game'); // default is 'game'
    manager.setActiveGroup('group1');
    expect(manager.activeGroup).toBe('group1');
    manager.setActiveGroup(null);
    expect(manager.activeGroup).toBeNull();
  });

  it('should dispatch trigger action only for active group', () => {
    const action = new TriggerAction('test-action', group1);
    const binding = {
      action,
      displayText: 'test binding',
    };

    manager.setActiveGroup(group1);
    manager.dispatchTriggerAction(binding);
    expect(action.isTriggered).toBe(true);

    action.reset();

    manager.setActiveGroup(group2);
    manager.dispatchTriggerAction(binding);
    expect(action.isTriggered).toBe(false);
  });

  it('should dispatch axis1d action only for active group', () => {
    const action = new Axis1dAction(
      'test-action',
      group1,
      actionResetTypes.zero,
    );

    const binding = {
      action,
      displayText: 'test binding',
    };

    manager.setActiveGroup(group1);
    expect(action.value).toBe(0);
    manager.dispatchAxis1dAction(binding, 1);
    expect(action.value).toBe(1);

    action.reset();
    expect(action.value).toBe(0);

    manager.setActiveGroup(group2);
    manager.dispatchAxis1dAction(binding, 1);
    expect(action.value).toBe(0);
  });

  it('should dispatch axis2d action only for active group', () => {
    const action = new Axis2dAction(
      'test-action',
      group1,
      actionResetTypes.zero,
    );

    const binding = {
      action,
      displayText: 'test binding',
    };

    manager.setActiveGroup(group1);
    expect(action.value.x).toBe(0);
    expect(action.value.y).toBe(0);
    manager.dispatchAxis2dAction(binding, 1, 5);
    expect(action.value.x).toBe(1);
    expect(action.value.y).toBe(5);

    action.reset();
    expect(action.value.x).toBe(0);
    expect(action.value.y).toBe(0);

    manager.setActiveGroup(group2);
    manager.dispatchAxis2dAction(binding, 1, 5);
    expect(action.value.x).toBe(0);
    expect(action.value.y).toBe(0);
  });

  it('should add and remove updatables', () => {
    const updatable1 = { update: vi.fn() };
    const updatable2 = { update: vi.fn() };

    manager.addUpdatable(updatable1, updatable2);
    manager.update(0.5);
    expect(updatable1.update).toHaveBeenCalledWith(0.5);
    expect(updatable2.update).toHaveBeenCalledWith(0.5);

    updatable1.update.mockClear();
    updatable2.update.mockClear();

    manager.removeUpdatable(updatable1);
    manager.update(1.0);
    expect(updatable1.update).not.toHaveBeenCalled();
    expect(updatable2.update).toHaveBeenCalledWith(1.0);
  });

  it('should add and remove resettables', () => {
    const resettable1 = { reset: vi.fn() };
    const resettable2 = { reset: vi.fn() };

    manager.addResettable(resettable1, resettable2);
    manager.reset();
    expect(resettable1.reset).toHaveBeenCalled();
    expect(resettable2.reset).toHaveBeenCalled();

    resettable1.reset.mockClear();
    resettable2.reset.mockClear();

    manager.removeResettable(resettable2);
    manager.reset();
    expect(resettable1.reset).toHaveBeenCalled();
    expect(resettable2.reset).not.toHaveBeenCalled();
  });
});
