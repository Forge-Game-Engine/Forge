import { describe, expect, it, vi } from 'vitest';
import { EcsWorld } from './ecs-world.js';
import { EcsSystem } from './ecs-system.js';
import { createSystemGroup } from './ecs-system-group.js';
import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  SpeedEcsComponent,
  speedId,
} from '../common/index.js';
import { createComponentId, createTagId } from './ecs-component.js';
import { entityGeneration, entityIndex, formatEntity } from './entity.js';
import { Vec2 } from '../math/index.js';

const trackingSystem = (name: string, calls: string[]): EcsSystem<[]> => ({
  name,
  query: [],
  update: () => calls.push(name),
});

describe('EcsWorld', () => {
  it('queries entities with multiple components', () => {
    const world = new EcsWorld();

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const pos1: PositionEcsComponent = {
      local: { x: 1, y: 0 },
      world: { x: 1, y: 0 },
    };
    const rot1: RotationEcsComponent = { local: 10, world: 10 };
    const pos2: PositionEcsComponent = {
      local: { x: 2, y: 0 },
      world: { x: 2, y: 0 },
    };

    world.addComponent(entity1, positionId, pos1);
    world.addComponent(entity1, rotationId, rot1);
    world.addComponent(entity2, positionId, pos2);

    const update = vi.fn();
    const system: EcsSystem<[PositionEcsComponent, RotationEcsComponent]> = {
      query: [positionId, rotationId],
      update,
    };

    world.addSystem(system);
    world.update();

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      world,
      expect.objectContaining({
        entities: [entity1],
        components: [[pos1], [rot1]],
      }),
      {},
    );
  });

  it('queries single component returns all entities', () => {
    const world = new EcsWorld();
    const tagId = createComponentId<{ value: string }>('tag');

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const tag1 = { value: 'a' };
    const tag2 = { value: 'b' };

    world.addComponent(entity1, tagId, tag1);
    world.addComponent(entity2, tagId, tag2);

    const results: Array<{ entity: number; component: { value: string } }> = [];
    const system: EcsSystem<[{ value: string }]> = {
      query: [tagId],
      update: (_world, { entities, components: [values] }) => {
        for (let i = 0; i < entities.length; i++) {
          results.push({ entity: entities[i], component: values[i] });
        }
      },
    };

    world.addSystem(system);
    world.update();

    expect(results).toHaveLength(2);
    expect(results[0].entity).toBe(entity1);
    expect(results[0].component).toBe(tag1);
    expect(results[1].entity).toBe(entity2);
    expect(results[1].component).toBe(tag2);
  });

  it('skips entities missing some components', () => {
    const world = new EcsWorld();

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const position1: PositionEcsComponent = {
      local: { x: 1, y: 0 },
      world: { x: 1, y: 0 },
    };
    const position2: PositionEcsComponent = {
      local: { x: 2, y: 0 },
      world: { x: 2, y: 0 },
    };
    const speed2: SpeedEcsComponent = { speed: 3 };

    world.addComponent(entity1, positionId, position1);
    world.addComponent(entity2, positionId, position2);
    world.addComponent(entity2, speedId, speed2);

    const update = vi.fn();
    const system: EcsSystem<[PositionEcsComponent, SpeedEcsComponent]> = {
      query: [positionId, speedId],
      update,
    };

    world.addSystem(system);
    world.update();

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      world,
      expect.objectContaining({
        entities: [entity2],
        components: [[position2], [speed2]],
      }),
      {},
    );
  });

  it('does not throw when no components found for the given names', () => {
    const world = new EcsWorld();
    type TestComponent = { test: number };
    const nonexistentId = createComponentId<TestComponent>('nonexistent');

    const system: EcsSystem<[TestComponent]> = {
      query: [nonexistentId],
      update: () => {},
    };

    world.addSystem(system);

    expect(() => world.update()).not.toThrow();
  });

  it('calls update once per tick with every matched entity and component together', () => {
    const world = new EcsWorld();
    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    world.addComponent(entity1, positionId, {
      local: Vec2.zero,
      world: Vec2.zero,
    });
    world.addComponent(entity2, positionId, {
      local: Vec2.zero,
      world: Vec2.zero,
    });

    const update = vi.fn();
    const system: EcsSystem<[PositionEcsComponent]> = {
      query: [positionId],
      update,
    };

    world.addSystem(system);
    world.update();

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      world,
      expect.objectContaining({ entities: [entity1, entity2] }),
      {},
    );
  });

  it('calls update once with empty arrays when no entities match the query', () => {
    const world = new EcsWorld();
    const nonexistentId = createComponentId<{ test: number }>(
      'nonexistent-update',
    );

    const update = vi.fn();
    const system: EcsSystem<[{ test: number }]> = {
      query: [nonexistentId],
      update,
    };

    world.addSystem(system);
    world.update();

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      world,
      expect.objectContaining({ entities: [], components: [[]] }),
      {},
    );
  });

  it('runs systems with query results', () => {
    const world = new EcsWorld();

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const pos1: PositionEcsComponent = {
      local: { x: -5, y: 0 },
      world: { x: -5, y: 0 },
    };
    const pos2: PositionEcsComponent = {
      local: { x: 5, y: 0 },
      world: { x: 5, y: 0 },
    };

    world.addComponent(entity1, positionId, pos1);
    world.addComponent(entity2, positionId, pos2);

    const update = vi.fn(
      (
        _world: EcsWorld,
        { components: [positions] }: { components: [PositionEcsComponent[]] },
      ) => {
        for (const position of positions) {
          position.local.x += 10;
        }
      },
    );

    const system: EcsSystem<[PositionEcsComponent]> = {
      query: [positionId],
      update,
    };

    world.addSystem(system);

    world.update();

    expect(update).toHaveBeenCalledTimes(1);
    expect(pos1.local.x).toBe(5);
    expect(pos2.local.x).toBe(15);
  });

  it('invokes multiple systems independently', () => {
    const world = new EcsWorld();

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const pos1: PositionEcsComponent = {
      local: { x: -5, y: 0 },
      world: { x: -5, y: 0 },
    };
    const rot1: RotationEcsComponent = { local: 1, world: 1 };
    const pos2: PositionEcsComponent = {
      local: { x: 5, y: 0 },
      world: { x: 5, y: 0 },
    };
    const rot2: RotationEcsComponent = { local: 2, world: 2 };

    world.addComponent(entity1, positionId, pos1);
    world.addComponent(entity1, rotationId, rot1);
    world.addComponent(entity2, positionId, pos2);
    world.addComponent(entity2, rotationId, rot2);

    const positionSystem: EcsSystem<[PositionEcsComponent]> = {
      query: [positionId],
      update: vi.fn(
        (
          _world: EcsWorld,
          { components: [positions] }: { components: [PositionEcsComponent[]] },
        ) => {
          for (const position of positions) {
            position.local.x += 10;
          }
        },
      ),
    };

    const rotationSystem: EcsSystem<[RotationEcsComponent]> = {
      query: [rotationId],
      update: vi.fn(
        (
          _world: EcsWorld,
          { components: [rotations] }: { components: [RotationEcsComponent[]] },
        ) => {
          for (const rotation of rotations) {
            rotation.local *= 2;
          }
        },
      ),
    };

    world.addSystem(positionSystem);
    world.addSystem(rotationSystem);

    world.update();

    expect(positionSystem.update).toHaveBeenCalledTimes(1);
    expect(pos1.local.x).toBe(5);
    expect(pos2.local.x).toBe(15);

    expect(rotationSystem.update).toHaveBeenCalledTimes(1);
    expect(rot1.local).toBe(2);
    expect(rot2.local).toBe(4);
  });

  describe('system registration lifecycle', () => {
    it('calls onRegister with the world when a system is added', () => {
      const world = new EcsWorld();
      const onRegister = vi.fn();
      const system: EcsSystem<[]> = {
        query: [],
        update: () => {},
        onRegister,
      };

      world.addSystem(system);

      expect(onRegister).toHaveBeenCalledTimes(1);
      expect(onRegister).toHaveBeenCalledWith(world);
    });

    it('does not throw when adding a system without onRegister', () => {
      const world = new EcsWorld();
      const system: EcsSystem<[]> = {
        query: [],
        update: () => {},
      };

      expect(() => world.addSystem(system)).not.toThrow();
    });

    it('calls cleanup with the world when a system is removed', () => {
      const world = new EcsWorld();
      const cleanup = vi.fn();
      const system: EcsSystem<[]> = {
        query: [],
        update: () => {},
        cleanup,
      };

      world.addSystem(system);
      world.removeSystem(system);

      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(cleanup).toHaveBeenCalledWith(world);
    });

    it('does not throw when removing a system without cleanup', () => {
      const world = new EcsWorld();
      const system: EcsSystem<[]> = {
        query: [],
        update: () => {},
      };

      world.addSystem(system);

      expect(() => world.removeSystem(system)).not.toThrow();
    });

    it('calls cleanup with the world when it stops', () => {
      const world = new EcsWorld();
      const cleanup = vi.fn();
      const system: EcsSystem<[]> = {
        query: [],
        update: () => {},
        cleanup,
      };

      world.addSystem(system);
      world.stop();

      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(cleanup).toHaveBeenCalledWith(world);
    });

    it('does not throw when stopping a world whose systems define no cleanup', () => {
      const world = new EcsWorld();
      const system: EcsSystem<[]> = {
        query: [],
        update: () => {},
      };

      world.addSystem(system);

      expect(() => world.stop()).not.toThrow();
    });

    it('still calls cleanup when removing a system that was never registered with addSystem', () => {
      const world = new EcsWorld();
      const cleanup = vi.fn();
      const system: EcsSystem<[]> = {
        query: [],
        update: () => {},
        cleanup,
      };

      world.removeSystem(system);

      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(cleanup).toHaveBeenCalledWith(world);
    });
  });

  describe('system ordering', () => {
    it('runs systems with no ordering constraints in registration order', () => {
      const world = new EcsWorld();
      const calls: string[] = [];

      world.addSystem(trackingSystem('a', calls));
      world.addSystem(trackingSystem('b', calls));
      world.addSystem(trackingSystem('c', calls));

      world.update();

      expect(calls).toEqual(['a', 'b', 'c']);
    });

    it('runs a system before another when declared with "before"', () => {
      const world = new EcsWorld();
      const calls: string[] = [];

      const last = trackingSystem('last', calls);
      world.addSystem(last);
      world.addSystem(trackingSystem('first', calls), { before: [last] });

      world.update();

      expect(calls).toEqual(['first', 'last']);
    });

    it('runs a system after another when declared with "after"', () => {
      const world = new EcsWorld();
      const calls: string[] = [];

      const first = trackingSystem('first', calls);
      world.addSystem(first);
      world.addSystem(trackingSystem('last', calls), { after: [first] });

      world.update();

      expect(calls).toEqual(['first', 'last']);
    });

    it('resolves transitive ordering constraints across several systems', () => {
      const world = new EcsWorld();
      const calls: string[] = [];

      const a = trackingSystem('a', calls);
      world.addSystem(a);

      const b = trackingSystem('b', calls);
      world.addSystem(b, { after: [a] });

      world.addSystem(trackingSystem('c', calls), { after: [b] });

      world.update();

      expect(calls).toEqual(['a', 'b', 'c']);
    });

    it('throws when "before"/"after" references a system that has not been registered yet', () => {
      const world = new EcsWorld();
      const notRegistered: EcsSystem<[]> = {
        name: 'notRegistered',
        query: [],
        update: () => {},
      };

      expect(() =>
        world.addSystem(
          { name: 'system', query: [], update: () => {} },
          { after: [notRegistered] },
        ),
      ).toThrow(/has not been registered/);
    });

    it('throws when "before"/"after" would create a cycle', () => {
      const world = new EcsWorld();
      const a: EcsSystem<[]> = { name: 'a', query: [], update: () => {} };
      const b: EcsSystem<[]> = { name: 'b', query: [], update: () => {} };

      const c: EcsSystem<[]> = { name: 'c', query: [], update: () => {} };

      world.addSystem(a);
      world.addSystem(b, { after: [a] });

      expect(() => world.addSystem(c, { before: [a], after: [b] })).toThrow(
        /cycle/,
      );
    });

    it('orders systems with no "name" without throwing', () => {
      const world = new EcsWorld();
      const calls: string[] = [];
      const first: EcsSystem<[]> = {
        query: [],
        update: () => calls.push('first'),
      };

      world.addSystem(first);
      world.addSystem(
        { query: [], update: () => calls.push('last') },
        { after: [first] },
      );

      world.update();

      expect(calls).toEqual(['first', 'last']);
    });

    it('labels systems with no "name" as "unnamed system" in a cycle error', () => {
      const world = new EcsWorld();
      const a: EcsSystem<[]> = { query: [], update: () => {} };
      const b: EcsSystem<[]> = { query: [], update: () => {} };
      const c: EcsSystem<[]> = { query: [], update: () => {} };

      world.addSystem(a);
      world.addSystem(b, { after: [a] });

      expect(() => world.addSystem(c, { before: [a], after: [b] })).toThrow(
        /cycle: unnamed system/,
      );
    });

    it('drops ordering constraints for a system once it is removed', () => {
      const world = new EcsWorld();
      const calls: string[] = [];

      const a = trackingSystem('a', calls);
      world.addSystem(a);

      const b = trackingSystem('b', calls);
      world.addSystem(b, { after: [a] });

      world.removeSystem(b);
      world.addSystem(b);

      world.update();

      expect(calls).toEqual(['a', 'b']);
    });
  });

  describe('system groups', () => {
    it('runs every system in the default group when no group is specified', () => {
      const world = new EcsWorld();
      const calls: string[] = [];

      world.addSystem(trackingSystem('a', calls));
      world.addSystem(trackingSystem('b', calls));

      world.update();

      expect(calls).toEqual(['a', 'b']);
    });

    it('runs a group before another when declared with "before"', () => {
      const world = new EcsWorld();
      const calls: string[] = [];

      const lateGroup = createSystemGroup('late');
      const earlyGroup = createSystemGroup('early');

      world.addSystemGroup(lateGroup);
      world.addSystemGroup(earlyGroup, { before: [lateGroup] });

      world.addSystem(trackingSystem('late', calls), { group: lateGroup });
      world.addSystem(trackingSystem('early', calls), { group: earlyGroup });

      world.update();

      expect(calls).toEqual(['early', 'late']);
    });

    it('orders a group relative to the world default group', () => {
      const world = new EcsWorld();
      const calls: string[] = [];

      const earlyGroup = createSystemGroup('early');
      world.addSystemGroup(earlyGroup, {
        before: [world.defaultSystemGroup],
      });

      world.addSystem(trackingSystem('default', calls));
      world.addSystem(trackingSystem('early', calls), { group: earlyGroup });

      world.update();

      expect(calls).toEqual(['early', 'default']);
    });

    it('runs a group after another when declared with "after"', () => {
      const world = new EcsWorld();
      const calls: string[] = [];

      const earlyGroup = createSystemGroup('early');
      const lateGroup = createSystemGroup('late');

      world.addSystemGroup(earlyGroup);
      world.addSystemGroup(lateGroup, { after: [earlyGroup] });

      world.addSystem(trackingSystem('late', calls), { group: lateGroup });
      world.addSystem(trackingSystem('early', calls), { group: earlyGroup });

      world.update();

      expect(calls).toEqual(['early', 'late']);
    });

    it('throws when addSystem is given a group that was not registered with addSystemGroup', () => {
      const world = new EcsWorld();
      const unregisteredGroup = createSystemGroup('unregistered');

      expect(() =>
        world.addSystem(
          { name: 'system', query: [], update: () => {} },
          { group: unregisteredGroup },
        ),
      ).toThrow(/has not been registered/);
    });

    it('labels a system with no "name" as "unnamed system" in the unregistered-group error', () => {
      const world = new EcsWorld();
      const unregisteredGroup = createSystemGroup('unregistered');

      expect(() =>
        world.addSystem(
          { query: [], update: () => {} },
          { group: unregisteredGroup },
        ),
      ).toThrow(/unnamed system/);
    });

    it('throws when ordering two systems from different groups against each other', () => {
      const world = new EcsWorld();
      const groupA = createSystemGroup('a');
      const groupB = createSystemGroup('b');

      world.addSystemGroup(groupA);
      world.addSystemGroup(groupB);

      const systemInA: EcsSystem<[]> = {
        name: 'systemInA',
        query: [],
        update: () => {},
      };
      world.addSystem(systemInA, { group: groupA });

      expect(() =>
        world.addSystem(
          { name: 'systemInB', query: [], update: () => {} },
          { group: groupB, after: [systemInA] },
        ),
      ).toThrow(/different system groups/);
    });

    it('throws when addSystemGroup would create a cycle', () => {
      const world = new EcsWorld();
      const groupA = createSystemGroup('a');
      const groupB = createSystemGroup('b');

      world.addSystemGroup(groupA);
      world.addSystemGroup(groupB, { after: [groupA] });

      expect(() => world.addSystemGroup(groupA, { after: [groupB] })).toThrow(
        /cycle/,
      );
    });
  });

  describe('run conditions', () => {
    it('skips a system whose condition is false, without querying it', () => {
      const world = new EcsWorld();
      const update = vi.fn();
      const querySpy = vi.spyOn(world, 'query');

      world.addSystem(
        { name: 'gated', query: [positionId], update },
        { runIf: () => false },
      );

      world.update();

      expect(update).not.toHaveBeenCalled();
      expect(querySpy).not.toHaveBeenCalled();
    });

    it('runs a system whose condition is true', () => {
      const world = new EcsWorld();
      const calls: string[] = [];

      world.addSystem(trackingSystem('gated', calls), { runIf: () => true });

      world.update();

      expect(calls).toEqual(['gated']);
    });

    it('passes the world to the condition', () => {
      const world = new EcsWorld();
      const runIf = vi.fn(() => true);

      world.addSystem(trackingSystem('gated', []), { runIf });

      world.update();

      expect(runIf).toHaveBeenCalledWith(world);
    });

    it('checks the condition every tick', () => {
      const world = new EcsWorld();
      const calls: string[] = [];
      let enabled = false;

      world.addSystem(trackingSystem('gated', calls), {
        runIf: () => enabled,
      });

      world.update();
      enabled = true;
      world.update();

      expect(calls).toEqual(['gated']);
    });

    it('checks the condition just before the system runs, after earlier systems of the tick', () => {
      const world = new EcsWorld();
      const calls: string[] = [];
      let enabled = false;

      world.addSystem({
        name: 'enabler',
        query: [],
        update: () => {
          enabled = true;
        },
      });
      world.addSystem(trackingSystem('gated', calls), {
        runIf: () => enabled,
      });

      world.update();

      expect(calls).toEqual(['gated']);
    });

    it('skips every system of a group whose condition is false, without checking their own', () => {
      const world = new EcsWorld();
      const calls: string[] = [];
      const systemRunIf = vi.fn(() => true);
      const group = createSystemGroup('gated');

      world.addSystemGroup(group, { runIf: () => false });
      world.addSystem(trackingSystem('a', calls), {
        group,
        runIf: systemRunIf,
      });
      world.addSystem(trackingSystem('b', calls), { group });

      world.update();

      expect(calls).toEqual([]);
      expect(systemRunIf).not.toHaveBeenCalled();
    });

    it('runs a system only when both its group condition and its own are true', () => {
      const world = new EcsWorld();
      const calls: string[] = [];
      const group = createSystemGroup('gated');

      world.addSystemGroup(group, { runIf: () => true });
      world.addSystem(trackingSystem('on', calls), {
        group,
        runIf: () => true,
      });
      world.addSystem(trackingSystem('off', calls), {
        group,
        runIf: () => false,
      });

      world.update();

      expect(calls).toEqual(['on']);
    });

    it('still calls cleanup for a gated system when it is removed', () => {
      const world = new EcsWorld();
      const cleanup = vi.fn();
      const system: EcsSystem<[]> = { query: [], update: () => {}, cleanup };

      world.addSystem(system, { runIf: () => false });
      world.update();
      world.removeSystem(system);

      expect(cleanup).toHaveBeenCalledWith(world);
    });

    it('still calls cleanup for a gated system when the world stops', () => {
      const world = new EcsWorld();
      const cleanup = vi.fn();
      const group = createSystemGroup('gated');

      world.addSystemGroup(group, { runIf: () => false });
      world.addSystem({ query: [], update: () => {}, cleanup }, { group });
      world.stop();

      expect(cleanup).toHaveBeenCalledWith(world);
    });

    it('forgets the condition of a removed system', () => {
      const world = new EcsWorld();
      const calls: string[] = [];
      const system = trackingSystem('system', calls);

      world.addSystem(system, { runIf: () => false });
      world.removeSystem(system);
      world.addSystem(system);
      world.update();

      expect(calls).toEqual(['system']);
    });
  });

  describe('first system group', () => {
    it('runs before a group added earlier and ordered before the default group', () => {
      const world = new EcsWorld();
      const calls: string[] = [];
      const early = createSystemGroup('early');

      world.addSystemGroup(early, { before: [world.defaultSystemGroup] });
      world.addSystem(trackingSystem('early', calls), { group: early });
      world.addSystem(trackingSystem('default', calls));
      world.addSystem(trackingSystem('first', calls), {
        group: world.firstSystemGroup,
      });

      world.update();

      expect(calls).toEqual(['first', 'early', 'default']);
    });

    it('throws when a group is ordered before it', () => {
      const world = new EcsWorld();

      expect(() =>
        world.addSystemGroup(createSystemGroup('too-early'), {
          before: [world.firstSystemGroup],
        }),
      ).toThrow(/before the first group/);
    });

    it('throws when it is added as a group', () => {
      const world = new EcsWorld();

      expect(() => world.addSystemGroup(world.firstSystemGroup)).toThrow(
        /built-in first group/,
      );
    });

    it('runs groups ordered after it before every other group, including ones added earlier or later', () => {
      const world = new EcsWorld();
      const calls: string[] = [];
      const input = createSystemGroup('input');
      const start = createSystemGroup('start');
      const startAfter = createSystemGroup('start-after');
      const late = createSystemGroup('late');

      world.addSystemGroup(input, { before: [world.defaultSystemGroup] });
      world.addSystemGroup(start, { after: [world.firstSystemGroup] });
      world.addSystemGroup(startAfter, { after: [start] });
      world.addSystemGroup(late);

      world.addSystem(trackingSystem('late', calls), { group: late });
      world.addSystem(trackingSystem('default', calls));
      world.addSystem(trackingSystem('input', calls), { group: input });
      world.addSystem(trackingSystem('start-after', calls), {
        group: startAfter,
      });
      world.addSystem(trackingSystem('start', calls), { group: start });
      world.addSystem(trackingSystem('first', calls), {
        group: world.firstSystemGroup,
      });

      world.update();

      expect(calls).toEqual([
        'first',
        'start',
        'start-after',
        'input',
        'default',
        'late',
      ]);
    });

    it('throws when a start-of-tick group is ordered after a group that is not', () => {
      const world = new EcsWorld();

      expect(() =>
        world.addSystemGroup(createSystemGroup('start'), {
          after: [world.firstSystemGroup, world.defaultSystemGroup],
        }),
      ).toThrow(/runs at the start of the tick/);
    });

    it('throws when a group is ordered before a start-of-tick group', () => {
      const world = new EcsWorld();
      const start = createSystemGroup('start');

      world.addSystemGroup(start, { after: [world.firstSystemGroup] });

      expect(() =>
        world.addSystemGroup(createSystemGroup('other'), { before: [start] }),
      ).toThrow(/runs at the start of the tick/);
    });

    it('keeps a registered group in its place when it is added again', () => {
      const world = new EcsWorld();
      const calls: string[] = [];
      const start = createSystemGroup('start');
      const other = createSystemGroup('other');

      world.addSystemGroup(other);
      world.addSystemGroup(start, { after: [world.firstSystemGroup] });
      world.addSystemGroup(other, { after: [start] });

      world.addSystem(trackingSystem('other', calls), { group: other });
      world.addSystem(trackingSystem('default', calls));
      world.addSystem(trackingSystem('start', calls), { group: start });

      world.update();

      expect(calls).toEqual(['start', 'default', 'other']);
    });
  });

  describe('onEntityRemoved', () => {
    it('raises onEntityRemoved with the entity id when removeEntity is called', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      world.addComponent(entity, positionId, {
        local: Vec2.zero,
        world: Vec2.zero,
      });

      const listener = vi.fn();
      world.onEntityRemoved.registerListener(listener);

      world.removeEntity(entity);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(entity);
    });

    it('does not raise onEntityRemoved when removeComponent removes the last remaining component', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      world.addComponent(entity, positionId, {
        local: Vec2.zero,
        world: Vec2.zero,
      });

      const listener = vi.fn();
      world.onEntityRemoved.registerListener(listener);

      world.removeComponent(entity, positionId);

      expect(listener).not.toHaveBeenCalled();
      expect(world.isAlive(entity)).toBe(true);
    });

    it('raises onEntityRemoved once when the same entity is removed twice', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      const listener = vi.fn();
      world.onEntityRemoved.registerListener(listener);

      world.removeEntity(entity);
      world.removeEntity(entity);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('raises onEntityRemoved after the entity is no longer alive and its components are gone', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      world.addComponent(entity, positionId, {
        local: Vec2.zero,
        world: Vec2.zero,
      });

      let wasAlive: boolean | null = null;
      let position: PositionEcsComponent | null = null;

      world.onEntityRemoved.registerListener((removed) => {
        wasAlive = world.isAlive(removed);
        position = world.getComponent(removed, positionId);
      });

      world.removeEntity(entity);

      expect(wasAlive).toBe(false);
      expect(position).toBeNull();
    });

    it('does nothing when a listener removes the entity being removed again', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();
      const removals: boolean[] = [];

      world.onEntityRemoved.registerListener((removed) => {
        removals.push(world.removeEntity(removed));
      });

      expect(world.removeEntity(entity)).toBe(true);
      expect(removals).toEqual([false]);

      const first = world.createEntity();
      const second = world.createEntity();

      expect(first).not.toBe(second);
      expect(entityIndex(first)).not.toBe(entityIndex(second));
    });

    it('still frees the slot when a listener throws', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      world.onEntityRemoved.registerListener(() => {
        throw new Error('listener failed');
      });

      expect(() => world.removeEntity(entity)).toThrow('listener failed');
      expect(world.isAlive(entity)).toBe(false);
      expect(entityIndex(world.createEntity())).toBe(entityIndex(entity));
    });

    it('does not raise onEntityRemoved when removeComponent leaves other components on the entity', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      world.addComponent(entity, positionId, {
        local: Vec2.zero,
        world: Vec2.zero,
      });
      world.addComponent(entity, rotationId, { local: 0, world: 0 });

      const listener = vi.fn();
      world.onEntityRemoved.registerListener(listener);

      world.removeComponent(entity, positionId);

      expect(listener).not.toHaveBeenCalled();
    });

    it('stops notifying a listener once it has been deregistered', () => {
      const world = new EcsWorld();
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      const listener = vi.fn();
      world.onEntityRemoved.registerListener(listener);
      world.onEntityRemoved.deregisterListener(listener);

      world.removeEntity(entity1);
      world.removeEntity(entity2);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('entity lifetime', () => {
    const tagId = createTagId('tag');

    const addPosition = (
      world: EcsWorld,
      entity: number,
      x: number,
    ): PositionEcsComponent =>
      world.addComponent(entity, positionId, {
        local: { x, y: 0 },
        world: { x, y: 0 },
      });

    it('numbers the first entity in each slot 0, 1, 2, ...', () => {
      const world = new EcsWorld();

      expect([
        world.createEntity(),
        world.createEntity(),
        world.createEntity(),
      ]).toEqual([0, 1, 2]);
    });

    it('keeps an entity alive from createEntity until removeEntity, with or without components', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      expect(world.isAlive(entity)).toBe(true);

      addPosition(world, entity, 1);
      world.removeComponent(entity, positionId);

      expect(world.isAlive(entity)).toBe(true);
      expect(() => addPosition(world, entity, 2)).not.toThrow();

      world.removeEntity(entity);

      expect(world.isAlive(entity)).toBe(false);
    });

    it('is not alive for a handle the world never created', () => {
      const world = new EcsWorld();
      world.createEntity();

      expect(world.isAlive(1)).toBe(false);
      expect(world.isAlive(-1)).toBe(false);
      expect(world.isAlive(1.5)).toBe(false);
    });

    it('gives an entity that reuses a removed slot a new handle', () => {
      const world = new EcsWorld();
      const removed = world.createEntity();

      world.removeEntity(removed);

      const reused = world.createEntity();

      expect(entityIndex(reused)).toBe(entityIndex(removed));
      expect(entityGeneration(reused)).toBe(entityGeneration(removed) + 1);
      expect(reused).not.toBe(removed);
      expect(world.isAlive(removed)).toBe(false);
      expect(world.isAlive(reused)).toBe(true);
    });

    it("never resolves a removed entity's handle to the entity that reused its slot", () => {
      const world = new EcsWorld();
      const removed = world.createEntity();
      addPosition(world, removed, 1);
      world.addTag(removed, tagId);
      world.removeEntity(removed);

      const reused = world.createEntity();
      const position = addPosition(world, reused, 2);
      world.addTag(reused, tagId);

      expect(world.getComponent(removed, positionId)).toBeNull();
      expect(world.getComponentAccessor(positionId)(removed)).toBeNull();
      expect(() => world.getComponentRequired(removed, positionId)).toThrow(
        formatEntity(removed),
      );
      expect(world.getComponent(reused, positionId)).toBe(position);
      expect(world.query([positionId], [tagId]).entities).toEqual([reused]);
    });

    it("leaves the entity that reused a slot alone when the old handle's component is removed", () => {
      const world = new EcsWorld();
      const removed = world.createEntity();
      world.removeEntity(removed);

      const reused = world.createEntity();
      const position = addPosition(world, reused, 2);

      world.removeComponent(removed, positionId);

      expect(world.getComponent(reused, positionId)).toBe(position);
    });

    it('returns true from removeEntity once, then false for the same handle', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      expect(world.removeEntity(entity)).toBe(true);
      expect(world.removeEntity(entity)).toBe(false);
    });

    it('ignores removing a handle whose slot has been reused', () => {
      const world = new EcsWorld();
      const removed = world.createEntity();
      world.removeEntity(removed);

      const reused = world.createEntity();
      addPosition(world, reused, 2);

      expect(world.removeEntity(removed)).toBe(false);
      expect(world.isAlive(reused)).toBe(true);
      expect(world.getComponent(reused, positionId)).not.toBeNull();
    });

    it('gives two entities created after a double removal different handles and separate components', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      world.removeEntity(entity);
      world.removeEntity(entity);

      const first = world.createEntity();
      const second = world.createEntity();
      const firstPosition = addPosition(world, first, 1);
      const secondPosition = addPosition(world, second, 2);

      expect(first).not.toBe(second);
      expect(world.getComponent(first, positionId)).toBe(firstPosition);
      expect(world.getComponent(second, positionId)).toBe(secondPosition);
    });

    it('reuses the least recently freed slot first', () => {
      const world = new EcsWorld();
      const a = world.createEntity();
      const b = world.createEntity();
      const c = world.createEntity();

      world.removeEntity(b);
      world.removeEntity(a);
      world.removeEntity(c);

      expect(
        [world.createEntity(), world.createEntity(), world.createEntity()].map(
          entityIndex,
        ),
      ).toEqual([b, a, c].map(entityIndex));
      expect(entityIndex(world.createEntity())).toBe(3);
    });

    it('throws when adding a component or tag to a removed entity', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();
      world.removeEntity(entity);

      expect(() => addPosition(world, entity, 1)).toThrow(
        `Unable to add component "${positionId.toString()}" to entity ${formatEntity(entity)}, it isn't alive`,
      );
      expect(() => world.addTag(entity, tagId)).toThrow(
        `Unable to add tag "${tagId.toString()}" to entity ${formatEntity(entity)}, it isn't alive`,
      );
    });

    it('throws when adding a component to a handle the world never created', () => {
      const world = new EcsWorld();

      expect(() => addPosition(world, 0, 1)).toThrow(/isn't alive/);
    });

    it('does not attach a component added to a removed handle to the entity that reuses its slot', () => {
      const world = new EcsWorld();
      const removed = world.createEntity();
      world.removeEntity(removed);

      expect(() => addPosition(world, removed, 1)).toThrow();

      const reused = world.createEntity();

      expect(world.getComponent(reused, positionId)).toBeNull();
    });

    it("wraps a slot's generation after 1,024 reuses", () => {
      const world = new EcsWorld();
      const first = world.createEntity();
      let entity = first;

      for (let i = 0; i < 1023; i++) {
        world.removeEntity(entity);
        entity = world.createEntity();
      }

      expect(entityGeneration(entity)).toBe(1023);
      expect(world.isAlive(first)).toBe(false);

      world.removeEntity(entity);
      entity = world.createEntity();

      expect(entity).toBe(first);
      expect(entity).toBeLessThan(2 ** 30);
    });
  });

  describe('getCreationSequence', () => {
    it('increases with every entity created, even one reusing a removed slot', () => {
      const world = new EcsWorld();
      const first = world.createEntity();
      const removed = world.createEntity();
      const second = world.createEntity();

      world.removeEntity(removed);
      const reused = world.createEntity();

      expect(world.getCreationSequence(first)).toBeLessThan(
        world.getCreationSequence(second),
      );
      expect(world.getCreationSequence(second)).toBeLessThan(
        world.getCreationSequence(reused),
      );
    });

    it('throws for an entity that is not alive', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      world.removeEntity(entity);

      expect(() => world.getCreationSequence(entity)).toThrow();
    });
  });

  describe('getComponentRequired', () => {
    it('returns the component when the entity has it', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();
      const position: PositionEcsComponent = {
        local: Vec2.zero,
        world: Vec2.zero,
      };

      world.addComponent(entity, positionId, position);

      expect(world.getComponentRequired(entity, positionId)).toBe(position);
    });

    it('throws a descriptive error when the entity does not have the component', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      expect(() => world.getComponentRequired(entity, positionId)).toThrow(
        `Required component "${positionId.toString()}" not found on entity ${formatEntity(entity)}.`,
      );
    });
  });

  describe('getComponentAccessor', () => {
    it('returns the component for an entity that has it', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();
      const rotation: RotationEcsComponent = { local: 1, world: 1 };

      world.addComponent(entity, rotationId, rotation);

      const getRotation = world.getComponentAccessor(rotationId);

      expect(getRotation(entity)).toBe(rotation);
    });

    it('returns null for an entity that does not have the component, even when other entities do', () => {
      const world = new EcsWorld();
      const withRotation = world.createEntity();
      const withoutRotation = world.createEntity();

      world.addComponent(withRotation, rotationId, { local: 1, world: 1 });

      const getRotation = world.getComponentAccessor(rotationId);

      expect(getRotation(withoutRotation)).toBeNull();
    });

    it('returns null for every entity when no entity has ever had the component', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();
      const neverUsedId = createComponentId<RotationEcsComponent>('unused');

      const getComponent = world.getComponentAccessor(neverUsedId);

      expect(getComponent(entity)).toBeNull();
    });

    it('reflects components added after the accessor was created, for a component key already in use', () => {
      const world = new EcsWorld();
      const alreadyHasRotation = world.createEntity();
      const addedLater = world.createEntity();

      // A component set for rotationId must already exist for the accessor
      // to pick up entities added to it later - see the method's own doc
      // comment on this caveat.
      world.addComponent(alreadyHasRotation, rotationId, {
        local: 0,
        world: 0,
      });

      const getRotation = world.getComponentAccessor(rotationId);
      const laterRotation: RotationEcsComponent = { local: 2, world: 2 };

      world.addComponent(addedLater, rotationId, laterRotation);

      expect(getRotation(addedLater)).toBe(laterRotation);
    });

    it('matches getComponent for a mix of entities with and without the component', () => {
      const world = new EcsWorld();
      const entities = Array.from({ length: 20 }, () => world.createEntity());

      entities.forEach((entity, index) => {
        if (index % 3 === 0) {
          world.addComponent(entity, rotationId, {
            local: index,
            world: index,
          });
        }
      });

      const getRotation = world.getComponentAccessor(rotationId);

      for (const entity of entities) {
        expect(getRotation(entity)).toEqual(
          world.getComponent(entity, rotationId),
        );
      }
    });
  });
});
