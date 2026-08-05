import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InputManager } from './input-manager';
import {
  Axis1dAction,
  Axis2dAction,
  HoldAction,
  TriggerAction,
} from './actions';
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

  it('should dispatch hold start action only for active group', () => {
    const action = new HoldAction('test-hold-action', group1);
    const binding = {
      action,
      displayText: 'test binding',
    };

    manager.setActiveGroup(group2);
    manager.dispatchHoldStartAction(binding);
    expect(action.isHeld).toBe(false);

    manager.setActiveGroup(group1);
    manager.dispatchHoldStartAction(binding);
    expect(action.isHeld).toBe(true);
  });

  it('should dispatch hold end action regardless of active group', () => {
    const action = new HoldAction('test-hold-action', group1);
    const binding = {
      action,
      displayText: 'test binding',
    };

    manager.setActiveGroup(group1);
    manager.dispatchHoldStartAction(binding);
    expect(action.isHeld).toBe(true);

    manager.setActiveGroup(group2);
    manager.dispatchHoldEndAction(binding);
    expect(action.isHeld).toBe(false);
  });

  it('should add trigger, axis1d, axis2d, and hold actions and mark them resettable', () => {
    const triggerAction = new TriggerAction('trigger', group1);
    const axis1dAction = new Axis1dAction('axis1d', group1);
    const axis2dAction = new Axis2dAction('axis2d', group1);
    const holdAction = new HoldAction('hold', group1);

    manager.addTriggerActions(triggerAction);
    manager.addAxis1dActions(axis1dAction);
    manager.addAxis2dActions(axis2dAction);
    manager.addHoldActions(holdAction);

    expect(manager.getTriggerAction('trigger')).toBe(triggerAction);
    expect(manager.getAxis1dAction('axis1d')).toBe(axis1dAction);
    expect(manager.getAxis2dAction('axis2d')).toBe(axis2dAction);
    expect(manager.getHoldAction('hold')).toBe(holdAction);

    triggerAction.trigger();
    axis1dAction.set(1);
    axis2dAction.set(1, 1);

    manager.reset();

    expect(triggerAction.isTriggered).toBe(false);
    expect(axis1dAction.value).toBe(0);
    expect(axis2dAction.value.x).toBe(0);
    expect(axis2dAction.value.y).toBe(0);
  });

  it('should remove trigger, axis1d, axis2d, and hold actions', () => {
    const triggerAction = new TriggerAction('trigger', group1);
    const axis1dAction = new Axis1dAction('axis1d', group1);
    const axis2dAction = new Axis2dAction('axis2d', group1);
    const holdAction = new HoldAction('hold', group1);

    manager.addTriggerActions(triggerAction);
    manager.addAxis1dActions(axis1dAction);
    manager.addAxis2dActions(axis2dAction);
    manager.addHoldActions(holdAction);

    manager.removeTriggerAction(triggerAction);
    manager.removeAxis1dAction(axis1dAction);
    manager.removeAxis2dAction(axis2dAction);
    manager.removeHoldAction(holdAction);

    expect(() => manager.getTriggerAction('trigger')).toThrow(
      'No TriggerAction found with name: trigger',
    );
    expect(() => manager.getAxis1dAction('axis1d')).toThrow(
      'No Axis1dAction found with name: axis1d',
    );
    expect(() => manager.getAxis2dAction('axis2d')).toThrow(
      'No Axis2dAction found with name: axis2d',
    );
    expect(() => manager.getHoldAction('hold')).toThrow(
      'No HoldAction found with name: hold',
    );
  });

  it('should throw when getting an action that was never added', () => {
    expect(() => manager.getTriggerAction('missing')).toThrow(
      'No TriggerAction found with name: missing',
    );
    expect(() => manager.getAxis1dAction('missing')).toThrow(
      'No Axis1dAction found with name: missing',
    );
    expect(() => manager.getAxis2dAction('missing')).toThrow(
      'No Axis2dAction found with name: missing',
    );
    expect(() => manager.getHoldAction('missing')).toThrow(
      'No HoldAction found with name: missing',
    );
  });

  it('should throw when getting an action that does not match any other registered action', () => {
    manager.addTriggerActions(new TriggerAction('trigger', group1));
    manager.addAxis1dActions(new Axis1dAction('axis1d', group1));
    manager.addAxis2dActions(new Axis2dAction('axis2d', group1));
    manager.addHoldActions(new HoldAction('hold', group1));

    expect(() => manager.getTriggerAction('missing')).toThrow(
      'No TriggerAction found with name: missing',
    );
    expect(() => manager.getAxis1dAction('missing')).toThrow(
      'No Axis1dAction found with name: missing',
    );
    expect(() => manager.getAxis2dAction('missing')).toThrow(
      'No Axis2dAction found with name: missing',
    );
    expect(() => manager.getHoldAction('missing')).toThrow(
      'No HoldAction found with name: missing',
    );
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
