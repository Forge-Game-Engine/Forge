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

  describe('switching the active group', () => {
    let gameAxis1d: Axis1dAction;
    let gameAxis2d: Axis2dAction;
    let gameHold: HoldAction;

    const bind = <T extends { name: string; inputGroup: string }>(
      action: T,
    ): { action: T; displayText: string } => ({
      action,
      displayText: 'test binding',
    });

    beforeEach(() => {
      gameAxis1d = new Axis1dAction('axis1d', group1, actionResetTypes.noReset);
      gameAxis2d = new Axis2dAction('axis2d', group1, actionResetTypes.noReset);
      gameHold = new HoldAction('hold', group1);

      manager.addAxis1dActions(gameAxis1d);
      manager.addAxis2dActions(gameAxis2d);
      manager.addHoldActions(gameHold);

      manager.setActiveGroup(group1);
    });

    it("releases the outgoing group's axes and holds", () => {
      const holdEndListener = vi.fn();

      gameHold.holdEndEvent.registerListener(holdEndListener);

      manager.dispatchAxis1dAction(bind(gameAxis1d), 1);
      manager.dispatchAxis2dAction(bind(gameAxis2d), -1, 1);
      manager.dispatchHoldStartAction(bind(gameHold));

      manager.setActiveGroup(group2);

      expect(gameAxis1d.value).toBe(0);
      expect(gameAxis2d.value.x).toBe(0);
      expect(gameAxis2d.value.y).toBe(0);
      expect(gameHold.isHeld).toBe(false);
      expect(holdEndListener).toHaveBeenCalledTimes(1);
    });

    it('restores input that is still held when the group becomes active again', () => {
      manager.dispatchAxis1dAction(bind(gameAxis1d), 1);
      manager.dispatchAxis2dAction(bind(gameAxis2d), -1, 1);
      manager.dispatchHoldStartAction(bind(gameHold));

      manager.setActiveGroup(group2);
      manager.setActiveGroup(group1);

      expect(gameAxis1d.value).toBe(1);
      expect(gameAxis2d.value.x).toBe(-1);
      expect(gameAxis2d.value.y).toBe(1);
      expect(gameHold.isHeld).toBe(true);
    });

    it('applies the latest value dispatched while the group was inactive once it becomes active', () => {
      manager.dispatchAxis1dAction(bind(gameAxis1d), 1);
      manager.dispatchAxis2dAction(bind(gameAxis2d), 1, 1);

      manager.setActiveGroup(group2);

      manager.dispatchAxis1dAction(bind(gameAxis1d), -0.5);
      manager.dispatchAxis1dAction(bind(gameAxis1d), 0);
      manager.dispatchAxis2dAction(bind(gameAxis2d), 0, -1);

      expect(gameAxis1d.value).toBe(0);
      expect(gameAxis2d.value.y).toBe(0);

      manager.setActiveGroup(group1);

      expect(gameAxis1d.value).toBe(0);
      expect(gameAxis2d.value.x).toBe(0);
      expect(gameAxis2d.value.y).toBe(-1);
    });

    it('starts a hold pressed while its group was inactive once the group becomes active', () => {
      const menuHold = new HoldAction('menuHold', group2);

      manager.addHoldActions(menuHold);
      manager.dispatchHoldStartAction(bind(menuHold));

      expect(menuHold.isHeld).toBe(false);

      manager.setActiveGroup(group2);

      expect(menuHold.isHeld).toBe(true);
    });

    it('does not start a hold that was released before its group became active', () => {
      manager.dispatchHoldStartAction(bind(gameHold));
      manager.setActiveGroup(group2);
      manager.dispatchHoldEndAction(bind(gameHold));

      const holdStartListener = vi.fn();

      gameHold.holdStartEvent.registerListener(holdStartListener);
      manager.setActiveGroup(group1);

      expect(gameHold.isHeld).toBe(false);
      expect(holdStartListener).not.toHaveBeenCalled();
    });

    it('does not raise holdEndEvent for a hold that never started', () => {
      const holdEndListener = vi.fn();

      gameHold.holdEndEvent.registerListener(holdEndListener);

      manager.setActiveGroup(group2);
      manager.dispatchHoldStartAction(bind(gameHold));
      manager.dispatchHoldEndAction(bind(gameHold));

      expect(holdEndListener).not.toHaveBeenCalled();
    });

    it('discards values dispatched to a zero-reset axis while its group is inactive', () => {
      const scroll = new Axis1dAction('scroll', group2);

      manager.addAxis1dActions(scroll);
      manager.dispatchAxis1dAction(bind(scroll), 1);
      manager.setActiveGroup(group2);

      expect(scroll.value).toBe(0);
    });

    it('does nothing when the group is already active', () => {
      manager.dispatchAxis1dAction(bind(gameAxis1d), 1);
      manager.dispatchHoldStartAction(bind(gameHold));

      manager.setActiveGroup(group1);

      expect(gameAxis1d.value).toBe(1);
      expect(gameHold.isHeld).toBe(true);
    });

    it('releases the outgoing group when no group becomes active, and restores it afterwards', () => {
      manager.dispatchAxis1dAction(bind(gameAxis1d), 1);

      manager.setActiveGroup(null);
      expect(gameAxis1d.value).toBe(0);

      manager.setActiveGroup(group1);
      expect(gameAxis1d.value).toBe(1);
    });

    it('forgets the held state of a removed action', () => {
      manager.dispatchAxis1dAction(bind(gameAxis1d), 1);
      manager.dispatchAxis2dAction(bind(gameAxis2d), 1, 1);
      manager.dispatchHoldStartAction(bind(gameHold));

      manager.setActiveGroup(group2);

      manager.removeAxis1dAction(gameAxis1d);
      manager.removeAxis2dAction(gameAxis2d);
      manager.removeHoldAction(gameHold);

      manager.setActiveGroup(group1);

      expect(gameAxis1d.value).toBe(0);
      expect(gameAxis2d.value.x).toBe(0);
      expect(gameHold.isHeld).toBe(false);
    });
  });
});
