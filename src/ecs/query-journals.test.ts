import { beforeEach, describe, expect, it } from 'vitest';
import { createComponentId } from './ecs-component.js';
import { EcsSystem } from './ecs-system.js';
import { EcsWorld } from './ecs-world.js';

interface Value {
  value: number;
}

interface Run {
  entities: number[];
  added: number[];
  removed: number[];
  lastRunTick: number;
  changeTick: number;
}

const valueId = createComponentId<Value>('value');

describe('query journals', () => {
  let world: EcsWorld;
  let runs: Run[];
  let enabled: boolean;
  let system: EcsSystem<[Value]>;

  const lastRun = (): Run => runs[runs.length - 1];

  beforeEach(() => {
    world = new EcsWorld();
    runs = [];
    enabled = true;
    system = {
      query: [valueId],
      update: (innerWorld, { entities, added, removed, lastRunTick }) => {
        runs.push({
          entities: [...entities],
          added: [...added],
          removed: [...removed],
          lastRunTick,
          changeTick: innerWorld.changeTick,
        });
      },
    };
    world.addSystem(system, { runIf: () => enabled });
  });

  it('reports every member as added on the first run', () => {
    const first = world.createEntity();
    const second = world.createEntity();

    world.addComponent(first, valueId, { value: 1 });
    world.addComponent(second, valueId, { value: 2 });
    world.update();

    expect(new Set(lastRun().added)).toEqual(new Set([first, second]));
    expect(lastRun().removed).toEqual([]);
  });

  it('reports nothing on a run where nothing changed', () => {
    world.addComponent(world.createEntity(), valueId, { value: 1 });
    world.update();
    world.update();

    expect(lastRun().added).toEqual([]);
    expect(lastRun().removed).toEqual([]);
  });

  it('reports an entity that stopped matching as removed, even once it is no longer alive', () => {
    const entity = world.createEntity();

    world.addComponent(entity, valueId, { value: 1 });
    world.update();
    world.removeEntity(entity);
    world.update();

    expect(lastRun().removed).toEqual([entity]);
    expect(lastRun().entities).toEqual([]);
  });

  it('reports an entity that started and stopped matching between two runs in neither list', () => {
    world.update();

    const entity = world.createEntity();

    world.addComponent(entity, valueId, { value: 1 });
    world.removeComponent(entity, valueId);
    world.update();

    expect(lastRun().added).toEqual([]);
    expect(lastRun().removed).toEqual([]);
  });

  it('reports an entity that stopped matching and matched again in both lists', () => {
    const entity = world.createEntity();

    world.addComponent(entity, valueId, { value: 1 });
    world.update();
    world.removeComponent(entity, valueId);
    world.addComponent(entity, valueId, { value: 2 });
    world.update();

    expect(lastRun().removed).toEqual([entity]);
    expect(lastRun().added).toEqual([entity]);
    expect(lastRun().entities).toEqual([entity]);
  });

  it('returns the new object of a replaced component', () => {
    const entity = world.createEntity();
    const replacement = { value: 2 };
    const received: Value[] = [];

    world.addSystem<[Value]>({
      query: [valueId],
      update: (_world, { components: [values] }) => received.push(values[0]),
    });
    world.addComponent(entity, valueId, { value: 1 });
    world.update();
    world.addComponent(entity, valueId, replacement);
    world.update();

    expect(received[1]).toBe(replacement);
  });

  it('reports a replaced component in both lists for an entity the system already saw', () => {
    const entity = world.createEntity();

    world.addComponent(entity, valueId, { value: 1 });
    world.update();
    world.addComponent(entity, valueId, { value: 2 });
    world.addComponent(entity, valueId, { value: 3 });
    world.update();

    expect(lastRun().removed).toEqual([entity]);
    expect(lastRun().added).toEqual([entity]);
  });

  it('reports a replaced component only in added for an entity that started matching since the last run', () => {
    world.update();

    const entity = world.createEntity();

    world.addComponent(entity, valueId, { value: 1 });
    world.addComponent(entity, valueId, { value: 2 });
    world.update();

    expect(lastRun().added).toEqual([entity]);
    expect(lastRun().removed).toEqual([]);
  });

  it('does not report adding the object an entity already has', () => {
    const entity = world.createEntity();
    const value = { value: 1 };

    world.addComponent(entity, valueId, value);
    world.update();
    world.addComponent(entity, valueId, value);
    world.update();

    expect(lastRun().added).toEqual([]);
    expect(lastRun().removed).toEqual([]);
  });

  it('gives a system that did not run everything since it last ran, each entity at most once per list', () => {
    const kept = world.createEntity();
    const dropped = world.createEntity();

    world.addComponent(kept, valueId, { value: 1 });
    world.addComponent(dropped, valueId, { value: 1 });
    world.update();

    enabled = false;

    const joined = world.createEntity();

    world.addComponent(joined, valueId, { value: 1 });
    world.update();
    world.removeEntity(dropped);
    world.addComponent(kept, valueId, { value: 2 });
    world.update();
    world.addComponent(kept, valueId, { value: 3 });
    world.update();

    enabled = true;
    world.update();

    expect(runs).toHaveLength(2);
    expect(new Set(lastRun().added)).toEqual(new Set([joined, kept]));
    expect(new Set(lastRun().removed)).toEqual(new Set([dropped, kept]));
    expect(new Set(lastRun().entities)).toEqual(new Set([kept, joined]));
  });

  it('discards the journals of a removed system, so it starts over when added again', () => {
    const entity = world.createEntity();

    world.addComponent(entity, valueId, { value: 1 });
    world.update();
    world.removeSystem(system);
    world.removeEntity(entity);

    const other = world.createEntity();

    world.addComponent(other, valueId, { value: 1 });
    world.addSystem(system);
    world.update();

    expect(lastRun().added).toEqual([other]);
    expect(lastRun().removed).toEqual([]);
    expect(lastRun().lastRunTick).toBe(0);
  });

  it('reuses the same result arrays from run to run', () => {
    const results: unknown[] = [];

    world.removeSystem(system);
    world.addSystem({
      query: [valueId],
      update: (_world, result) => {
        results.push(result, result.entities, result.added, result.removed);
      },
    });
    world.update();
    world.addComponent(world.createEntity(), valueId, { value: 1 });
    world.update();

    results.slice(0, 4).forEach((item, i) => {
      expect(item).toBe(results[i + 4]);
    });
  });
});

