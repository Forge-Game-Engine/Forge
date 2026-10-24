import { beforeEach, describe, expect, it } from 'vitest';
import { createSystemGroup, EcsSystem, EcsWorld } from '../../ecs/index.js';
import { registerInputs } from '../../input/index.js';
import { createGameState } from '../../states/index.js';
import { registerFixedUpdate } from './register-fixed-update.js';
import { Time } from './Time.js';

const loggingSystem = (name: string, order: string[]): EcsSystem => ({
  name,
  query: [],
  update: (): void => {
    order.push(name);
  },
});

describe('registerFixedUpdate', () => {
  let world: EcsWorld;
  let time: Time;
  let order: string[];

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    order = [];
    time.update(0);
  });

  it('runs its systems once per fixed step, before the default group', () => {
    const fixedUpdate = registerFixedUpdate(world, time);

    world.addSystem(loggingSystem('default', order));
    world.addSystem(loggingSystem('fixed', order), { group: fixedUpdate });

    time.update(40);
    world.update();

    expect(order).toEqual(['fixed', 'fixed', 'default']);

    order.length = 0;
    time.update(47);
    world.update();

    expect(order).toEqual(['default']);
  });

  it('returns a group named fixed-update', () => {
    expect(registerFixedUpdate(world, time).name).toBe('fixed-update');
  });

  it('gives its systems the fixed clock and the default group the frame clock', () => {
    const fixedUpdate = registerFixedUpdate(world, time);
    const fixedReads: {
      isInFixedStep: boolean;
      deltaTimeInSeconds: number;
      timeInSeconds: number;
    }[] = [];
    let defaultRead:
      | {
          isInFixedStep: boolean;
          deltaTimeInSeconds: number;
          fixedOverstepFraction: number;
        }
      | undefined;

    world.addSystem(
      {
        query: [],
        update: (): void => {
          fixedReads.push({
            isInFixedStep: time.isInFixedStep,
            deltaTimeInSeconds: time.deltaTimeInSeconds,
            timeInSeconds: time.timeInSeconds,
          });
        },
      },
      { group: fixedUpdate },
    );
    world.addSystem({
      query: [],
      update: (): void => {
        defaultRead = {
          isInFixedStep: time.isInFixedStep,
          deltaTimeInSeconds: time.deltaTimeInSeconds,
          fixedOverstepFraction: time.fixedOverstepFraction,
        };
      },
    });

    time.update(40);
    world.update();

    expect(fixedReads).toHaveLength(2);

    for (const read of fixedReads) {
      expect(read.isInFixedStep).toBe(true);
      expect(read.deltaTimeInSeconds).toBe(time.fixedDeltaTimeInSeconds);
    }

    expect(
      fixedReads[1].timeInSeconds - fixedReads[0].timeInSeconds,
    ).toBeCloseTo(time.fixedDeltaTimeInSeconds);
    expect(defaultRead?.isInFixedStep).toBe(false);
    expect(defaultRead?.deltaTimeInSeconds).toBeCloseTo(0.04);
    expect(defaultRead?.fixedOverstepFraction).toBeGreaterThanOrEqual(0);
    expect(defaultRead?.fixedOverstepFraction).toBeLessThan(1);
  });

  it('ends the fixed step by the end of the tick, so the time can update again', () => {
    registerFixedUpdate(world, time);

    time.update(40);
    world.update();

    expect(time.isInFixedStep).toBe(false);
    expect(() => time.update(56)).not.toThrow();
  });

  it('runs no fixed steps while the time scale is 0', () => {
    const fixedUpdate = registerFixedUpdate(world, time);

    world.addSystem(loggingSystem('fixed', order), { group: fixedUpdate });
    time.timeScale = 0;

    time.update(40);
    world.update();

    expect(order).toEqual([]);
  });

  it('follows the fixed delta time', () => {
    const fixedUpdate = registerFixedUpdate(world, time);

    world.addSystem(loggingSystem('fixed', order), { group: fixedUpdate });
    time.fixedDeltaTimeInMilliseconds = 1000 / 30;

    time.update(40);
    world.update();

    expect(order).toEqual(['fixed']);
  });

  it("runs after a game state's enter group and the input update, in both registration orders", () => {
    const stateFirst = createGameState(world, 'playing');
    const fixedUpdate = registerFixedUpdate(world, time);
    registerInputs(world, time).addUpdatable({
      update: (): void => {
        order.push('input');
      },
    });
    world.addSystem(loggingSystem('enter', order), {
      group: stateFirst.enterGroup,
    });
    world.addSystem(loggingSystem('fixed', order), { group: fixedUpdate });

    time.update(20);
    world.update();

    expect(order).toEqual(['input', 'enter', 'fixed']);

    const otherWorld = new EcsWorld();
    const otherTime = new Time();
    otherTime.update(0);
    const otherFixedUpdate = registerFixedUpdate(otherWorld, otherTime);
    registerInputs(otherWorld, otherTime).addUpdatable({
      update: (): void => {
        order.push('input');
      },
    });
    const stateSecond = createGameState(otherWorld, 'playing');
    otherWorld.addSystem(loggingSystem('enter', order), {
      group: stateSecond.enterGroup,
    });
    otherWorld.addSystem(loggingSystem('fixed', order), {
      group: otherFixedUpdate,
    });

    order.length = 0;
    otherTime.update(20);
    otherWorld.update();

    expect(order).toEqual(['input', 'enter', 'fixed']);
  });

  it('runs a group ordered only before the default group on either side of the fixed steps, by registration order', () => {
    const earlyFirst = createSystemGroup('early');
    world.addSystemGroup(earlyFirst, { before: [world.defaultSystemGroup] });
    const fixedUpdate = registerFixedUpdate(world, time);
    world.addSystem(loggingSystem('early', order), { group: earlyFirst });
    world.addSystem(loggingSystem('fixed', order), { group: fixedUpdate });

    time.update(20);
    world.update();

    expect(order).toEqual(['early', 'fixed']);

    const otherWorld = new EcsWorld();
    const otherTime = new Time();
    otherTime.update(0);
    const otherFixedUpdate = registerFixedUpdate(otherWorld, otherTime);
    const earlySecond = createSystemGroup('early');
    otherWorld.addSystemGroup(earlySecond, {
      before: [otherWorld.defaultSystemGroup],
    });
    otherWorld.addSystem(loggingSystem('early', order), { group: earlySecond });
    otherWorld.addSystem(loggingSystem('fixed', order), {
      group: otherFixedUpdate,
    });

    order.length = 0;
    otherTime.update(20);
    otherWorld.update();

    expect(order).toEqual(['fixed', 'early']);
  });

  it('runs a group ordered after the fixed-update group after the fixed steps', () => {
    const fixedUpdate = registerFixedUpdate(world, time);
    const afterFixed = createSystemGroup('after-fixed');
    world.addSystemGroup(afterFixed, {
      after: [fixedUpdate],
      before: [world.defaultSystemGroup],
    });
    world.addSystem(loggingSystem('after-fixed', order), { group: afterFixed });
    world.addSystem(loggingSystem('fixed', order), { group: fixedUpdate });

    time.update(40);
    world.update();

    expect(order).toEqual(['fixed', 'fixed', 'after-fixed']);
  });

  it('throws when called again with the same Time, for the same world or another', () => {
    registerFixedUpdate(world, time);

    expect(() => registerFixedUpdate(world, time)).toThrow(
      'Unable to register a fixed-update group with this Time',
    );
    expect(() => registerFixedUpdate(new EcsWorld(), time)).toThrow(
      'Unable to register a fixed-update group with this Time',
    );
  });

  it('registers nothing in a world when it throws', () => {
    registerFixedUpdate(world, time);
    const otherWorld = new EcsWorld();
    const calls: string[] = [];
    otherWorld.addSystem(loggingSystem('default', calls));

    expect(() => registerFixedUpdate(otherWorld, time)).toThrow();

    otherWorld.update();

    expect(calls).toEqual(['default']);
    expect(time.isInFixedStep).toBe(false);
  });

  it('reports a fixed overstep fraction that still includes the frame before the fixed steps, and below 1 after them', () => {
    registerFixedUpdate(world, time);
    const startOfTick = createSystemGroup('start-of-tick');
    world.addSystemGroup(startOfTick, { after: [world.firstSystemGroup] });
    let beforeSteps = 0;
    let afterSteps = 0;

    world.addSystem(
      {
        query: [],
        update: (): void => {
          beforeSteps = time.fixedOverstepFraction;
        },
      },
      { group: startOfTick },
    );
    world.addSystem({
      query: [],
      update: (): void => {
        afterSteps = time.fixedOverstepFraction;
      },
    });

    time.update(40);
    world.update();

    expect(beforeSteps).toBeGreaterThan(1);
    expect(afterSteps).toBeLessThan(1);
  });
});
