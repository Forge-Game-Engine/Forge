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
import { createComponentId } from './ecs-component.js';
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

      world.addSystem(a);
      world.addSystem(b, { after: [a] });

      expect(() => world.addSystem(a, { after: [b] })).toThrow(/cycle/);
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

      world.addSystem(a);
      world.addSystem(b, { after: [a] });

      expect(() => world.addSystem(a, { after: [b] })).toThrow(
        /unnamed system/,
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

    it('raises onEntityRemoved when removeComponent removes the last remaining component', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      world.addComponent(entity, positionId, {
        local: Vec2.zero,
        world: Vec2.zero,
      });

      const listener = vi.fn();
      world.onEntityRemoved.registerListener(listener);

      world.removeComponent(entity, positionId);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(entity);
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
        `Required component "${positionId.toString()}" not found on entity "${entity}".`,
      );
    });
  });
});