describe('change ticks', () => {
  it('advances by one before each system runs', () => {
    const world = new EcsWorld();
    const ticks: number[] = [];
    const recorder: EcsSystem<[]> = {
      query: [],
      update: (innerWorld) => ticks.push(innerWorld.changeTick),
    };

    world.addSystem(recorder);
    world.addSystem({ ...recorder });
    world.update();
    world.update();

    expect(world.changeTick).toBe(4);
    expect(ticks).toEqual([1, 2, 3, 4]);
  });

  it("passes each system its previous run's tick, 0 on its first run", () => {
    const world = new EcsWorld();
    const lastRunTicks: number[] = [];

    world.addSystem({ query: [], update: () => {} });
    world.addSystem({
      query: [],
      update: (_world, { lastRunTick }) => lastRunTicks.push(lastRunTick),
    });
    world.update();
    world.update();

    expect(lastRunTicks).toEqual([0, 2]);
  });

  it('passes the same previous-run tick to every declaration of a system', () => {
    const world = new EcsWorld();
    const ticks: number[][] = [];

    world.addSystem<[], { other: [] }>({
      query: [],
      queries: { other: { query: [] } },
      update: (_world, primary, { other }) =>
        ticks.push([primary.lastRunTick, other.lastRunTick]),
    });
    world.update();
    world.update();

    expect(ticks).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });

  describe('owner-stamped values', () => {
    interface Stamped {
      value: number;
      changedTick: number;
    }

    const stampedId = createComponentId<Stamped>('stamped');

    // Writes the value on the ticks `shouldChange` allows, stamping it.
    const createOwner = (
      shouldChange: () => boolean,
    ): EcsSystem<[Stamped]> => ({
      name: 'owner',
      query: [stampedId],
      update: (world, { components: [stampedValues] }) => {
        if (!shouldChange()) {
          return;
        }

        for (const stamped of stampedValues) {
          stamped.value++;
          stamped.changedTick = world.changeTick;
        }
      },
    });

    const createReader = (seen: boolean[]): EcsSystem<[Stamped]> => ({
      name: 'reader',
      query: [stampedId],
      update: (_world, { components: [stampedValues], lastRunTick }) => {
        seen.push(stampedValues[0].changedTick > lastRunTick);
      },
    });

    let world: EcsWorld;

    beforeEach(() => {
      world = new EcsWorld();
      world.addComponent(world.createEntity(), stampedId, {
        value: 0,
        changedTick: 0,
      });
    });

    it('lets a reader that runs after the owner see each change once', () => {
      const seen: boolean[] = [];
      let frame = 0;

      world.addSystem(createOwner(() => frame === 1));
      world.addSystem(createReader(seen));

      for (frame = 0; frame < 3; frame++) {
        world.update();
      }

      expect(seen).toEqual([false, true, false]);
    });

    it('lets a reader that runs before the owner see the change on its next run', () => {
      const seen: boolean[] = [];
      let frame = 0;

      world.addSystem(createReader(seen));
      world.addSystem(createOwner(() => frame === 1));

      for (frame = 0; frame < 4; frame++) {
        world.update();
      }

      expect(seen).toEqual([false, false, true, false]);
    });

    it('lets a reader that skipped runs see a change made while it was skipped', () => {
      const seen: boolean[] = [];
      let frame = 0;

      world.addSystem(createOwner(() => frame === 1));
      world.addSystem(createReader(seen), { runIf: () => frame !== 1 });

      for (frame = 0; frame < 4; frame++) {
        world.update();
      }

      expect(seen).toEqual([false, true, false]);
    });
  });
});
