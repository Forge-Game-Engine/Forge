import { beforeEach, describe, expect, it } from 'vitest';
import { registerInputs } from './register-inputs';
import { createSystemGroup, EcsSystem, EcsWorld } from '../ecs';
import { Time } from '../common';
import { createGameState } from '../states/index.js';
import { inputsId } from './components/index.js';
import { InputManager } from './input-manager';
import { buttonMoments } from './constants/index.js';
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

    inputManager.setTriggerInput(
      { name: 'test' },
      { action: triggerAction, moment: buttonMoments.down, displayText: '' },
      true,
    );
    expect(triggerAction.isTriggered).toBe(true);

    time.update(16);
    world.update();

    expect(triggerAction.isTriggered).toBe(false);
  });

  describe('order', () => {
    let order: string[];

    const loggingSystem = (name: string): EcsSystem => ({
      name,
      query: [],
      update: (): void => {
        order.push(name);
      },
    });

    const logInputUpdate = (inputManager: InputManager): void => {
      inputManager.addUpdatable({
        update: (): void => {
          order.push('input-update');
        },
      });
    };

    beforeEach(() => {
      order = [];
    });

    it('updates input before a start-of-tick group registered before it', () => {
      const startOfTick = createSystemGroup('start-of-tick');
      world.addSystemGroup(startOfTick, { after: [world.firstSystemGroup] });
      world.addSystem(loggingSystem('start-of-tick'), { group: startOfTick });

      logInputUpdate(registerInputs(world, time));

      world.update();

      expect(order).toEqual(['input-update', 'start-of-tick']);
    });

    it("updates input before a game state's enter systems, in both registration orders", () => {
      const stateFirst = createGameState(world, 'menu');
      world.addSystem(loggingSystem('enter'), {
        group: stateFirst.enterGroup,
      });
      logInputUpdate(registerInputs(world, time));

      world.update();

      expect(order).toEqual(['input-update', 'enter']);

      order = [];
      const otherWorld = new EcsWorld();
      logInputUpdate(registerInputs(otherWorld, time));
      const stateSecond = createGameState(otherWorld, 'menu');
      otherWorld.addSystem(loggingSystem('enter'), {
        group: stateSecond.enterGroup,
      });

      otherWorld.update();

      expect(order).toEqual(['input-update', 'enter']);
    });

    it('updates input before a group ordered before the default group, in both registration orders', () => {
      const early = createSystemGroup('early');
      world.addSystemGroup(early, { before: [world.defaultSystemGroup] });
      world.addSystem(loggingSystem('early'), { group: early });
      logInputUpdate(registerInputs(world, time));

      world.update();

      expect(order).toEqual(['input-update', 'early']);

      order = [];
      const otherWorld = new EcsWorld();
      logInputUpdate(registerInputs(otherWorld, time));
      const otherEarly = createSystemGroup('early');
      otherWorld.addSystemGroup(otherEarly, {
        before: [otherWorld.defaultSystemGroup],
      });
      otherWorld.addSystem(loggingSystem('early'), { group: otherEarly });

      otherWorld.update();

      expect(order).toEqual(['input-update', 'early']);
    });

    it('resets input after the default group', () => {
      const triggerAction = new TriggerAction('trigger', 'game');
      const inputManager = registerInputs(world, time, {
        triggerActions: [triggerAction],
      });
      let seenInDefaultGroup: boolean | undefined;

      world.addSystem({
        query: [],
        update: (): void => {
          seenInDefaultGroup = triggerAction.isTriggered;
        },
      });

      inputManager.setTriggerInput(
        { name: 'test' },
        { action: triggerAction, moment: buttonMoments.down, displayText: '' },
        true,
      );
      world.update();

      expect(seenInDefaultGroup).toBe(true);
      expect(triggerAction.isTriggered).toBe(false);
    });
  });

  it('does not throw when called without options', () => {
    expect(() => registerInputs(world, time)).not.toThrow();
  });
});
