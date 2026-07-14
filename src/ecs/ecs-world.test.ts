import { describe, expect, it, vi } from 'vitest';
import { EcsWorld } from './ecs-world';
import { EcsSystem } from './ecs-system';
import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  SpeedEcsComponent,
  speedId,
} from '../common/index.js';
import { createComponentId } from './ecs-component';
import { Vector2 } from '../math/index.js';

describe('EcsWorld', () => {
  it('queries entities with multiple components', () => {
    const world = new EcsWorld();

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const pos1: PositionEcsComponent = {
      local: new Vector2(1, 0),
      world: new Vector2(1, 0),
    };
    const rot1: RotationEcsComponent = { local: 10, world: 10 };
    const pos2: PositionEcsComponent = {
      local: new Vector2(2, 0),
      world: new Vector2(2, 0),
    };

    world.addComponent(entity1, positionId, pos1);
    world.addComponent(entity1, rotationId, rot1);
    world.addComponent(entity2, positionId, pos2);

    const run = vi.fn();
    const system: EcsSystem<[PositionEcsComponent, RotationEcsComponent]> = {
      query: [positionId, rotationId],
      run,
    };

    world.addSystem(system);
    world.update();

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: entity1,
        components: [pos1, rot1],
      }),
      world,
      null,
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
      run: (result) => {
        results.push({
          entity: result.entity,
          component: result.components[0] as { value: string },
        });
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
      local: new Vector2(1, 0),
      world: new Vector2(1, 0),
    };
    const position2: PositionEcsComponent = {
      local: new Vector2(2, 0),
      world: new Vector2(2, 0),
    };
    const speed2: SpeedEcsComponent = { speed: 3 };

    world.addComponent(entity1, positionId, position1);
    world.addComponent(entity2, positionId, position2);
    world.addComponent(entity2, speedId, speed2);

    const run = vi.fn();
    const system: EcsSystem<[PositionEcsComponent, SpeedEcsComponent]> = {
      query: [positionId, speedId],
      run,
    };

    world.addSystem(system);
    world.update();

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: entity2,
        components: [position2, speed2],
      }),
      world,
      null,
    );
  });

  it('does not throw when no components found for the given names', () => {
    const world = new EcsWorld();
    type TestComponent = { test: number };
    const nonexistentId = createComponentId<TestComponent>('nonexistent');

    const system: EcsSystem<[TestComponent]> = {
      query: [nonexistentId],
      run: () => {},
    };

    world.addSystem(system);

    expect(() => world.update()).not.toThrow();
  });

  it('runs systems with query results', () => {
    const world = new EcsWorld();

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const pos1: PositionEcsComponent = {
      local: new Vector2(-5, 0),
      world: new Vector2(-5, 0),
    };
    const pos2: PositionEcsComponent = {
      local: new Vector2(5, 0),
      world: new Vector2(5, 0),
    };

    world.addComponent(entity1, positionId, pos1);
    world.addComponent(entity2, positionId, pos2);

    const run = vi.fn(
      (result: { entity: number; components: [PositionEcsComponent] }) => {
        const [position] = result.components;

        position.local.x += 10;
      },
    );

    const system: EcsSystem<[PositionEcsComponent]> = {
      query: [positionId],
      run,
    };

    world.addSystem(system);

    world.update();

    expect(run).toHaveBeenCalledTimes(2);
    expect(pos1.local.x).toBe(5);
    expect(pos2.local.x).toBe(15);
  });

  it('invokes multiple systems independently', () => {
    const world = new EcsWorld();

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const pos1: PositionEcsComponent = {
      local: new Vector2(-5, 0),
      world: new Vector2(-5, 0),
    };
    const rot1: RotationEcsComponent = { local: 1, world: 1 };
    const pos2: PositionEcsComponent = {
      local: new Vector2(5, 0),
      world: new Vector2(5, 0),
    };
    const rot2: RotationEcsComponent = { local: 2, world: 2 };

    world.addComponent(entity1, positionId, pos1);
    world.addComponent(entity1, rotationId, rot1);
    world.addComponent(entity2, positionId, pos2);
    world.addComponent(entity2, rotationId, rot2);

    const positionSystem: EcsSystem<[PositionEcsComponent]> = {
      query: [positionId],
      run: vi.fn(
        (result: { entity: number; components: [PositionEcsComponent] }) => {
          const [position] = result.components;

          position.local.x += 10;
        },
      ),
    };

    const rotationSystem: EcsSystem<[RotationEcsComponent]> = {
      query: [rotationId],
      run: vi.fn(
        (result: { entity: number; components: [RotationEcsComponent] }) => {
          const [rotation] = result.components;

          rotation.local *= 2;
        },
      ),
    };

    world.addSystem(positionSystem);
    world.addSystem(rotationSystem);

    world.update();

    expect(positionSystem.run).toHaveBeenCalledTimes(2);
    expect(pos1.local.x).toBe(5);
    expect(pos2.local.x).toBe(15);

    expect(rotationSystem.run).toHaveBeenCalledTimes(2);
    expect(rot1.local).toBe(2);
    expect(rot2.local).toBe(4);
  });

  describe('afterRun', () => {
    it('passes an array of every run call result to afterRun', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      world.addComponent(entity, positionId, {
        local: Vector2.zero,
        world: Vector2.zero,
      });

      const afterRun = vi.fn();
      const system: EcsSystem<[PositionEcsComponent], null, string> = {
        query: [positionId],
        run: () => 'result-value',
        afterRun,
      };

      world.addSystem(system);
      world.update();

      expect(afterRun).toHaveBeenCalledTimes(1);
      expect(afterRun).toHaveBeenCalledWith(['result-value']);
    });

    it('does not throw when afterRun is not defined', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      world.addComponent(entity, positionId, {
        local: Vector2.zero,
        world: Vector2.zero,
      });

      const system: EcsSystem<[PositionEcsComponent]> = {
        query: [positionId],
        run: () => {},
      };

      world.addSystem(system);

      expect(() => world.update()).not.toThrow();
    });

    // afterRun is a once-per-tick hook: every matched entity's run() call
    // happens first, and afterRun is called exactly once afterwards with all
    // of their results together, not interleaved with run per entity. This
    // is what lets the render system collect one RenderPassResult per
    // camera in run, then draw every camera's batch from a single afterRun
    // call once all cameras are known.
    it('calls run for every matched entity before calling afterRun once, with all their results', () => {
      const world = new EcsWorld();
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      world.addComponent(entity1, positionId, {
        local: Vector2.zero,
        world: Vector2.zero,
      });
      world.addComponent(entity2, positionId, {
        local: Vector2.zero,
        world: Vector2.zero,
      });

      const callOrder: string[] = [];
      const system: EcsSystem<[PositionEcsComponent], null, number> = {
        query: [positionId],
        run: (result) => {
          callOrder.push(`run:${result.entity}`);

          return result.entity;
        },
        afterRun: (entities) => {
          callOrder.push(`afterRun:${entities.join(',')}`);
        },
      };

      world.addSystem(system);
      world.update();

      expect(callOrder).toEqual([
        `run:${entity1}`,
        `run:${entity2}`,
        `afterRun:${entity1},${entity2}`,
      ]);
    });

    it('calls afterRun once with an empty array when no entities match the query', () => {
      const world = new EcsWorld();
      const nonexistentId = createComponentId<{ test: number }>(
        'nonexistent-afterrun',
      );

      const afterRun = vi.fn();
      const system: EcsSystem<[{ test: number }]> = {
        query: [nonexistentId],
        run: () => {},
        afterRun,
      };

      world.addSystem(system);
      world.update();

      expect(afterRun).toHaveBeenCalledTimes(1);
      expect(afterRun).toHaveBeenCalledWith([]);
    });
  });

  describe('system registration lifecycle', () => {
    it('calls onRegister with the world when a system is added', () => {
      const world = new EcsWorld();
      const onRegister = vi.fn();
      const system: EcsSystem<[]> = {
        query: [],
        run: () => {},
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
        run: () => {},
      };

      expect(() => world.addSystem(system)).not.toThrow();
    });

    it('calls cleanupSystem with the world when a system is removed', () => {
      const world = new EcsWorld();
      const cleanupSystem = vi.fn();
      const system: EcsSystem<[]> = {
        query: [],
        run: () => {},
        cleanupSystem,
      };

      world.addSystem(system);
      world.removeSystem(system);

      expect(cleanupSystem).toHaveBeenCalledTimes(1);
      expect(cleanupSystem).toHaveBeenCalledWith(world);
    });

    it('does not throw when removing a system without cleanupSystem', () => {
      const world = new EcsWorld();
      const system: EcsSystem<[]> = {
        query: [],
        run: () => {},
      };

      world.addSystem(system);

      expect(() => world.removeSystem(system)).not.toThrow();
    });

    it('calls cleanupEntities then cleanupSystem for every system when the world stops', () => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      world.addComponent(entity, positionId, {
        local: Vector2.zero,
        world: Vector2.zero,
      });

      const callOrder: string[] = [];
      const system: EcsSystem<[PositionEcsComponent]> = {
        query: [positionId],
        run: () => {},
        cleanupEntities: () => {
          callOrder.push('cleanupEntities');
        },
        cleanupSystem: () => {
          callOrder.push('cleanupSystem');
        },
      };

      world.addSystem(system);
      world.stop();

      expect(callOrder).toEqual(['cleanupEntities', 'cleanupSystem']);
    });

    it('does not throw when stopping a world whose systems define neither cleanupEntities nor cleanupSystem', () => {
      const world = new EcsWorld();
      const system: EcsSystem<[]> = {
        query: [],
        run: () => {},
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
        local: Vector2.zero,
        world: Vector2.zero,
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
        local: Vector2.zero,
        world: Vector2.zero,
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
        local: Vector2.zero,
        world: Vector2.zero,
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
