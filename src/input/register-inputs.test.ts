import { beforeEach, describe, expect, it } from 'vitest';
import { registerInputs } from './register-inputs';
import { EcsWorld } from '../ecs';
import { Time } from '../common';
import { inputsId } from './components/index.js';
import { InputManager } from './input-manager';
import {
  Axis1dAction,
  Axis2dAction,
  HoldAction,
  TriggerAction,
} from './actions/index.js';

describe('registerInputs', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
  });

  it('returns an InputManager', () => {
    const inputManager = registerInputs(world, time);

    expect(inputManager).toBeInstanceOf(InputManager);
  });

  it('attaches the InputManager to a new entity in the world', () => {
    const inputManager = registerInputs(world, time);

    const entities = world.query([inputsId]).entities;

    expect(entities).toHaveLength(1);
    expect(world.getComponent(entities[0], inputsId)?.inputManager).toBe(
      inputManager,
    );
  });

  it('registers actions passed in options with the InputManager', () => {
    const triggerAction = new TriggerAction('trigger', 'default');
    const axis1dAction = new Axis1dAction('axis1d', 'default');
    const axis2dAction = new Axis2dAction('axis2d', 'default');
    const holdAction = new HoldAction('hold', 'default');

    const inputManager = registerInputs(world, time, {
      triggerActions: [triggerAction],
      axis1dActions: [axis1dAction],
      axis2dActions: [axis2dAction],
      holdActions: [holdAction],
    });

    expect(inputManager.getTriggerAction('trigger')).toBe(triggerAction);
    expect(inputManager.getAxis1dAction('axis1d')).toBe(axis1dAction);
    expect(inputManager.getAxis2dAction('axis2d')).toBe(axis2dAction);
    expect(inputManager.getHoldAction('hold')).toBe(holdAction);
  });

  it('registers update and reset systems that drive the InputManager each tick', () => {
    const triggerAction = new TriggerAction('trigger', 'game');

    const inputManager = registerInputs(world, time, {
      triggerActions: [triggerAction],
    });

    inputManager.setActiveGroup('game');
    triggerAction.trigger();
    expect(triggerAction.isTriggered).toBe(true);

    time.update(16);
    world.update();

    expect(triggerAction.isTriggered).toBe(false);
  });

  it('does not throw when called without options', () => {
    expect(() => registerInputs(world, time)).not.toThrow();
  });
});
