import { describe, expect, it, vi } from 'vitest';
import { EcsWorld } from './ecs-world.js';
import { EcsSystem } from './ecs-system.js';
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

describe('EcsWorld', () => {
  it('queries entities with multiple components', () => {
    const world = new EcsWorld();

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const pos1: PositionEcsComponent = {
      local: Vec2.create(1, 0),
      world: Vec2.create(1, 0),
    };
    const rot1: RotationEcsComponent = { local: 10, world: 10 };
    const pos2: PositionEcsComponent = {
      local: Vec2.create(2, 0),
      world: Vec2.create(2, 0),
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
      local: Vec2.create(1, 0),
      world: Vec2.create(1, 0),
    };
    const position2: PositionEcsComponent = {
      local: Vec2.create(2, 0),
      world: Vec2.create(2, 0),
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
      local: Vec2.create(-5, 0),
      world: Vec2.create(-5, 0),
    };
    const pos2: PositionEcsComponent = {
      local: Vec2.create(5, 0),
      world: Vec2.create(5, 0),
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
      local: Vec2.create(-5, 0),
      world: Vec2.create(-5, 0),
    };
    const rot1: RotationEcsComponent = { local: 1, world: 1 };
    const pos2: PositionEcsComponent = {
      local: Vec2.create(5, 0),
      world: Vec2.create(5, 0),
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
});
