import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { InputManager } from './input-manager';
import {
  Axis1dAction,
  Axis2dAction,
  HoldAction,
  TriggerAction,
} from './actions';
import { ButtonMoment, buttonMoments } from './constants';
import { InputSource } from './input-source';
import { TriggerInputBinding } from './trigger-input-binding';

const createTriggerBinding = (
  action: TriggerAction,
  moment: ButtonMoment = buttonMoments.down,
): TriggerInputBinding => ({ action, moment, displayText: 'test binding' });

describe('InputManager', () => {
  let manager: InputManager;
  const group1 = 'group1';
  const group2 = 'group2';
  const keyboard: InputSource = { name: 'keyboard' };
  const gamepad: InputSource = { name: 'gamepad' };

  beforeEach(() => {
    manager = new InputManager(group1);
  });

  it('should default the active group to "game", and set it', () => {
    const defaultManager = new InputManager();

    expect(defaultManager.activeGroup).toBe('game');
    defaultManager.setActiveGroup(group2);
    expect(defaultManager.activeGroup).toBe(group2);
    defaultManager.setActiveGroup(null);
    expect(defaultManager.activeGroup).toBeNull();
  });

  it('should get added actions by name', () => {
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

  it('should release an action when it is removed', () => {
    const axis1dAction = new Axis1dAction('axis1d', group1);
    const holdAction = new HoldAction('hold', group1);

    manager.addAxis1dActions(axis1dAction);
    manager.addHoldActions(holdAction);
    manager.setAxis1dInput(keyboard, axis1dAction, 1);
    manager.setHoldInput(keyboard, holdAction, true);

    manager.removeAxis1dAction(axis1dAction);
    manager.removeHoldAction(holdAction);

    expect(axis1dAction.value).toBe(0);
    expect(holdAction.isHeld).toBe(false);
  });

  it('should throw when input is reported for an action that was never added', () => {
    expect(() =>
      manager.setAxis1dInput(keyboard, new Axis1dAction('axis1d', group1), 1),
    ).toThrow(
      'Unable to set input for Axis1dAction "axis1d", it hasn\'t been added to the InputManager.',
    );
    expect(() =>
      manager.setAxis2dInput(keyboard, new Axis2dAction('axis2d'), 1, 1),
    ).toThrow('Axis2dAction "axis2d"');
    expect(() =>
      manager.setHoldInput(keyboard, new HoldAction('hold'), true),
    ).toThrow('HoldAction "hold"');
    expect(() =>
      manager.setTriggerInput(
        keyboard,
        createTriggerBinding(new TriggerAction('trigger')),
        true,
      ),
    ).toThrow('TriggerAction "trigger"');
  });

  describe('axes', () => {
    let axis1d: Axis1dAction;
    let axis2d: Axis2dAction;

    beforeEach(() => {
      axis1d = new Axis1dAction('axis1d', group1);
      axis2d = new Axis2dAction('axis2d', group1);
      manager.addAxis1dActions(axis1d);
      manager.addAxis2dActions(axis2d);
    });

    it('keeps a reported value across frames until the source reports another', () => {
      manager.setAxis1dInput(keyboard, axis1d, 1);
      manager.setAxis2dInput(keyboard, axis2d, 0, 1);

      manager.reset();
      manager.reset();

      expect(axis1d.value).toBe(1);
      expect(axis2d.value).toEqual({ x: 0, y: 1 });

      manager.setAxis1dInput(keyboard, axis1d, 0);
      expect(axis1d.value).toBe(0);
    });

    it('reads the input with the largest magnitude between sources', () => {
      manager.setAxis1dInput(keyboard, axis1d, 0.5);
      manager.setAxis1dInput(gamepad, axis1d, -0.8);
      expect(axis1d.value).toBeCloseTo(-0.8);

      manager.setAxis2dInput(keyboard, axis2d, 1, 1);
      manager.setAxis2dInput(gamepad, axis2d, 0.9, 0);
      expect(axis2d.value).toEqual({ x: 1, y: 1 });
    });

    it('keeps the current source on a tie', () => {
      manager.setAxis1dInput(keyboard, axis1d, 1);
      manager.setAxis1dInput(gamepad, axis1d, -1);
      expect(axis1d.value).toBe(1);

      manager.setAxis1dInput(keyboard, axis1d, 1);
      expect(axis1d.value).toBe(1);
    });

    it("keeps one source's input when another is released", () => {
      manager.setAxis1dInput(keyboard, axis1d, 1);
      manager.setAxis1dInput(gamepad, axis1d, 0.6);
      manager.setAxis1dInput(gamepad, axis1d, 0);
      expect(axis1d.value).toBe(1);

      manager.setAxis1dInput(gamepad, axis1d, -1);
      manager.setAxis1dInput(keyboard, axis1d, 0);
      expect(axis1d.value).toBe(-1);
    });

    it('does not let an idle source that reports every frame override another', () => {
      manager.setAxis1dInput(keyboard, axis1d, 1);

      for (let frame = 0; frame < 3; frame++) {
        manager.setAxis1dInput(gamepad, axis1d, 0);
        manager.reset();
      }

      expect(axis1d.value).toBe(1);
    });

    it('raises valueChangeEvent only when the derived value changes', () => {
      const listener = vi.fn();

      axis1d.valueChangeEvent.registerListener(listener);

      manager.setAxis1dInput(keyboard, axis1d, 1);
      manager.setAxis1dInput(keyboard, axis1d, 1);
      manager.setAxis1dInput(gamepad, axis1d, 0.5);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('releases what a source reported when its input is removed', () => {
      manager.setAxis1dInput(keyboard, axis1d, 0.5);
      manager.setAxis1dInput(gamepad, axis1d, 1);
      manager.setAxis2dInput(gamepad, axis2d, 1, 0);

      manager.removeSourceInput(gamepad);

      expect(axis1d.value).toBe(0.5);
      expect(axis2d.value).toEqual({ x: 0, y: 0 });
    });
  });

  describe('holds', () => {
    let hold: HoldAction;
    let startListener: Mock<() => void>;
    let endListener: Mock<() => void>;

    beforeEach(() => {
      hold = new HoldAction('hold', group1);
      manager.addHoldActions(hold);
      startListener = vi.fn();
      endListener = vi.fn();
      hold.holdStartEvent.registerListener(startListener);
      hold.holdEndEvent.registerListener(endListener);
    });

    it('is held from a press until its release', () => {
      manager.setHoldInput(keyboard, hold, true);
      manager.reset();
      expect(hold.isHeld).toBe(true);

      manager.setHoldInput(keyboard, hold, false);
      expect(hold.isHeld).toBe(false);
      expect(startListener).toHaveBeenCalledTimes(1);
      expect(endListener).toHaveBeenCalledTimes(1);
    });

    it('stays held while any source holds it, starting once', () => {
      manager.setHoldInput(keyboard, hold, true);
      manager.setHoldInput(gamepad, hold, true);
      manager.setHoldInput(keyboard, hold, false);

      expect(hold.isHeld).toBe(true);
      expect(startListener).toHaveBeenCalledTimes(1);
      expect(endListener).not.toHaveBeenCalled();

      manager.setHoldInput(gamepad, hold, false);
      expect(hold.isHeld).toBe(false);
      expect(endListener).toHaveBeenCalledTimes(1);
    });

    it('does not raise holdEndEvent for a release that never held it', () => {
      manager.setHoldInput(keyboard, hold, false);
      expect(endListener).not.toHaveBeenCalled();
    });

    it('releases what a source held when its input is removed', () => {
      manager.setHoldInput(gamepad, hold, true);
      manager.removeSourceInput(gamepad);
      expect(hold.isHeld).toBe(false);
    });
  });

  describe('triggers', () => {
    let trigger: TriggerAction;
    let listener: Mock<() => void>;

    beforeEach(() => {
      trigger = new TriggerAction('trigger', group1);
      manager.addTriggerActions(trigger);
      listener = vi.fn();
      trigger.triggerEvent.registerListener(listener);
    });

    it('fires a down-moment binding once per press, for one frame', () => {
      const binding = createTriggerBinding(trigger, buttonMoments.down);

      manager.setTriggerInput(gamepad, binding, true);
      expect(trigger.isTriggered).toBe(true);

      manager.reset();
      manager.setTriggerInput(gamepad, binding, true);
      expect(trigger.isTriggered).toBe(false);

      manager.setTriggerInput(gamepad, binding, false);
      expect(trigger.isTriggered).toBe(false);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('fires an up-moment binding on release', () => {
      const binding = createTriggerBinding(trigger, buttonMoments.up);

      manager.setTriggerInput(keyboard, binding, true);
      expect(trigger.isTriggered).toBe(false);

      manager.setTriggerInput(keyboard, binding, false);
      expect(trigger.isTriggered).toBe(true);
    });

    it('does not fire an up-moment binding for a release without a press', () => {
      manager.setTriggerInput(
        keyboard,
        createTriggerBinding(trigger, buttonMoments.up),
        false,
      );

      expect(listener).not.toHaveBeenCalled();
    });

    it('does not fire when a source whose input is removed was pressing it', () => {
      const binding = createTriggerBinding(trigger, buttonMoments.up);

      manager.setTriggerInput(keyboard, binding, true);
      manager.removeSourceInput(keyboard);
      manager.setTriggerInput(keyboard, binding, false);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('switching the active group', () => {
    let axis1d: Axis1dAction;
    let axis2d: Axis2dAction;
    let hold: HoldAction;
    let trigger: TriggerAction;

    beforeEach(() => {
      axis1d = new Axis1dAction('axis1d', group1);
      axis2d = new Axis2dAction('axis2d', group1);
      hold = new HoldAction('hold', group1);
      trigger = new TriggerAction('trigger', group1);

      manager.addAxis1dActions(axis1d);
      manager.addAxis2dActions(axis2d);
      manager.addHoldActions(hold);
      manager.addTriggerActions(trigger);
    });

    it("reads 0 for the outgoing group's axes and ends its holds", () => {
      const holdEndListener = vi.fn();

      hold.holdEndEvent.registerListener(holdEndListener);

      manager.setAxis1dInput(keyboard, axis1d, 1);
      manager.setAxis2dInput(keyboard, axis2d, -1, 1);
      manager.setHoldInput(keyboard, hold, true);

      manager.setActiveGroup(group2);

      expect(axis1d.value).toBe(0);
      expect(axis2d.value).toEqual({ x: 0, y: 0 });
      expect(hold.isHeld).toBe(false);
      expect(holdEndListener).toHaveBeenCalledTimes(1);
    });

    it("reads the sources' current input for the incoming group's axes", () => {
      manager.setActiveGroup(group2);
      manager.setAxis1dInput(keyboard, axis1d, 1);
      manager.setAxis2dInput(gamepad, axis2d, 0.5, 0);
      expect(axis1d.value).toBe(0);

      manager.setActiveGroup(group1);

      expect(axis1d.value).toBe(1);
      expect(axis2d.value).toEqual({ x: 0.5, y: 0 });
    });

    it('does not start a hold whose button is down at activation until a fresh press', () => {
      manager.setHoldInput(keyboard, hold, true);
      manager.setActiveGroup(group2);
      manager.setActiveGroup(group1);
      expect(hold.isHeld).toBe(false);

      // A source re-reporting "down" every poll isn't a new press.
      manager.setHoldInput(keyboard, hold, true);
      expect(hold.isHeld).toBe(false);

      manager.setHoldInput(keyboard, hold, false);
      manager.setHoldInput(keyboard, hold, true);
      expect(hold.isHeld).toBe(true);
    });

    it('does not start a hold pressed while its group was inactive', () => {
      manager.setActiveGroup(group2);
      manager.setHoldInput(gamepad, hold, true);
      manager.setActiveGroup(group1);

      expect(hold.isHeld).toBe(false);
    });

    it('drops a trigger pressed while its group is inactive', () => {
      manager.setActiveGroup(group2);
      manager.setTriggerInput(keyboard, createTriggerBinding(trigger), true);

      expect(trigger.isTriggered).toBe(false);
    });

    it('does not fire an up-moment trigger for a press made in another group', () => {
      const binding = createTriggerBinding(trigger, buttonMoments.up);

      manager.setActiveGroup(group2);
      manager.setTriggerInput(keyboard, binding, true);
      manager.setActiveGroup(group1);
      manager.setTriggerInput(keyboard, binding, false);

      expect(trigger.isTriggered).toBe(false);
    });

    it('does not fire an up-moment trigger whose press crossed a group switch', () => {
      const binding = createTriggerBinding(trigger, buttonMoments.up);

      manager.setTriggerInput(keyboard, binding, true);
      manager.setActiveGroup(group2);
      manager.setActiveGroup(group1);
      manager.setTriggerInput(keyboard, binding, false);

      expect(trigger.isTriggered).toBe(false);
    });

    it('does nothing when the group is already active', () => {
      const listener = vi.fn();

      manager.setHoldInput(keyboard, hold, true);
      hold.holdEndEvent.registerListener(listener);
      manager.setActiveGroup(group1);

      expect(hold.isHeld).toBe(true);
      expect(listener).not.toHaveBeenCalled();
    });

    it('releases the outgoing group when no group becomes active', () => {
      manager.setAxis1dInput(keyboard, axis1d, 1);
      manager.setActiveGroup(null);
      expect(axis1d.value).toBe(0);

      manager.setActiveGroup(group1);
      expect(axis1d.value).toBe(1);
    });
  });
});
